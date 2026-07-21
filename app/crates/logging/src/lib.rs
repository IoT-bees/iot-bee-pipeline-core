use std::panic::Location;
use std::sync::Once;

use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

static TRACING_INIT: Once = Once::new();

#[derive(Clone, Copy)]
pub struct AppLogger {
    target: &'static str,
}

impl AppLogger {
    pub const fn new(target: &'static str) -> Self {
        Self { target }
    }

    #[track_caller]
    pub fn trace(&self, message: &str) {
        let location = Location::caller();
        tracing::trace!(
            target = self.target,
            caller_file = location.file(),
            caller_line = location.line(),
            "{message}"
        );
    }

    #[track_caller]
    pub fn debug(&self, message: &str) {
        let location = Location::caller();
        tracing::debug!(
            target = self.target,
            caller_file = location.file(),
            caller_line = location.line(),
            "{message}"
        );
    }

    #[track_caller]
    pub fn info(&self, message: &str) {
        let location = Location::caller();
        tracing::info!(
            target = self.target,
            caller_file = location.file(),
            caller_line = location.line(),
            "{message}"
        );
    }

    #[track_caller]
    pub fn warn(&self, message: impl Into<String>) {
        let location = Location::caller();
        let message = message.into();
        tracing::warn!(
            target = self.target,
            caller_file = location.file(),
            caller_line = location.line(),
            "{message}"
        );
    }

    #[track_caller]
    pub fn error(&self, message: impl Into<String>) {
        let location = Location::caller();
        let message = message.into();
        tracing::error!(
            target = self.target,
            caller_file = location.file(),
            caller_line = location.line(),
            "{message}"
        );
    }
}

pub fn get_logger(target: &'static str) -> AppLogger {
    AppLogger::new(target)
}

pub fn init_tracing() {
    TRACING_INIT.call_once(|| {
        let env_filter = EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new("iot_bee=info,actix_web=info"));

        tracing_subscriber::registry()
            .with(env_filter)
            .with(
                fmt::layer()
                    .with_target(true)
                    .with_thread_ids(true)
                    // .with_file(true)
                    .with_line_number(true)
                    .compact(),
            )
            .init();
    });
}
