interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      payload?.error?.message ?? "Nao foi possivel concluir a operacao.",
      response.status,
      payload?.error?.code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiUrl(path: string) {
  if (isAbsoluteUrl(path) || !apiBaseUrl) {
    return path;
  }

  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === "AUTH_NOT_CONFIGURED") {
      return "A API ainda nao esta configurada para autenticacao neste ambiente.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function createIdempotencyHeaders(): HeadersInit {
  return {
    "Idempotency-Key": crypto.randomUUID(),
  };
}

function normalizeApiBaseUrl(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/\/+$/, "")
    : "";
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
