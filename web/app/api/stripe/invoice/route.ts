import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/api/server";
import type { LicenseStatus } from "@/lib/api/types";
import { retrieveStripeInvoice } from "@/lib/stripe/server";

export const runtime = "nodejs";

function stripeId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export async function GET() {
  try {
    const status = await apiAuthed<LicenseStatus>("/license/status");
    if (!status.latestInvoiceId) {
      return NextResponse.json(
        { error: "no invoice available for current subscription" },
        { status: 404 },
      );
    }

    const invoice = await retrieveStripeInvoice(status.latestInvoiceId);
    const invoiceCustomerId = stripeId(invoice.customer);
    if (
      status.stripeCustomerId &&
      invoiceCustomerId &&
      invoiceCustomerId !== status.stripeCustomerId
    ) {
      return NextResponse.json(
        { error: "invoice does not belong to current customer" },
        { status: 403 },
      );
    }

    const invoiceUrl =
      typeof invoice.invoice_pdf === "string"
        ? invoice.invoice_pdf
        : typeof invoice.hosted_invoice_url === "string"
          ? invoice.hosted_invoice_url
          : null;

    if (!invoiceUrl) {
      return NextResponse.json(
        { error: "Stripe invoice has no downloadable URL yet" },
        { status: 404 },
      );
    }

    return NextResponse.redirect(invoiceUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "invoice download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
