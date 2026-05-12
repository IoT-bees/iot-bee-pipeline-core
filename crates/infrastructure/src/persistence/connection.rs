use sqlx::Error as SqlxError;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool as SqlxPool, SqlitePoolOptions};
use std::str::FromStr;
use std::time::Duration;

#[derive(Clone)]
pub struct InternalDataBase {
    pool: SqlxPool,
}

impl InternalDataBase {
    pub async fn new(db_url: &str) -> Result<Self, SqlxError> {
        let connect_options = SqliteConnectOptions::from_str(db_url)?
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(5))
            .idle_timeout(Duration::from_secs(300))
            .max_lifetime(Duration::from_secs(1800))
            .connect_with(connect_options)
            .await?;
        Ok(Self { pool })
    }

    pub fn pool(&self) -> &SqlxPool {
        &self.pool
    }
}
