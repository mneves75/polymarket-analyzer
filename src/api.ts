import { CONFIG } from "./config";
import { fetchJson, isNoOrderbookError, withQuery } from "./http";

export type GammaEvent = Record<string, unknown>;
export type GammaMarket = Record<string, unknown>;

export type MarketInfo = {
  eventId?: string;
  eventTitle?: string;
  marketId?: string;
  question?: string;
  conditionId?: string;
  slug?: string;
  outcomes: string[];
  clobTokenIds: string[];
  volume24hr?: number;
  priceChange24hr?: number;
  bestBid?: number;
  bestAsk?: number;
};

export async function fetchEvents(limit = 10, offset = 0) {
  const url = withQuery(`${CONFIG.gammaBase}/events`, {
    limit,
    offset,
    closed: false,
    active: true,
    order: "id",
    ascending: false
  });
  const res = await fetchJson<unknown>(url);
  if (Array.isArray(res)) return res as GammaEvent[];
  const record = res as Record<string, unknown>;
  const list = (record.events as GammaEvent[] | undefined) || (record.data as GammaEvent[] | undefined) || [];
  return list;
}

export async function fetchMarkets(limit = 10, offset = 0) {
  const url = withQuery(`${CONFIG.gammaBase}/markets`, {
    limit,
    offset,
    closed: false,
    active: true,
    order: "id",
    ascending: false
  });
  const res = await fetchJson<unknown>(url);
  if (Array.isArray(res)) return res as GammaMarket[];
  const record = res as Record<string, unknown>;
  const list = (record.markets as GammaMarket[] | undefined) || (record.data as GammaMarket[] | undefined) || [];
  return list;
}

export async function fetchMarketBySlug(slug: string) {
  const res = await fetchJson<unknown>(`${CONFIG.gammaBase}/markets/slug/${slug}`);
  if (res && typeof res === "object" && "market" in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).market as GammaMarket;
  }
  return res as GammaMarket;
}

export async function fetchEventBySlug(slug: string) {
  const res = await fetchJson<unknown>(`${CONFIG.gammaBase}/events/slug/${slug}`);
  if (res && typeof res === "object" && "event" in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).event as GammaEvent;
  }
  return res as GammaEvent;
}

export async function fetchMarketByConditionId(conditionId: string) {
  const url = withQuery(`${CONFIG.gammaBase}/markets`, {
    condition_ids: conditionId,
    limit: 1
  });
  const res = await fetchJson<unknown>(url);
  if (Array.isArray(res)) return res[0] as GammaMarket | undefined;
  const record = res as Record<string, unknown>;
  const list = (record.markets as GammaMarket[] | undefined) || (record.data as GammaMarket[] | undefined) || [];
  return list[0];
}

export function normalizeMarket(market: GammaMarket, event?: GammaEvent): MarketInfo | null {
  const conditionId =
    (market.conditionId as string | undefined) ||
    (market.condition_id as string | undefined) ||
    (market.conditionID as string | undefined);

  const marketId =
    (market.id as string | undefined) ||
    (market.marketId as string | undefined) ||
    (market.market_id as string | undefined);

  const question =
    (market.question as string | undefined) ||
    (market.title as string | undefined) ||
    (event?.title as string | undefined);

  const outcomes = extractOutcomes(market);
  const clobTokenIds = extractTokenIds(market);
  const volume24hr = asNumber(
    market.volume24hr ?? market.volume24h ?? market.volume24hrUsd ?? market.volumeUSD
  );
  const priceChange24hr = asNumber(market.priceChange24hr ?? market.price_change_24hr ?? market.priceChange24h);
  const bestBid = asNumber(market.bestBid ?? market.best_bid);
  const bestAsk = asNumber(market.bestAsk ?? market.best_ask);

  if (!conditionId || clobTokenIds.length === 0) return null;
  const resolvedOutcomes = outcomes.length > 0 ? outcomes : defaultOutcomes(clobTokenIds.length);

  return {
    eventId: (event?.id as string | undefined) || (market.eventId as string | undefined),
    eventTitle: (event?.title as string | undefined),
    marketId,
    question,
    conditionId,
    slug: (market.slug as string | undefined) || (event?.slug as string | undefined),
    outcomes: resolvedOutcomes,
    clobTokenIds,
    volume24hr: volume24hr ?? undefined,
    priceChange24hr: priceChange24hr ?? undefined,
    bestBid: bestBid ?? undefined,
    bestAsk: bestAsk ?? undefined
  };
}

