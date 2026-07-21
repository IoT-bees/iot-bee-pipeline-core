export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const message = (body as Record<string, unknown>).error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function friendlyMessage(status: number, _message: string): string {
  void _message;
  if (status === 0) return "No fue posible conectar con el servicio. Inténtalo de nuevo.";
  if (status === 401) return "Tu sesión ya no es válida. Inicia sesión de nuevo.";
  if (status === 402) return "Se alcanzó el límite de tu plan.";
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 404) return "No encontramos ese recurso. Puede haber sido eliminado.";
  if (status === 409) return "La operación entra en conflicto con un registro existente.";
  if (status === 429) return "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";
  if (status >= 500) return "El servicio no pudo completar la solicitud. Inténtalo de nuevo.";
  return "No fue posible completar la solicitud. Revisa los datos e inténtalo de nuevo.";
}

export function responseError(status: number, body: unknown): ApiError {
  const message = errorMessage(body, `La solicitud falló (${status})`);
  const code =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).code === "string"
      ? (body as Record<string, unknown>).code as string
      : `http_${status}`;
  return new ApiError(status, code, friendlyMessage(status, message));
}

export function isRetryableApiError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500)
  );
}
