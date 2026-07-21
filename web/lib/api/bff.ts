import "server-only";
import { NextResponse } from "next/server";
import { ApiError } from "./errors";

export function invalidRequest(message = "invalid request") {
  return NextResponse.json({ error: message, code: "invalid_request" }, { status: 400 });
}

export function forbiddenOrigin() {
  return NextResponse.json(
    { error: "untrusted request origin", code: "untrusted_origin" },
    { status: 403 },
  );
}

function bffStatus(status: number): number {
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 502;
}

export function bffFailure(error: unknown, fallback = "No fue posible completar la solicitud.") {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: bffStatus(error.status) },
    );
  }
  return NextResponse.json({ error: fallback, code: "internal_error" }, { status: 500 });
}
