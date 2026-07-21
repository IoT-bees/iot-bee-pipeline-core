use iot_bee::composition::api_composition::api_composer::ApiComposer;
use iot_bee::composition::app_state::AppState;
use logging::init_tracing;
use tracing::info;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    init_tracing();
    banner();

    // La conexión a la base de datos se construye una sola vez y se comparte
    // entre el sistema de actores y la API HTTP.
    let db = match AppState::build_db().await {
        Ok(db) => db,
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            std::process::exit(1);
        }
    };

    // 1. Actor supervisor: arranca primero y carga los pipelines activos desde DB.
    let app_state = AppState::new(db.clone());
    app_state.ensure_default_admin().await;
    app_state.start_all_pipelines().await;

    // 2. API HTTP: arranca después, ya con el supervisor vivo.
    ApiComposer::run(db).await
}

fn banner() {
    let banner = r#"
===========================================================

$$$$$$\       $$$$$$$$\      $$$$$$$\                      
\_$$  _|      \__$$  __|     $$  __$$\                     
  $$ |  $$$$$$\  $$ |        $$ |  $$ | $$$$$$\   $$$$$$\  
  $$ | $$  __$$\ $$ |$$$$$$\ $$$$$$$\ |$$  __$$\ $$  __$$\ 
  $$ | $$ /  $$ |$$ |\______|$$  __$$\ $$$$$$$$ |$$$$$$$$ |
  $$ | $$ |  $$ |$$ |        $$ |  $$ |$$   ____|$$   ____|
$$$$$$\\$$$$$$  |$$ |        $$$$$$$  |\$$$$$$$\ \$$$$$$$\ 
\______|\______/ \__|        \_______/  \_______| \_______|

===========================================================
"#;
    info!("{}", banner);
}
