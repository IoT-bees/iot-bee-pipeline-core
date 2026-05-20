use domain::notifications::outbound::notifier::EmailMessage;

pub fn invite(to: &str, inviter_name: &str, accept_url: &str) -> EmailMessage {
    EmailMessage {
        to: to.to_string(),
        subject: "you've been invited to iot bees".into(),
        html: format!(
            "<p>{inviter_name} invited you to join their iot bees workspace.</p>\
             <p><a href=\"{accept_url}\">Accept the invitation</a></p>"
        ),
        text: format!("{inviter_name} invited you. Accept: {accept_url}"),
    }
}

pub fn password_reset(to: &str, reset_url: &str) -> EmailMessage {
    EmailMessage {
        to: to.to_string(),
        subject: "reset your iot bees password".into(),
        html: format!(
            "<p>You requested a password reset.</p>\
             <p><a href=\"{reset_url}\">Reset password</a></p>\
             <p>If you didn't, you can ignore this email.</p>"
        ),
        text: format!("Reset your iot bees password: {reset_url}"),
    }
}

pub fn payment_failed(to: &str, plan: &str, update_url: &str) -> EmailMessage {
    EmailMessage {
        to: to.to_string(),
        subject: "payment failed — iot bees subscription".into(),
        html: format!(
            "<p>Your last payment for the {plan} plan was declined.</p>\
             <p><a href=\"{update_url}\">Update your payment method</a></p>\
             <p>Your pipelines will keep running for the current period.</p>"
        ),
        text: format!("Payment failed. Update card: {update_url}"),
    }
}

pub fn suspension(to: &str, reason: &str) -> EmailMessage {
    EmailMessage {
        to: to.to_string(),
        subject: "your iot bees account was suspended".into(),
        html: format!(
            "<p>Your iot bees account was suspended.</p>\
             <p><strong>Reason:</strong> {reason}</p>\
             <p>Reply to this email if you think this is a mistake.</p>"
        ),
        text: format!("Account suspended. Reason: {reason}"),
    }
}
