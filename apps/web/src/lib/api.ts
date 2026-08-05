interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
let refreshPromise: Promise<boolean> | null = null;

interface ApiRequestOptions {
  retryOnUnauthorized?: boolean;
}

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

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await makeApiFetch(path, init);

  if (
    response.status === 401 &&
    options.retryOnUnauthorized !== false &&
    !isAuthEndpoint(path)
  ) {
    const refreshed = await refreshAuthFromCookie();

    if (refreshed) {
      return handleApiResponse<T>(await makeApiFetch(path, init));
    }
  }

  return handleApiResponse<T>(response);
}

async function makeApiFetch(path: string, init: RequestInit) {
  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

async function handleApiResponse<T>(response: Response): Promise<T> {
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

export async function refreshAuthFromCookie(): Promise<boolean> {
  refreshPromise ??= fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
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

function isAuthEndpoint(path: string) {
  return apiUrl(path).includes("/api/auth/");
}
