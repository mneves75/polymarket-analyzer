import { RateLimiter } from "./rateLimiter";

export type FetchOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

export class HttpError extends Error {
  status: number;
  url: string;
  body: unknown;

  constructor(status: number, url: string, body: unknown, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

const limiter = new RateLimiter();
const WINDOW_MS = 10_000;
const RATE_LIMITS = [
  { host: "clob.polymarket.com", path: "/book", limit: 1500 },
  { host: "clob.polymarket.com", path: "/books", limit: 500 },
  { host: "clob.polymarket.com", path: "/price", limit: 1500 },
  { host: "clob.polymarket.com", path: "/prices", limit: 500 },
  { host: "clob.polymarket.com", path: "/midpoint", limit: 1500 },
  { host: "clob.polymarket.com", path: "/prices-history", limit: 1000 },
  { host: "clob.polymarket.com", path: "/price_history", limit: 1000 },
  { host: "clob.polymarket.com", path: "/data/trades", limit: 500 },
  { host: "gamma-api.polymarket.com", path: "/events", limit: 500 },
  { host: "gamma-api.polymarket.com", path: "/markets", limit: 300 },
  { host: "data-api.polymarket.com", path: "/positions", limit: 150 },
  { host: "data-api.polymarket.com", path: "/trades", limit: 200 },
  { host: "data-api.polymarket.com", path: "/closed-positions", limit: 150 }
];
const HOST_LIMITS = [
  { host: "clob.polymarket.com", limit: 9000 },
  { host: "gamma-api.polymarket.com", limit: 4000 },
  { host: "data-api.polymarket.com", limit: 1000 }
];

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body, timeoutMs = 10_000, retries = 2 } = options;
  const requestUrl = new URL(url);
  const limitRule = matchRateLimit(requestUrl);
  if (limitRule) await limiter.take(limitRule);

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(requestUrl, {
        method,
        headers: {
          "content-type": "application/json",
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      if (!res.ok) {
        if (shouldRetry(res.status) && attempt < retries) {
          attempt += 1;
          await backoff(attempt);
          continue;
        }
        const bodyPayload = await readErrorBody(res);
        const bodyMessage = errorBodyMessage(bodyPayload);
        const message = bodyMessage
          ? `HTTP ${res.status} ${res.statusText} for ${url}: ${bodyMessage}`
          : `HTTP ${res.status} ${res.statusText} for ${url}`;
        throw new HttpError(res.status, url, bodyPayload, message);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (attempt < retries) {
        attempt += 1;
        await backoff(attempt);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function withQuery(base: string, params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function matchRateLimit(url: URL) {
  const host = url.host;
  const path = url.pathname;
  let best: { host: string; path: string; limit: number } | undefined;

  for (const rule of RATE_LIMITS) {
    if (rule.host !== host) continue;
    if (path.startsWith(rule.path)) {
      if (!best || rule.path.length > best.path.length) best = rule;
    }
  }

  if (best) return { key: `${host}${best.path}`, limit: best.limit, windowMs: WINDOW_MS };
  const hostRule = HOST_LIMITS.find((rule) => rule.host === host);
  if (hostRule) return { key: host, limit: hostRule.limit, windowMs: WINDOW_MS };
  return undefined;
}

async function backoff(attempt: number) {
  const base = 200 * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * 100);
  await new Promise((resolve) => setTimeout(resolve, base + jitter));
}

function shouldRetry(status: number) {
  return status === 429 || status >= 500;
}

export function isNoOrderbookError(err: unknown) {
  const message = extractErrorMessage(err);
  if (!message) return false;
  if (err instanceof HttpError && err.status !== 404) return false;
  return message.toLowerCase().includes("no orderbook exists");
}

function extractErrorMessage(err: unknown) {
  if (!err) return "";
  if (err instanceof HttpError) {
    const bodyMessage = errorBodyMessage(err.body);
    return bodyMessage || err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function readErrorBody(res: Response) {
  const text = await res.text();
  if (!text) return "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorBodyMessage(body: unknown) {
  if (!body) return "";
  if (typeof body === "string") return body.slice(0, 200);
  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message =
      (typeof record.error === "string" && record.error) ||
      (typeof record.message === "string" && record.message) ||
      (typeof record.detail === "string" && record.detail);
    if (message) return message.slice(0, 200);
    try {
      return JSON.stringify(body).slice(0, 200);
    } catch {
      return "[object]";
    }
  }
  return String(body).slice(0, 200);
}
