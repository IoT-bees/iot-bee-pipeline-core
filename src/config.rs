// config.rs
use dotenvy::dotenv;
use std::env;
use std::sync::OnceLock;

pub struct Config {
    pub database_url: String,
    pub data_source: Option<String>,
    pub queue_name: Option<String>,
    pub data_store: Option<String>,
}

static CONFIG: OnceLock<Config> = OnceLock::new();

impl Config {
    pub fn get() -> &'static Config {
        CONFIG.get_or_init(|| {
            dotenv().ok();

            Config {
                database_url: env::var("DATABASE_URL").expect("DATABASE_URL requerida"),
                data_source: env::var("DATA_SOURCE").ok(),
                queue_name: env::var("QUEUE_NAME").ok(),
                data_store: env::var("DATA_STORE").ok(),
            }
        })
    }
}
