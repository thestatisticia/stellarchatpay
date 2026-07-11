#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Count,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentLogged {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
    pub tx_hash: String,
}

#[contract]
pub struct PaymentLog;

#[contractimpl]
impl PaymentLog {
    /// Record a completed XLM payment and emit an on-chain event for the activity feed.
    pub fn log_payment(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        tx_hash: String,
    ) -> u32 {
        from.require_auth();

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Count)
            .unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::Count, &count);

        PaymentLogged {
            from: from.clone(),
            to: to.clone(),
            amount,
            tx_hash: tx_hash.clone(),
        }
        .publish(&env);

        count
    }

    pub fn payment_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Count)
            .unwrap_or(0)
    }
}

mod test;
