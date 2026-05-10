pub enum ExternalPersistenceType {
    InfluxDb,
}

impl TryFrom<&str> for ExternalPersistenceType {
    type Error = String;

    fn try_from(s: &str) -> Result<Self, Self::Error> {
        match s {
            "INFLUXDB" => Ok(ExternalPersistenceType::InfluxDb),
            other => Err(format!("Unknown external persistence type: {}", other)),
        }
    }
}
