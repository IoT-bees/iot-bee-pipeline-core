use std::sync::Arc;

use domain::auth::entities::user::NewUser;
use domain::auth::outbound::user_repository::UserRepository;
use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::users_repository::SqliteUserRepository;

async fn fresh_db() -> Arc<InternalDataBase> {
    let db = Arc::new(InternalDataBase::new("sqlite::memory:").await.unwrap());
    sqlx::migrate!("./migrations").run(db.pool()).await.unwrap();
    db
}

#[tokio::test]
async fn create_then_find_by_email_and_id() {
    let db = fresh_db().await;
    let repo = SqliteUserRepository::new(db);
    let created = repo
        .create(NewUser {
            organization_id: 1,
            email: "a@b.com".into(),
            name: "Ana".into(),
            password_hash: "h".into(),
            role: "admin".into(),
            status: "active".into(),
        })
        .await
        .unwrap();
    assert!(created.id > 0);
    assert_eq!(
        repo.find_by_email("a@b.com").await.unwrap().unwrap().email,
        "a@b.com"
    );
    assert_eq!(
        repo.find_by_id(created.id).await.unwrap().unwrap().id,
        created.id
    );
    assert_eq!(repo.count().await.unwrap(), 1);
}

#[tokio::test]
async fn find_unknown_returns_none() {
    let db = fresh_db().await;
    let repo = SqliteUserRepository::new(db);
    assert!(repo.find_by_email("nope@b.com").await.unwrap().is_none());
    assert!(repo.find_by_id(9999).await.unwrap().is_none());
}
