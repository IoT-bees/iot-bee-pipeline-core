#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContactSettings {
    pub contact_email: String,
    pub whatsapp_number: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UpdateContactSettings {
    pub contact_email: String,
    pub whatsapp_number: Option<String>,
}
