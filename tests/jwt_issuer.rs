use domain::auth::outbound::token_issuer::TokenIssuer;
use infrastructure::security::jwt_issuer::JwtIssuer;

#[test]
fn issue_then_verify_returns_claims() {
    let issuer = JwtIssuer::new("test-secret".into(), 1);
    let token = issuer.issue(42, "ana@b.com", "admin").unwrap();
    let claims = issuer.verify(&token).unwrap();
    assert_eq!(claims.user_id, 42);
    assert_eq!(claims.email, "ana@b.com");
    assert_eq!(claims.role, "admin");
}

#[test]
fn tampered_token_rejected() {
    let issuer = JwtIssuer::new("test-secret".into(), 1);
    let token = issuer.issue(42, "ana@b.com", "admin").unwrap();
    let tampered = format!("{}x", token);
    assert!(issuer.verify(&tampered).is_err());
}

#[test]
fn wrong_secret_rejected() {
    let signer = JwtIssuer::new("a".into(), 1);
    let verifier = JwtIssuer::new("b".into(), 1);
    let token = signer.issue(42, "ana@b.com", "admin").unwrap();
    assert!(verifier.verify(&token).is_err());
}
