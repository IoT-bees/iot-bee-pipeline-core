use domain::auth::outbound::password_hasher::PasswordHasher;
use infrastructure::security::argon2_hasher::Argon2Hasher;

#[test]
fn round_trip_succeeds() {
    let h = Argon2Hasher::new();
    let hash = h.hash("correcthorsebatterystaple").unwrap();
    assert!(h.verify("correcthorsebatterystaple", &hash).unwrap());
}

#[test]
fn wrong_password_fails() {
    let h = Argon2Hasher::new();
    let hash = h.hash("correcthorsebatterystaple").unwrap();
    assert!(!h.verify("wrong", &hash).unwrap());
}
