// config.rs
use dotenvy::dotenv;
use std::env;
use std::sync::OnceLock;

pub struct Config {
    pub database_url: String,
    pub data_source: Option<String>,
    pub queue_name: Option<String>,
    pub data_store: Option<String>,
    pub api_host: Option<String>,
    pub api_port: Option<u16>,
    pub jwt_secret: String,
    pub jwt_expires_in_hours: i64,
    pub cors_origins: Vec<String>,
    pub admin_email: String,
    pub admin_password: String,
    pub admin_name: String,
    pub rabbitmq_url: Option<String>,
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
                api_host: env::var("API_HOST").ok(),
                api_port: env::var("API_PORT").ok().and_then(|s| s.parse().ok()),
                jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET requerida"),
                jwt_expires_in_hours: env::var("JWT_EXPIRES_IN_HOURS")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(24),
                cors_origins: env::var("CORS_ORIGINS")
                    .unwrap_or_else(|_| "http://localhost:3000".into())
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect(),
                admin_email: env::var("ADMIN_EMAIL")
                    .unwrap_or_else(|_| "admin@iot-bee.local".into())
                    .to_lowercase(),
                admin_password: env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".into()),
                admin_name: env::var("ADMIN_NAME").unwrap_or_else(|_| "Admin".into()),
                rabbitmq_url: env::var("RABBITMQ_URL").ok(),
            }
        })
    }
}
