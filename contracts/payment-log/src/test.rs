#![cfg(test)]
extern crate std;

use super::{PaymentLog, PaymentLogClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn logs_payment_and_increments_count() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentLog, ());
    let client = PaymentLogClient::new(&env, &contract_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);
    let tx_hash = String::from_str(&env, "abc123hash");

    assert_eq!(client.payment_count(), 0);
    assert_eq!(client.log_payment(&from, &to, &1_0000000, &tx_hash), 1);
    assert_eq!(client.payment_count(), 1);
}

#[test]
fn multiple_payments_increment_count() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentLog, ());
    let client = PaymentLogClient::new(&env, &contract_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    assert_eq!(
        client.log_payment(&from, &to, &1_0000000, &String::from_str(&env, "tx1")),
        1
    );
    assert_eq!(
        client.log_payment(&from, &to, &2_0000000, &String::from_str(&env, "tx2")),
        2
    );
    assert_eq!(client.payment_count(), 2);
}
