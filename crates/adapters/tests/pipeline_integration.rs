use adapters::actor_system::pipeline_actor_module::{
    consumer_actor::data_consumer_actor::ConsumerActorBridge,
    processor_actor::data_processor_actor::ProcessorActorBridge,
    store_actor::data_store_actor::StoreActorBridge,
};
/// Test de integración de los tres actores del pipeline: Consumer → Processor → Store.
///
/// A diferencia de los tests unitarios (que aíslan cada actor con fakes),
/// aquí los **tres actores reales** se conectan entre sí usando sus bridges.
/// Solo los extremos (fuente de datos y almacén externo) son dobles de prueba:
///
///   FakeDataSource
///        │  DataSource
///        ▼
///   DataConsumerActor  ──(ProcessorActorBridge)──▶  DataProcessorActor
///                                                         │ (StoreActorBridge)
///                                                         ▼
///                                                   DataStoreActor
///                                                         │ DataExternalStore
///                                                         ▼
///                                                   SpyExternalStore
///
/// Qué verifica este test que los unitarios NO verifican:
///   - Que ProcessorActorBridge conecta correctamente Consumer y Processor.
///   - Que StoreActorBridge conecta correctamente Processor y Store.
///   - Que todos los mensajes recorren el pipeline de extremo a extremo sin pérdidas.
///   - Que el orden relativo de llegada se mantiene.
// use actix::prelude::*;
use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::IoTBeeError;
use domain::outbound::{
    data_external_store::DataExternalStore, data_processor_actions::DataProcessorActions,
    data_source::DataSource,
};
use logging::{AppLogger, init_tracing};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc::Sender;

static LOGGER: AppLogger = AppLogger::new("test::pipeline_integration");

// ─── Dobles de prueba ─────────────────────────────────────────────────────────

/// Fuente de datos falsa: emite exactamente los payloads indicados y termina.
/// Al retornar, el Sender se descarta, lo que cierra el canal y detiene
/// al DataConsumerActor de forma limpia.
///
///

struct FakeDataProcessor;

impl FakeDataProcessor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl DataProcessorActions for FakeDataProcessor {
    async fn process_data(
        &self,
        data: &DataConsumerRawType,
    ) -> Result<DataConsumerRawType, IoTBeeError> {
        Ok(data.clone())
    }
}

struct FakeDataSource {
    payloads: Vec<String>,
}

impl FakeDataSource {
    fn con_payloads(payloads: Vec<String>) -> Self {
        Self { payloads }
    }
}

#[async_trait]
impl DataSource for FakeDataSource {
    async fn start_to_consume(
        &self,
        sender: Sender<DataConsumerRawType>,
    ) -> Result<(), IoTBeeError> {
        for payload in &self.payloads {
            let dato = DataConsumerRawType::new(payload).unwrap();
            // Si el receptor ya cerró el canal, ignoramos el error y salimos.
            if sender.send(dato).await.is_err() {
                break;
            }
        }
        Ok(()) // Al salir se descarta el Sender y el canal se cierra.
    }
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
        self.recibidos
            .lock()
            .unwrap()
            .push(data.value().to_string());
        self.sem.add_permits(1);
        Ok(())
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn generar_payloads(n: usize) -> Vec<String> {
    (0..n)
        .map(|i| format!(r#"{{"sensor":"temp","lectura":{}}}"#, i))
        .collect()
}

/// Construye el pipeline completo y devuelve:
///   - La dirección del consumer (para mantenerlo vivo mientras dure el test).
///   - El vec compartido donde el spy acumula los datos recibidos.
///   - El semáforo que el spy libera con cada `save()`.
fn montar_pipeline(
    payloads: Vec<String>,
) -> (Arc<Mutex<Vec<String>>>, Arc<tokio::sync::Semaphore>) {
    init_tracing();
    let recibidos: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let sem = Arc::new(tokio::sync::Semaphore::new(0));

    // 1. DataStoreActor + bridge (extremo de salida)
    let spy = Arc::new(SpyExternalStore::new(
        Arc::clone(&recibidos),
        Arc::clone(&sem),
    ));

    let data_process = Arc::new(FakeDataProcessor::new());

    let store_bridge = StoreActorBridge::start_new_store_actor_with_impl(spy);
    // let store_bridge = Arc::new(StoreActorBridge::new(DataStoreActor::new(spy).start()));

    // 2. DataProcessorActor + bridge (capa intermedia)
    // let processor_bridge = Arc::new(ProcessorActorBridge::new(
    //     DataProcessorActor::new(store_bridge).start(),
    // ));
    let processor_bridge =
        ProcessorActorBridge::start_new_processor_actor_with_impl(store_bridge, data_process);

    // 3. DataConsumerActor (extremo de entrada; auto-inicia en started())
    let source = Arc::new(FakeDataSource::con_payloads(payloads));
    // let consumer_addr = DataConsumerActor::new(source, processor_bridge).start();

    let _consumer_addr =
        ConsumerActorBridge::start_new_consumer_actor_with_impl(source, processor_bridge);

    (recibidos, sem)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/// Verifica que N mensajes emitidos por la fuente llegan intactos al store.
#[actix_rt::test]
async fn pipeline_propaga_todos_los_mensajes_de_extremo_a_extremo() {
    LOGGER.info("Iniciando test: pipeline_propaga_todos_los_mensajes_de_extremo_a_extremo");
    const N: usize = 5;
    let payloads = generar_payloads(N);

    let (recibidos, sem) = montar_pipeline(payloads.clone());

    // Esperar a que todos los mensajes salgan por el store (máx. 5 s).
    let _ = tokio::time::timeout(Duration::from_secs(5), sem.acquire_many(N as u32))
        .await
        .expect("Timeout: no llegaron todos los mensajes al store en 5 segundos");

    let datos = recibidos.lock().unwrap();
    assert_eq!(
        datos.len(),
        N,
        "Deben llegar exactamente {N} mensajes al store"
    );

    for payload in &payloads {
        assert!(
            datos.contains(payload),
            "El payload '{payload}' no llegó al store"
        );
    }
}

/// Verifica que el pipeline es capaz de manejar un volumen mayor de mensajes
/// sin perder ninguno.
#[actix_rt::test]
async fn pipeline_propaga_lote_grande_sin_perdidas() {
    const N: usize = 50;
    let payloads = generar_payloads(N);

    let (recibidos, sem) = montar_pipeline(payloads);

    let _ = tokio::time::timeout(Duration::from_secs(10), sem.acquire_many(N as u32))
        .await
        .expect("Timeout: no llegaron los 50 mensajes al store en 10 segundos");

    assert_eq!(recibidos.lock().unwrap().len(), N);
}

/// Verifica el comportamiento con una fuente vacía: el pipeline no debe
/// bloquear ni entregar mensajes fantasma.
#[actix_rt::test]
async fn pipeline_con_fuente_vacia_no_entrega_mensajes() {
    let (recibidos, sem) = montar_pipeline(vec![]);

    // Dar tiempo a que cualquier mensaje fantasma pudiera llegar.
    tokio::time::sleep(Duration::from_millis(200)).await;

    // No debe haberse liberado ningún permiso.
    assert_eq!(
        sem.available_permits(),
        0,
        "No deben llegar mensajes al store si la fuente está vacía"
    );
    assert!(recibidos.lock().unwrap().is_empty());
}
