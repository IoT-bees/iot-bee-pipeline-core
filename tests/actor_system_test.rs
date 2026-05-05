// archivo para crear un test de integracion del sistema de actores. 


use adapters::actor_system::supervisor_pipeline_life_time::actor_wrapper::SupervisorPipelineBridge;
// use domain::entities::pipeline_data::PipelineConfiguration;
use domain::error::IoTBeeError;
use domain::outbound::data_external_store::DataExternalStore;
// use domain::outbound::data_source::DataSource;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::entities::pipeline_data::PipelineConfiguration;

// use domain::outbound::data_source::DataSource;
use logging::{AppLogger, init_tracing};
use std::sync::Arc;
use std::sync::Mutex;
use async_trait::async_trait;

//datos de infra real 
// use actix::prelude::*;

use infrastructure::data_source::rabbitmq_data_source::RabbitMQDataSource;
use infrastructure::data_processor::data_process::PipelineDataProcessorCore;
use iot_bee::config::Config;





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
    let rabbitmq_url = config.data_source.as_ref().expect("DATA_SOURCE no configurada");
    let queue_name = config.queue_name.as_ref().expect("QUEUE_NAME no configurada");
    let data_source = RabbitMQDataSource::new(
        rabbitmq_url,
        queue_name,
        "test_consumer"
    );

    let data_source = Arc::new(data_source);
    
    // data estore mock 
    let data_store = Arc::new(SpyExternalStore::new(
        Arc::new(Mutex::new(vec![])),
        Arc::new(tokio::sync::Semaphore::new(0)),
    ));

    let data_processor = Arc::new(PipelineDataProcessorCore::new(SCHEMA_MULTI).unwrap());
    
    
    let pipeline_configuration = PipelineConfiguration::new(
        "Pipeline de prueba".to_string(),
        1
    ).unwrap();
    
    let supervisor = SupervisorPipelineBridge::start_new_pipeline_supervisor(
        1,
        pipeline_configuration,
        data_store.clone(),
        data_source.clone(),
        data_processor.clone(),
    );

    let result =      supervisor.start_pipeline().await;
    assert!(result.is_ok(), "Error al iniciar el pipeline: {:?}", result.err());


    // tokio::time::sleep(std::time::Duration::from_secs(1000000)).await;
    // En lugar de sleep enorme, usa canales o señales
    let (tx, rx): (tokio::sync::oneshot::Sender<()>, tokio::sync::oneshot::Receiver<()>) = tokio::sync::oneshot::channel();
    
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
       LOGGER.info(&format!("SpyExternalStore received data to save: {:?}", data.value()));
        self.recibidos
            .lock()
            .unwrap()
            .push(data.value().to_string());
        self.sem.add_permits(1);
        Ok(())
    }
}



