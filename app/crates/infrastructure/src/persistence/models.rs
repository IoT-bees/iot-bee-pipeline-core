use sqlx::FromRow;

#[derive(FromRow)]
pub struct ValidationSchemaRow {
    pub json_name: String,
    pub json_schema: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct ValidationSchemaRowWhitId {
    pub id: i64,
    pub json_name: String,
    pub json_schema: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct ConnectionTypeRow {
    pub id: i64,
    pub connection_type: String,
}

#[derive(FromRow)]
pub struct DataSourceRow {
    pub id: i64,
    pub name: String,
    pub data_source_state: String,
    pub data_source_configuration: String,
    pub data_source_description: String,
    pub source_type: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct PipelineGroupRow {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct DataStoreRow {
    pub id: i64,
    pub name: String,
    pub store_type: String,
    pub json_schema: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct PipelineRowFlat {
    pub id: i64,
    pub name: String,

    pub group_id: i64,
    pub group_name: String,

    pub db_id: i64,
    pub db_name: String,

    pub data_source_id: i64,
    pub data_source_name: String,

    pub validation_schema_id: i64,
    pub validation_schema_name: String,

    pub replicas: i32,
    pub status: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct LicenseSubscriptionRow {
    pub license_key: String,
    pub plan: String,
    pub state: String,
    pub activated_at: String,
    pub expires_at: Option<String>,
    pub last_checked_at: String,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub stripe_checkout_session_id: Option<String>,
    pub stripe_subscription_status: Option<String>,
    pub stripe_payment_status: Option<String>,
    pub current_period_end: Option<String>,
    pub cancel_at_period_end: bool,
    pub latest_invoice_id: Option<String>,
    pub amount_cents: Option<i64>,
    pub currency: Option<String>,
}
