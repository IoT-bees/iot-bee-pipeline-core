use application::license_cases::cases::effective_limits;
use async_trait::async_trait;
use chrono::Utc;
use domain::entities::license::{
    BillingEvent, LicensePlan, LicenseState, LicenseSubscription, StripeBillingSync,
};
use domain::error::{IoTBeeError, PlanError};
use domain::outbound::license_repository::LicenseRepository;
use domain::plan::entities::plan::{NewPlan, Plan, UpdatePlan};
use domain::plan::outbound::plan_repository::PlanRepository;

struct StubLicenseRepo {
    plan: LicensePlan,
}

#[async_trait]
impl LicenseRepository for StubLicenseRepo {
    async fn get_subscription(&self, _: i64) -> Result<Option<LicenseSubscription>, IoTBeeError> {
        Ok(Some(LicenseSubscription::new(
            "TEST-KEY-1234567890",
            self.plan,
            LicenseState::Active,
            Utc::now(),
            None,
            Utc::now(),
        )))
    }
    async fn upsert_subscription(
        &self,
        _: i64,
        _: &LicenseSubscription,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn deactivate_subscription(&self, _: i64) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn sync_stripe_subscription(
        &self,
        _: i64,
        _: &StripeBillingSync,
    ) -> Result<LicenseSubscription, IoTBeeError> {
        unreachable!()
    }
    async fn list_billing_events(&self, _: i64, _: i64) -> Result<Vec<BillingEvent>, IoTBeeError> {
        Ok(vec![])
    }
    async fn get_billing_event(&self, _: i64, _: i64) -> Result<Option<BillingEvent>, IoTBeeError> {
        Ok(None)
    }
    async fn mark_billing_event_processed(
        &self,
        _: i64,
        _: i64,
        _: bool,
        _: Option<&str>,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

struct StubPlanRepo {
    pro_max_pipelines: i64,
}

#[async_trait]
impl PlanRepository for StubPlanRepo {
    async fn list_visible_to(&self, _: i64) -> Result<Vec<Plan>, PlanError> {
        Ok(vec![])
    }
    async fn list_global(&self) -> Result<Vec<Plan>, PlanError> {
        Ok(vec![])
    }
    async fn find_by_id(&self, _: i64) -> Result<Option<Plan>, PlanError> {
        Ok(None)
    }
    async fn find_effective(&self, slug: &str, _: i64) -> Result<Option<Plan>, PlanError> {
        if slug == "pro" {
            Ok(Some(Plan {
                id: 1,
                slug: "pro".into(),
                organization_id: None,
                display_name: "Pro".into(),
                description: None,
                price_cents: 9900,
                currency: "USD".into(),
                max_pipelines: self.pro_max_pipelines,
                max_replicas_per_pipeline: 16,
                included_messages_monthly: 10_000_000,
                alerts_enabled: true,
                premium_connectors: true,
                multi_user: false,
                is_custom: false,
                stripe_price_id: None,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            }))
        } else {
            Ok(None)
        }
    }
    async fn create(&self, _: NewPlan) -> Result<Plan, PlanError> {
        unreachable!()
    }
    async fn update(&self, _: i64, _: UpdatePlan) -> Result<Plan, PlanError> {
        unreachable!()
    }
    async fn delete(&self, _: i64) -> Result<(), PlanError> {
        unreachable!()
    }
}

struct EmptyPlans;

#[async_trait]
impl PlanRepository for EmptyPlans {
    async fn list_visible_to(&self, _: i64) -> Result<Vec<Plan>, PlanError> {
        Ok(vec![])
    }
    async fn list_global(&self) -> Result<Vec<Plan>, PlanError> {
        Ok(vec![])
    }
    async fn find_by_id(&self, _: i64) -> Result<Option<Plan>, PlanError> {
        Ok(None)
    }
    async fn find_effective(&self, _: &str, _: i64) -> Result<Option<Plan>, PlanError> {
        Ok(None)
    }
    async fn create(&self, _: NewPlan) -> Result<Plan, PlanError> {
        unreachable!()
    }
    async fn update(&self, _: i64, _: UpdatePlan) -> Result<Plan, PlanError> {
        unreachable!()
    }
    async fn delete(&self, _: i64) -> Result<(), PlanError> {
        unreachable!()
    }
}

#[tokio::test]
async fn effective_limits_reads_from_catalog_when_available() {
    let lic = StubLicenseRepo {
        plan: LicensePlan::Pro,
    };
    let plans = StubPlanRepo {
        pro_max_pipelines: 999,
    };
    let e = effective_limits(&lic, &plans, 1).await.unwrap();
    assert_eq!(e.source, "catalog");
    assert_eq!(e.limits.max_pipelines, 999);
}

#[tokio::test]
async fn effective_limits_falls_back_to_enum_when_catalog_empty() {
    let lic = StubLicenseRepo {
        plan: LicensePlan::Pro,
    };
    let plans = EmptyPlans;
    let e = effective_limits(&lic, &plans, 1).await.unwrap();
    assert_eq!(e.source, "fallback-enum");
    // Pro enum default — see LicensePlan::limits in crates/domain/src/entities/license.rs.
    assert_eq!(e.limits.max_pipelines, 50);
}

#[test]
fn is_restricted_when_past_due() {
    let sub = LicenseSubscription::new(
        "k",
        LicensePlan::Pro,
        LicenseState::Active,
        Utc::now(),
        None,
        Utc::now(),
    )
    .with_stripe_billing(
        None,
        None,
        None,
        Some("past_due".into()),
        None,
        None,
        false,
        None,
        None,
        None,
    );
    assert!(sub.is_restricted());
}

#[test]
fn is_not_restricted_when_active() {
    let sub = LicenseSubscription::new(
        "k",
        LicensePlan::Pro,
        LicenseState::Active,
        Utc::now(),
        None,
        Utc::now(),
    )
    .with_stripe_billing(
        None,
        None,
        None,
        Some("active".into()),
        None,
        None,
        false,
        None,
        None,
        None,
    );
    assert!(!sub.is_restricted());
}
