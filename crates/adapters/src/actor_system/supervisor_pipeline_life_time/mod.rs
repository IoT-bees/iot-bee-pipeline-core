pub mod actor_wrapper;
pub mod handlers;
pub mod messges;
pub mod pipeline_abstraction;
pub mod pipeline_supervisor;

use domain::outbound::data_external_store::DataExternalStore;
use domain::outbound::data_processor_actions::DataProcessorActions;
use domain::outbound::data_source::DataSource;
use std::sync::Arc;

pub type DataSourceThreadSafe = Arc<dyn DataSource + Send + Sync>;
pub type DataProcessorThreadSafe = Arc<dyn DataProcessorActions + Send + Sync>;
pub type DataExternalStoreThreadSafe = Arc<dyn DataExternalStore + Send + Sync>;
