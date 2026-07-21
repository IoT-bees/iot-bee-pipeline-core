/// Pruebas del actor `DataStoreActor`.
/// Usan un `DataExternalStore` falso para verificar que el actor:
///   - llama a `save()` cuando recibe `SendDataToStoreMessage`
///   - propaga los errores del store externo al llamante
use actix::prelude::*;
use adapters::actor_system::pipeline_actor_module::store_actor::data_store_actor::DataStoreActor;
use adapters::actor_system::pipeline_actor_module::store_actor::messages::SendDataToStoreMessage;
use async_trait::async_trait;
use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::data_external_store::DataExternalStore;
use std::sync::{Arc, Mutex};

// ─── Store externo falso ──────────────────────────────────────────────────────

struct FakeExternalStore {
    fue_llamado: Arc<Mutex<bool>>,
    debe_fallar: bool,
}

impl FakeExternalStore {
    fn exitoso() -> (Arc<Self>, Arc<Mutex<bool>>) {
        let llamado = Arc::new(Mutex::new(false));
        let store = Arc::new(Self {
            fue_llamado: Arc::clone(&llamado),
            debe_fallar: false,
        });
        (store, llamado)
    }

    fn fallido() -> (Arc<Self>, Arc<Mutex<bool>>) {
        let llamado = Arc::new(Mutex::new(false));
        let store = Arc::new(Self {
            fue_llamado: Arc::clone(&llamado),
            debe_fallar: true,
        });
        (store, llamado)
    }
}

#[async_trait]
impl DataExternalStore for FakeExternalStore {
    async fn save(&self, _data: DataConsumerRawType) -> Result<(), IoTBeeError> {
        *self.fue_llamado.lock().unwrap() = true;
        if self.debe_fallar {
            Err(PipelinePersistenceError::SaveFailed {
                reason: "fallo forzado del store externo".to_string(),
            }
            .into())
        } else {
            Ok(())
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn dato_raw() -> DataConsumerRawType {
    DataConsumerRawType::new(r#"{"sensor":"temperatura","valor":22.5,"unidad":"C"}"#).unwrap()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn actor_llama_save_al_recibir_mensaje() {
    let (fake_store, fue_llamado) = FakeExternalStore::exitoso();
    let actor = DataStoreActor::new(fake_store);
    let addr = actor.start();

    let msg = SendDataToStoreMessage::new(&dato_raw());
    let resultado = addr.send(msg).await.expect("El actor debe responder");

    assert!(resultado.is_ok(), "El handler debe completar sin error");
    assert!(
        *fue_llamado.lock().unwrap(),
        "external_store.save() debe haber sido invocado"
    );
}

#[actix_rt::test]
async fn actor_propaga_error_del_store_externo() {
    let (fake_store, fue_llamado) = FakeExternalStore::fallido();
    let actor = DataStoreActor::new(fake_store);
    let addr = actor.start();

    let msg = SendDataToStoreMessage::new(&dato_raw());
    let resultado = addr.send(msg).await.expect("El actor debe responder");

    assert!(
        resultado.is_err(),
        "El handler debe propagar el error del store externo"
    );
    assert!(
        *fue_llamado.lock().unwrap(),
        "save() debe haber sido llamado aunque fallase"
    );
}

#[actix_rt::test]
async fn actor_maneja_multiples_mensajes_en_secuencia() {
    let (fake_store, fue_llamado) = FakeExternalStore::exitoso();
    let actor = DataStoreActor::new(fake_store);
    let addr = actor.start();

    for i in 0..5 {
        let payload = format!(r#"{{"lectura":{}}}"#, i);
        let data = DataConsumerRawType::new(&payload).unwrap();
        let msg = SendDataToStoreMessage::new(&data);
        let res = addr.send(msg).await.expect("El actor debe responder");
        assert!(res.is_ok(), "El mensaje {i} debe procesarse sin error");
    }

    assert!(
        *fue_llamado.lock().unwrap(),
        "save() debe haber sido invocado al menos una vez"
    );
}