function extractOutcomes(market: GammaMarket): string[] {
  const raw =
    (market.outcomes as string[] | string | undefined) ||
    (market.outcome as string[] | string | undefined);
  const parsed = parseMaybeJsonArray(raw);
  if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);

  const nested = market.tokens as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(nested)) {
    const names = nested
      .map((token) => token.outcome as string | undefined)
      .filter(Boolean);
    if (names.length > 0) return names as string[];
  }

  return [];
}

function defaultOutcomes(count: number) {
  if (count === 2) return ["YES", "NO"];
  return Array.from({ length: count }, (_, idx) => `OUTCOME_${idx + 1}`);
}

function asNumber(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function extractTokenIds(market: GammaMarket): string[] {
  const direct =
    (market.clobTokenIds as string[] | string | undefined) ||
    (market.clob_token_ids as string[] | string | undefined) ||
    (market.clob_token_ids as string[] | string | undefined);
  const parsed = parseMaybeJsonArray(direct);
  if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);

  const nested = market.tokens as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(nested)) {
    const ids = nested
      .map((token) => (token.token_id as string | undefined) || (token.id as string | undefined))
      .filter(Boolean);
    if (ids.length > 0) return ids as string[];
  }

  return [];
}

function parseMaybeJsonArray(value: string[] | string | undefined) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("[")) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function getOrderbook(tokenId: string): Promise<Record<string, unknown>>;
export async function getOrderbook(
  tokenId: string,
  options: { allowNoOrderbook: true }
): Promise<Record<string, unknown> | null>;
export async function getOrderbook(
  tokenId: string,
  options: { allowNoOrderbook?: boolean } = {}
) {
  const url = withQuery(`${CONFIG.clobRestBase}/book`, { token_id: tokenId });
  try {
    return await fetchJson<Record<string, unknown>>(url, { timeoutMs: CONFIG.restTimeoutMs });
  } catch (err) {
    if (options.allowNoOrderbook && isNoOrderbookError(err)) return null;
    throw err;
  }
}

export async function getPrices(tokenId: string): Promise<{ buy: Record<string, unknown>; sell: Record<string, unknown> }>;
export async function getPrices(
  tokenId: string,
  options: { allowNoOrderbook: true }
): Promise<{ buy: Record<string, unknown>; sell: Record<string, unknown> } | null>;
export async function getPrices(
  tokenId: string,
  options: { allowNoOrderbook?: boolean } = {}
) {
  const buy = withQuery(`${CONFIG.clobRestBase}/price`, { token_id: tokenId, side: "BUY" });
  const sell = withQuery(`${CONFIG.clobRestBase}/price`, { token_id: tokenId, side: "SELL" });
  try {
    const [buyRes, sellRes] = await Promise.all([
      fetchJson<Record<string, unknown>>(buy, { timeoutMs: CONFIG.restTimeoutMs }),
      fetchJson<Record<string, unknown>>(sell, { timeoutMs: CONFIG.restTimeoutMs })
    ]);
    return { buy: buyRes, sell: sellRes };
  } catch (err) {
    if (options.allowNoOrderbook && isNoOrderbookError(err)) return null;
    throw err;
  }
}

export async function getMidpoint(tokenId: string) {
  const url = withQuery(`${CONFIG.clobRestBase}/midpoint`, { token_id: tokenId });
  return fetchJson<Record<string, unknown>>(url, { timeoutMs: CONFIG.restTimeoutMs });
}

export async function getPriceHistory(tokenId: string) {
  const baseParams = {
    market: tokenId,
    interval: CONFIG.historyInterval,
    fidelity: CONFIG.historyFidelity
  };

  const url = withQuery(`${CONFIG.clobRestBase}/prices-history`, baseParams);
  try {
    return await fetchJson<Record<string, unknown>>(url, { timeoutMs: CONFIG.restTimeoutMs });
  } catch (err) {
    const fallback = withQuery(`${CONFIG.clobRestBase}/price_history`, baseParams);
    return fetchJson<Record<string, unknown>>(fallback, { timeoutMs: CONFIG.restTimeoutMs });
  }
}

export async function getHolders(conditionId: string, limit = 10) {
  const url = withQuery(`${CONFIG.dataApiBase}/holders`, {
    market: conditionId,
    limit
  });
  return fetchJson<Array<Record<string, unknown>>>(url, { timeoutMs: CONFIG.restTimeoutMs });
}

export async function getTrades(conditionId: string, limit = 10) {
  const url = withQuery(`${CONFIG.dataApiBase}/trades`, {
    market: conditionId,
    limit
  });
  return fetchJson<Record<string, unknown>>(url);
}
