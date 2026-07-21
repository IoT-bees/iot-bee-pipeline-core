use crate::error::AuthError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Email(String);

impl Email {
    pub fn parse(raw: impl Into<String>) -> Result<Self, AuthError> {
        let raw = raw.into().trim().to_lowercase();
        if raw.is_empty() || !raw.contains('@') || raw.len() > 254 {
            return Err(AuthError::Internal {
                reason: format!("invalid email '{raw}'"),
            });
        }
        Ok(Email(raw))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}
