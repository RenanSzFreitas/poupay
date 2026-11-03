const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor', 0);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error ?? 'Erro inesperado', res.status);
  }

  return data as T;
}