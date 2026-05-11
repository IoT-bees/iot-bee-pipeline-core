// archivo para crear un test de integracion del sistema de actores.

// use adapters::actor_system::supervisor_pipeline_life_time::actor_wrapper::SupervisorPipelineBridge;
use adapters::actor_system::supervisor_actor_system::actor_wrapper::PipelineActorSupervisorSystemBridge;
use domain::error::IoTBeeError;
use domain::inbound::pipeline_lifecycle::PipelineLifecycle;
use domain::outbound::data_external_store::DataExternalStore;
use domain::outbound::pipeline_component_factory::PipelineComponentFactory;

use domain::value_objects::pipelines_values::DataStoreId;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::entities::pipeline_data::PipelineConfiguration;

use async_trait::async_trait;
use logging::{AppLogger, init_tracing};
use std::sync::Arc;
use std::sync::Mutex;


use infrastructure::data_processor::data_process::PipelineDataProcessorCore;

use infrastructure::pipeline_component_factory::infra_pipeline_component_factory::InfrastructurePipelineComponentFactory;
use domain::entities::data_source::PipelineDataSourceOutputModel;
use iot_bee::config::Config;
use serde_json;
use chrono; 


static LOGGER: AppLogger = AppLogger::new("test::actor_system_test");

const SCHEMA_MULTI: &str = r#"{
    "temperatura": {
        "type": "float",
        "required": true,
        "validation": { "min": -50.0, "max": 150.0 },
        "operation": {
            "type": "bin_op", "op": "Add",
            "left": {
                "type": "bin_op", "op": "Mul",
                "left":  { "type": "var",  "name": "temperatura" },
                "right": { "type": "num",  "value": 1.8 }
            },
            "right": { "type": "num", "value": 32.0 }
        }
    },
    "humedad": {
        "type": "float",
        "required": true,
        "validation": { "min": 0.0, "max": 100.0 },
        "operation": {
            "type": "bin_op", "op": "Mul",
            "left":  { "type": "var", "name": "humedad" },
            "right": { "type": "num", "value": 2.0 }
        }
    },
    "presion": {
        "type": "float",
        "required": false,
        "default": 1013.25,
        "validation": { "min": 800.0, "max": 1200.0 }
    }
}"#;

#[actix_rt::test]
#[ignore]
async fn test_pipeline_lifecycle() {
    init_tracing();
    LOGGER.info("Iniciando test de ciclo de vida del pipeline...");
    let config = Config::get();
    let rabbitmq_url = config
        .data_source
        .as_ref()
        .expect("DATA_SOURCE no configurada");
    let queue_name = config
        .queue_name
        .as_ref()
        .expect("QUEUE_NAME no configurada");

        let infra_components = InfrastructurePipelineComponentFactory::new(); 
        
        let pipeline_data = PipelineDataSourceOutputModel::new(
            1,
            "DataSource de prueba",
            serde_json::json!( {
                "host": rabbitmq_url,
                "queue_name": queue_name,
                "consumer_name": "test_consumer"
            }).to_string(),
            "RABBITMQ",
            "Descripción del data source de prueba",
            chrono::Utc::now(),
            chrono::Utc::now(),
        );
        let data_source = infra_components
            .create_data_source(&pipeline_data.unwrap())
            .expect("Error al crear data source desde configuración");
        
    // data estore mock
    let data_store = Arc::new(SpyExternalStore::new(
        Arc::new(Mutex::new(vec![])),
        Arc::new(tokio::sync::Semaphore::new(0)),
    ));

    let data_processor = Arc::new(PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap());

    let pipeline_configuration =
        PipelineConfiguration::new("Pipeline de prueba".to_string(), 1).unwrap();

    let system_bridge = PipelineActorSupervisorSystemBridge::instance();
    let id = DataStoreId::new(1).unwrap();
    let result = system_bridge
        .start(
            &id,
            pipeline_configuration,
            data_source.clone(),
            data_processor.clone(),
            data_store.clone(),
        )
        .await;

    assert!(
        result.is_ok(),
        "Error al iniciar el pipeline: {:?}",
        result.err()
    );

    let (tx, rx): (
        tokio::sync::oneshot::Sender<()>,
        tokio::sync::oneshot::Receiver<()>,
    ) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.ok();
        let _ = tx.send(());
    });

    // Esperar señal o timeout razonable
    tokio::select! {
        _ = rx => {
            LOGGER.info("Test finalizado por señal");
        }
        _ = tokio::time::sleep(std::time::Duration::from_secs(60)) => {
            LOGGER.info("Timeout de 30 segundos alcanzado");
        }
    }
    // }
}

/// Store externo espía: registra cada valor recibido en orden de llegada
/// y libera un permiso en el semáforo para que el test pueda esperar
/// sin busy-wait.
struct SpyExternalStore {
    recibidos: Arc<Mutex<Vec<String>>>,
    sem: Arc<tokio::sync::Semaphore>,
}

impl SpyExternalStore {
    fn new(recibidos: Arc<Mutex<Vec<String>>>, sem: Arc<tokio::sync::Semaphore>) -> Self {
        Self { recibidos, sem }
    }
}

#[async_trait]
impl DataExternalStore for SpyExternalStore {
    async fn save(&self, data: DataConsumerRawType) -> Result<(), IoTBeeError> {
        LOGGER.info(&format!(
            "SpyExternalStore received data to save: {:?}",
            data.value()
        ));
        self.recibidos
            .lock()
            .unwrap()
            .push(data.value().to_string());
        self.sem.add_permits(1);
        Ok(())
    }
}
