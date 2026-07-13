#![no_std]
use soroban_sdk::{
    contract, contractclient, contractevent, contractimpl, contracttype, token, Address, Env,
    String,
};

/// Client for the payment-log contract (inter-contract communication).
#[contractclient(name = "PaymentLogClient")]
pub trait PaymentLog {
    fn log_payment(env: Env, from: Address, to: Address, amount: i128, tx_hash: String) -> u32;
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Open,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowEntry {
    pub id: u32,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub token: Address,
    pub status: EscrowStatus,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    PaymentLog,
    NextId,
    Escrow(u32),
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowCreated {
    #[topic]
    pub id: u32,
    #[topic]
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowReleased {
    #[topic]
    pub id: u32,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowRefunded {
    #[topic]
    pub id: u32,
    #[topic]
    pub from: Address,
    pub amount: i128,
}

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    /// One-time setup: bind the payment-log contract used for inter-contract logging.
    pub fn init(env: Env, payment_log: Address) {
        if env.storage().instance().has(&DataKey::PaymentLog) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&DataKey::PaymentLog, &payment_log);
        env.storage().instance().set(&DataKey::NextId, &1u32);
    }

    /// Lock `amount` of `token` from `from` into escrow for `to`.
    pub fn create(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        token: Address,
    ) -> u32 {
        from.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        if from == to {
            panic!("cannot escrow to self");
        }
        Self::require_payment_log(&env);

        let contract = env.current_contract_address();
        token::Client::new(&env, &token).transfer(&from, &contract, &amount);

        let id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        let entry = EscrowEntry {
            id,
            from: from.clone(),
            to: to.clone(),
            amount,
            token: token.clone(),
            status: EscrowStatus::Open,
        };
        env.storage().persistent().set(&DataKey::Escrow(id), &entry);

        EscrowCreated {
            id,
            from: from.clone(),
            to: to.clone(),
            amount,
        }
        .publish(&env);

        id
    }

    /// Release locked funds to the recipient and log the payment via payment-log.
    pub fn release(env: Env, id: u32) -> EscrowEntry {
        let mut entry = Self::get_open(&env, id);
        entry.from.require_auth();

        let contract = env.current_contract_address();
        token::Client::new(&env, &entry.token).transfer(&contract, &entry.to, &entry.amount);

        entry.status = EscrowStatus::Released;
        env.storage().persistent().set(&DataKey::Escrow(id), &entry);

        // Inter-contract: notify payment-log so activity feed stays consistent.
        let payment_log: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentLog)
            .unwrap();
        let memo = String::from_str(&env, "escrow-release");
        let client = PaymentLogClient::new(&env, &payment_log);
        client.log_payment(&entry.from, &entry.to, &entry.amount, &memo);

        EscrowReleased {
            id,
            to: entry.to.clone(),
            amount: entry.amount,
        }
        .publish(&env);

        entry
    }

    /// Refund locked funds to the sender.
    pub fn refund(env: Env, id: u32) -> EscrowEntry {
        let mut entry = Self::get_open(&env, id);
        entry.from.require_auth();

        let contract = env.current_contract_address();
        token::Client::new(&env, &entry.token).transfer(&contract, &entry.from, &entry.amount);

        entry.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&DataKey::Escrow(id), &entry);

        EscrowRefunded {
            id,
            from: entry.from.clone(),
            amount: entry.amount,
        }
        .publish(&env);

        entry
    }

    pub fn get_escrow(env: Env, id: u32) -> EscrowEntry {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(id))
            .unwrap_or_else(|| panic!("escrow not found"))
    }

    pub fn next_id(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::NextId).unwrap_or(1)
    }

    pub fn payment_log(env: Env) -> Address {
        Self::require_payment_log(&env)
    }

    fn require_payment_log(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::PaymentLog)
            .unwrap_or_else(|| panic!("escrow not initialized"))
    }

    fn get_open(env: &Env, id: u32) -> EscrowEntry {
        let entry: EscrowEntry = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(id))
            .unwrap_or_else(|| panic!("escrow not found"));
        if entry.status != EscrowStatus::Open {
            panic!("escrow not open");
        }
        entry
    }
}

mod test;
