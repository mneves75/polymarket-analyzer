import {
  fetchEventBySlug,
  fetchEvents,
  fetchMarketByConditionId,
  fetchMarketBySlug,
  fetchMarkets,
  normalizeMarket,
  type GammaEvent,
  type GammaMarket,
  type MarketInfo
} from "./api";

export type ResolveOptions = {
  market?: string;
  slug?: string;
  limit: number;
};

export async function loadRadar(limit: number): Promise<MarketInfo[]> {
  const events = await fetchEvents(limit, 0);
  const markets: MarketInfo[] = [];

  for (const event of events) {
    const eventMarkets = asArray(event, "markets");
    for (const market of eventMarkets) {
      const normalized = normalizeMarket(market, event);
      if (normalized) markets.push(normalized);
    }
  }

  if (markets.length > 0) return markets;

  const fallback = await fetchMarkets(limit, 0);
  for (const market of fallback) {
    const normalized = normalizeMarket(market, undefined);
    if (normalized) markets.push(normalized);
  }

  return markets;
}

export async function resolveMarket(opts: ResolveOptions, radar: MarketInfo[]): Promise<MarketInfo | null> {
  if (opts.slug) {
    try {
      const market = await fetchMarketBySlug(opts.slug);
      const normalized = normalizeMarket(market, undefined);
      if (normalized) return normalized;
    } catch (_) {
      // ignore and try event slug
    }

    try {
      const event = await fetchEventBySlug(opts.slug);
      const market = firstMarketFromEvent(event);
      if (market) return market;
    } catch (_) {
      // ignore
    }
  }

  if (opts.market) {
    try {
      const market = await fetchMarketByConditionId(opts.market);
      if (market) {
        const normalized = normalizeMarket(market, undefined);
        if (normalized) return normalized;
      }
    } catch (_) {
      // ignore
    }

    const match = radar.find((item) => item.conditionId === opts.market);
    if (match) return match;
  }

  return radar[0] ?? null;
}

function asArray(event: GammaEvent, key: string) {
  const value = (event as Record<string, unknown>)[key];
  if (Array.isArray(value)) return value as GammaMarket[];
  return [];
}

function firstMarketFromEvent(event: GammaEvent): MarketInfo | null {
  const markets = asArray(event, "markets");
  for (const market of markets) {
    const normalized = normalizeMarket(market, event);
    if (normalized) return normalized;
  }
  return null;
}
