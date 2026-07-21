/* /// Test de integración del PipelineSupervisor.
///
/// Verifica que el supervisor gestiona correctamente las réplicas de un pipeline:
/// add_replica, remove_replica, replica_count, stop_all, restart_all y status_all.
///
/// ── Arquitectura de los dobles ───────────────────────────────────────────────
///
///   FakeDataSource → DataConsumerActor → DataProcessorActor → DataStoreActor
///
/// Los tres actores son independientes entre sí (no conectados por flujo de datos)
/// porque aquí solo se prueba la capa del supervisor.
/// El flujo de datos está cubierto por el test `pipeline_integration`.
use actix::prelude::*;
use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;

use iot_bee::adapters::actor_system::pipeline_actor_module::{
    consumer_actor::data_consumer_actor::{ConsumerActorBridge, DataConsumerActor},
    general_messages::ActorStatus,
    processor_actor::data_processor_actor::{DataProcessorActor, ProcessorActorBridge},
    store_actor::data_store_actor::{DataStoreActor, StoreActorBridge},
};
use iot_bee::adapters::actor_system::supervisor_pipeline_life_time::{
    messges::{
        AddReplicaMessage, RemoveReplicaMessage, ReplicaCountMessage, RestartAllReplicasMessage,
        StatusAllReplicasMessage, StopAllReplicasMessage,
    },
    pipeline_abstraction::PipelineAbstractionController,
    pipeline_supervisor::PipelineSupervisor,
};
use iot_bee::domain::entities::data_consumer_types::DataConsumerRawType;
use iot_bee::domain::error::IoTBeeError;
use iot_bee::domain::outbound::{
    data_external_store::DataExternalStore,
    data_source::DataSource,
};
use iot_bee::logging::init_tracing;

// ── Dobles de prueba ──────────────────────────────────────────────────────────

struct FakeExternalStore;

#[async_trait]
impl DataExternalStore for FakeExternalStore {
    async fn save(&self, _data: DataConsumerRawType) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

/// Fuente de datos que retorna inmediatamente sin emitir datos.
struct FakeDataSource;

#[async_trait]
impl DataSource for FakeDataSource {
    async fn start_to_consume(
        &self,
        _sender: Sender<DataConsumerRawType>,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

// ── Alias de tipos concretos para los helpers ─────────────────────────────────

type StoreBridge = StoreActorBridge<FakeExternalStore>;
type ProcessorBridge = ProcessorActorBridge<StoreBridge>;
type ConsumerBridge = ConsumerActorBridge<FakeDataSource, ProcessorBridge>;

// El supervisor no necesita parámetros de tipo tras el refactor Box<dyn>.
type TestSupervisor = PipelineSupervisor;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn crear_store_bridge() -> StoreBridge {
    let addr = DataStoreActor::new(Arc::new(FakeExternalStore)).start();
    StoreActorBridge::new(addr)
}

fn crear_processor_bridge() -> ProcessorBridge {
    let store_addr = DataStoreActor::new(Arc::new(FakeExternalStore)).start();
    let store_bridge = Arc::new(StoreActorBridge::new(store_addr));
    let processor_addr = DataProcessorActor::new(store_bridge).start();
    ProcessorActorBridge::new(processor_addr)
}

fn crear_consumer_bridge() -> ConsumerBridge {
    let store_addr = DataStoreActor::new(Arc::new(FakeExternalStore)).start();
    let store_bridge = Arc::new(StoreActorBridge::new(store_addr));
    let processor_addr = DataProcessorActor::new(store_bridge).start();
    let processor_bridge = Arc::new(ProcessorActorBridge::new(processor_addr));
    let consumer_addr =
        DataConsumerActor::new(Arc::new(FakeDataSource), processor_bridge).start();
    ConsumerActorBridge::new(consumer_addr)
}

/// Construye un controller con consumer, processor y store independientes.
fn crear_controller() -> PipelineAbstractionController {
    PipelineAbstractionController::new(
        Box::new(crear_consumer_bridge()),
        Box::new(crear_processor_bridge()),
        Box::new(crear_store_bridge()),
    )
}

// ── Tests: gestión de réplicas ────────────────────────────────────────────────

#[actix_rt::test]
async fn supervisor_add_replica_registra_correctamente() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    let resultado = supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap();

    assert!(resultado.is_ok(), "add_replica debe retornar Ok(count)");
    assert_eq!(resultado.unwrap(), 1, "Debe haber 1 réplica");
}

#[actix_rt::test]
async fn supervisor_add_multiple_replicas_incrementa_contador() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    for i in 1..=3usize {
        let count = supervisor
            .send(AddReplicaMessage::new(crear_controller()))
            .await
            .unwrap()
            .unwrap();
        assert_eq!(count, i, "El contador debe ser {} tras añadir la réplica {}", i, i);
    }
}

#[actix_rt::test]
async fn supervisor_count_sin_replicas_retorna_cero() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    let count = supervisor
        .send(ReplicaCountMessage)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(count, 0, "Sin réplicas el contador debe ser 0");
}

#[actix_rt::test]
async fn supervisor_remove_ultima_replica_disminuye_contador() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap()
        .unwrap();
    supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap()
        .unwrap();

    supervisor.send(RemoveReplicaMessage).await.unwrap().unwrap();

    let count = supervisor.send(ReplicaCountMessage).await.unwrap().unwrap();
    assert_eq!(count, 1, "Debe quedar 1 réplica tras eliminar la última");
}

#[actix_rt::test]
async fn supervisor_remove_cuando_vacio_retorna_error() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    let resultado = supervisor.send(RemoveReplicaMessage).await.unwrap();
    assert!(resultado.is_err(), "Eliminar sin réplicas debe retornar Err");
}

// ── Tests: ciclo de vida sobre todas las réplicas ────────────────────────────

#[actix_rt::test]
async fn supervisor_stop_all_delega_stop_a_todas_las_replicas() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap()
        .unwrap();
    supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap()
        .unwrap();

    let resultados = supervisor
        .send(StopAllReplicasMessage)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(resultados.len(), 2, "Debe haber resultados para 2 réplicas");
    for (r_consumer, r_processor, r_store) in resultados {
        assert_eq!(r_consumer.unwrap().status(), ActorStatus::Stopped);
        assert_eq!(r_processor.unwrap().status(), ActorStatus::Stopped);
        assert_eq!(r_store.unwrap().status(), ActorStatus::Stopped);
    }
}

#[actix_rt::test]
async fn supervisor_restart_all_delega_restart_a_todas_las_replicas() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap()
        .unwrap();
    supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap()
        .unwrap();

    let resultados = supervisor
        .send(RestartAllReplicasMessage)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(resultados.len(), 2, "Debe haber resultados para 2 réplicas");
    for (r_consumer, r_processor, r_store) in resultados {
        assert_eq!(r_consumer.unwrap().status(), ActorStatus::Restarting);
        assert_eq!(r_processor.unwrap().status(), ActorStatus::Restarting);
        assert_eq!(r_store.unwrap().status(), ActorStatus::Restarting);
    }
}

#[actix_rt::test]
async fn supervisor_status_all_retorna_running_para_replicas_activas() {
    init_tracing();
    let supervisor = TestSupervisor::new(1).start();

    supervisor
        .send(AddReplicaMessage::new(crear_controller()))
        .await
        .unwrap()
        .unwrap();

    let resultados = supervisor
        .send(StatusAllReplicasMessage)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(resultados.len(), 1, "Debe haber resultados para 1 réplica");
    let (r_consumer, r_processor, r_store) = resultados.into_iter().next().unwrap();
    assert_eq!(r_consumer.unwrap().status(), ActorStatus::Running);
    assert_eq!(r_processor.unwrap().status(), ActorStatus::Running);
    assert_eq!(r_store.unwrap().status(), ActorStatus::Running);
}
 */
