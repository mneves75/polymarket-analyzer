export type OrderbookLevel = { price: number; size: number };
export type OrderbookState = {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  minOrderSize?: number;
  tickSize?: number;
  negRisk?: boolean;
};

export function extractPrice(response: Record<string, unknown>) {
  const direct = response.price ?? response.best_price ?? response.value;
  if (direct !== undefined) return asNumber(direct);
  return undefined;
}

export function extractMidpoint(response: Record<string, unknown>) {
  const direct = response.midpoint ?? response.midpoint_price ?? response.price ?? response.value;
  if (direct !== undefined) return asNumber(direct);
  return undefined;
}

export function extractHistory(response: Record<string, unknown>) {
  const raw =
    (response.history as Array<Record<string, unknown>> | undefined) ||
    (response.prices as Array<Record<string, unknown>> | undefined) ||
    (response.data as Array<Record<string, unknown>> | undefined) ||
    ([] as Array<Record<string, unknown>>);

  return raw
    .map((point) => asNumber(point.p ?? point.price ?? point.value ?? point.close))
    .filter((value): value is number => value !== undefined);
}

export function normalizeOrderbook(response: Record<string, unknown>): OrderbookState {
  const bids = normalizeLevels((response.bids as unknown[]) ?? (response.buys as unknown[]) ?? []);
  const asks = normalizeLevels((response.asks as unknown[]) ?? (response.sells as unknown[]) ?? []);

  return {
    bids,
    asks,
    minOrderSize: asNumber(response.min_order_size),
    tickSize: asNumber(response.tick_size),
    negRisk: response.neg_risk === undefined ? undefined : Boolean(response.neg_risk)
  };
}

export function normalizeLevels(levels: unknown[]): OrderbookLevel[] {
  if (!Array.isArray(levels)) return [];
  return levels
    .map((level) => {
      if (Array.isArray(level)) {
        return { price: asNumber(level[0]) ?? 0, size: asNumber(level[1]) ?? 0 };
      }
      if (level && typeof level === "object") {
        const record = level as Record<string, unknown>;
        return {
          price: asNumber(record.price ?? record.p ?? record.rate) ?? 0,
          size: asNumber(record.size ?? record.s ?? record.amount ?? record.quantity) ?? 0
        };
      }
      return null;
    })
    .filter((level): level is OrderbookLevel => level !== null)
    .filter((level) => level.price !== 0 && level.size !== 0);
}

export function normalizeHolders(data: Array<Record<string, unknown>> | Record<string, unknown>) {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0];
    const holders = (first.holders as Array<Record<string, unknown>> | undefined) || [];
    return holders;
  }

  const holders = (data.holders as Array<Record<string, unknown>> | undefined) || [];
  return holders;
}

export function asNumber(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}
