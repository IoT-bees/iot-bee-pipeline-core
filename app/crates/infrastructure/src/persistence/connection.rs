use sqlx::Error as SqlxError;
use sqlx::postgres::{PgConnectOptions, PgPool as SqlxPool, PgPoolOptions};
use std::time::Duration;

#[derive(Clone)]
pub struct InternalDataBase {
    pool: SqlxPool,
}

impl InternalDataBase {
    pub async fn new(db_url: &str) -> Result<Self, SqlxError> {
        let connect_options: PgConnectOptions = db_url.parse()?;

        let pool = PgPoolOptions::new()
            .max_connections(20)
            .min_connections(2)
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

    pub async fn ping(&self) -> Result<(), SqlxError> {
        sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(())
    }
}
