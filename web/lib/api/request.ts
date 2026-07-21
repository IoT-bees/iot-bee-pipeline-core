import { ApiError, responseError } from "./errors";

export type ResponseValidator<T> = (value: unknown) => T;

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Shared JSON transport. Authentication and the target URL stay outside it. */
export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
  validate?: ResponseValidator<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ApiError(504, "backend_timeout", "El servicio tardó demasiado en responder.");
    }
    throw new ApiError(0, "network_error", "No fue posible conectar con el servicio.");
  }

  const raw = await response.text();
  const body = raw ? parseJson(raw) : null;
  if (!response.ok) throw responseError(response.status, body);
  if (!raw) return undefined as T;
  if (body === undefined) {
    throw new ApiError(502, "invalid_response", "El servicio devolvió una respuesta inválida.");
  }

  try {
    return validate ? validate(body) : (body as T);
  } catch {
    throw new ApiError(502, "invalid_response", "El servicio devolvió una respuesta inválida.");
  }
}
