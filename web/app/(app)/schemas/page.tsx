import { serverFetch } from "@/lib/api/server";
import type { SchemaMap, ValidationSchema } from "@/lib/api/types";
import { SchemasClient } from "./SchemasClient";

interface RawValidationSchema {
  id?: number;
  name: string;
  schema: string;
  createdAt?: string;
  updatedAt?: string;
}

function safeParse(raw: string): SchemaMap {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SchemaMap) : {};
  } catch {
    return {};
  }
}

export default async function SchemasPage() {
  let initialData: ValidationSchema[] | undefined;
  try {
    const raw = await serverFetch<RawValidationSchema[]>("/validation-schemas", {
      revalidate: 30,
    });
    initialData = raw.map((r) => ({
      id: r.id ?? 0,
      name: r.name,
      schema: safeParse(r.schema),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch {
    // Backend unreachable / unauthenticated: client will fetch via React Query.
  }
  return <SchemasClient initialData={initialData} />;
}
