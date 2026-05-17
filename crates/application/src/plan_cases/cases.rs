use std::sync::Arc;

use async_trait::async_trait;

use domain::error::PlanError;
use domain::plan::entities::plan::{NewPlan, Plan, UpdatePlan};
use domain::plan::inbound::plan_uses::PlanUseCases;
use domain::plan::outbound::plan_repository::PlanRepository;

pub struct PlanUseCasesImpl {
    repo: Arc<dyn PlanRepository>,
}

impl PlanUseCasesImpl {
    pub fn new(repo: Arc<dyn PlanRepository>) -> Self {
        Self { repo }
    }
}

fn validate_slug(slug: &str) -> Result<(), PlanError> {
    if slug.is_empty()
        || slug.len() > 64
        || !slug
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(PlanError::Invalid {
            reason: "slug must match ^[a-z0-9-]{1,64}$".into(),
        });
    }
    Ok(())
}

fn validate_currency(c: &str) -> Result<(), PlanError> {
    if c.len() != 3 || !c.chars().all(|c| c.is_ascii_uppercase()) {
        return Err(PlanError::Invalid {
            reason: "currency must be an ISO 4217 code, e.g. USD".into(),
        });
    }
    Ok(())
}

#[async_trait]
impl PlanUseCases for PlanUseCasesImpl {
    async fn list(&self, organization_id: i64) -> Result<Vec<Plan>, PlanError> {
        self.repo.list_visible_to(organization_id).await
    }

    async fn create(&self, input: NewPlan) -> Result<Plan, PlanError> {
        validate_slug(&input.slug)?;
        validate_currency(&input.currency)?;
        if input.max_pipelines < 0 || input.max_replicas_per_pipeline < 0 {
            return Err(PlanError::Invalid {
                reason: "limits must be non-negative".into(),
            });
        }
        if input.price_cents < 0 {
            return Err(PlanError::Invalid {
                reason: "price_cents must be non-negative".into(),
            });
        }
        self.repo.create(input).await
    }

    async fn update(&self, id: i64, patch: UpdatePlan) -> Result<Plan, PlanError> {
        if let Some(ref c) = patch.currency {
            validate_currency(c)?;
        }
        if let Some(p) = patch.price_cents {
            if p < 0 {
                return Err(PlanError::Invalid {
                    reason: "price_cents must be non-negative".into(),
                });
            }
        }
        if patch.max_pipelines.is_some_and(|v| v < 0)
            || patch.max_replicas_per_pipeline.is_some_and(|v| v < 0)
        {
            return Err(PlanError::Invalid {
                reason: "limits must be non-negative".into(),
            });
        }
        self.repo.update(id, patch).await
    }

    async fn delete(&self, id: i64) -> Result<(), PlanError> {
        // Refuse to delete the "free" global plan — it is the runtime fallback.
        if let Some(plan) = self.repo.find_by_id(id).await? {
            if plan.organization_id.is_none() && plan.slug == "free" {
                return Err(PlanError::Invalid {
                    reason: "the global 'free' plan is the runtime fallback and cannot be deleted"
                        .into(),
                });
            }
        }
        self.repo.delete(id).await
    }
}
