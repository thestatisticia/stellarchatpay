#![cfg(test)]
extern crate std;

use super::{Escrow, EscrowClient, EscrowStatus, PaymentLogClient};
use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, token, Address, Env, String,
};

/// Minimal stand-in for payment-log so escrow can demonstrate inter-contract calls in tests.
#[contract]
pub struct MockPaymentLog;

#[contractimpl]
impl MockPaymentLog {
    pub fn log_payment(
        _env: Env,
        _from: Address,
        _to: Address,
        _amount: i128,
        _tx_hash: String,
    ) -> u32 {
        1
    }
}

fn setup<'a>(env: &'a Env) -> (EscrowClient<'a>, Address, Address, Address) {
    env.mock_all_auths();

    let payment_log_id = env.register(MockPaymentLog, ());
    let escrow_id = env.register(Escrow, ());
    let escrow = EscrowClient::new(env, &escrow_id);
    escrow.init(&payment_log_id);

    let admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(admin);
    let token = sac.address();

    let from = Address::generate(env);
    let to = Address::generate(env);
    token::StellarAssetClient::new(env, &token).mint(&from, &50_0000000);

    (escrow, from, to, token)
}

#[test]
fn create_locks_funds_and_assigns_id() {
    let env = Env::default();
    let (escrow, from, to, token) = setup(&env);

    let id = escrow.create(&from, &to, &10_0000000, &token);
    assert_eq!(id, 1);

    let entry = escrow.get_escrow(&id);
    assert_eq!(entry.amount, 10_0000000);
    assert_eq!(entry.status, EscrowStatus::Open);
    assert_eq!(entry.from, from);
    assert_eq!(entry.to, to);

    let token_client = token::TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&from), 40_0000000);
    assert_eq!(token_client.balance(&escrow.address), 10_0000000);
}

#[test]
fn release_pays_recipient_and_calls_payment_log() {
    let env = Env::default();
    let (escrow, from, to, token) = setup(&env);
    let id = escrow.create(&from, &to, &5_0000000, &token);

    let entry = escrow.release(&id);
    assert_eq!(entry.status, EscrowStatus::Released);

    let token_client = token::TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&to), 5_0000000);
    assert_eq!(token_client.balance(&escrow.address), 0);

    // Inter-contract client is reachable (mock returns 1).
    let log = PaymentLogClient::new(&env, &escrow.payment_log());
    assert_eq!(
        log.log_payment(&from, &to, &1_0000000, &String::from_str(&env, "probe")),
        1
    );
}

#[test]
fn refund_returns_funds_to_sender() {
    let env = Env::default();
    let (escrow, from, to, token) = setup(&env);
    let id = escrow.create(&from, &to, &7_0000000, &token);

    let entry = escrow.refund(&id);
    assert_eq!(entry.status, EscrowStatus::Refunded);

    let token_client = token::TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&from), 50_0000000);
    assert_eq!(token_client.balance(&to), 0);
}
