import { CONFIG } from "./config";
import { getHolders, getMidpoint, getOrderbook, getPriceHistory, getPrices } from "./api";
import { loadRadar, resolveMarket, type ResolveOptions } from "./market";
import { asciiSparkline, formatPct, formatPrice, formatNumber, midpointFrom } from "./utils";
import { logError } from "./logger";
import { isNoOrderbookError } from "./http";
import { extractPrice } from "./parsers";

export type DemoOptions = ResolveOptions & {
  intervalMs: number;
};

export async function runSnapshot(opts: DemoOptions) {
  const radar = await loadRadar(opts.limit);
  const market = await resolveMarket(opts, radar);

  if (!market) {
    console.error("No market found.");
    process.exit(1);
  }

  const tokenId = market.clobTokenIds[0];
  let orderbook;
  let prices;
  let midpoint;
  let history;
  let holders;

  const [orderbookRes, pricesRes, midpointRes, historyRes, holdersRes] = await Promise.allSettled([
    getOrderbook(tokenId, { allowNoOrderbook: true }),
    getPrices(tokenId, { allowNoOrderbook: true }),
    getMidpoint(tokenId),
    getPriceHistory(tokenId),
    getHolders(market.conditionId || "", CONFIG.holdersLimit)
  ]);

  if (orderbookRes.status === "fulfilled") {
    orderbook = orderbookRes.value ?? null;
  } else if (!isNoOrderbookError(orderbookRes.reason)) {
    logError("Snapshot orderbook", orderbookRes.reason);
    throw orderbookRes.reason;
  }

  if (pricesRes.status === "fulfilled") {
    prices = pricesRes.value ?? null;
  } else if (!isNoOrderbookError(pricesRes.reason)) {
    logError("Snapshot prices", pricesRes.reason);
    throw pricesRes.reason;
  }

  if (midpointRes.status === "fulfilled") {
    midpoint = midpointRes.value;
  } else if (!isNoOrderbookError(midpointRes.reason)) {
    logError("Snapshot midpoint", midpointRes.reason);
    throw midpointRes.reason;
  } else {
    const bestBid = prices ? extractPrice(prices.buy) : undefined;
    const bestAsk = prices ? extractPrice(prices.sell) : undefined;
    const fallback = midpointFrom(bestBid, bestAsk);
    midpoint = fallback === undefined ? null : { midpoint: fallback };
  }

  if (historyRes.status === "fulfilled") {
    history = historyRes.value;
  } else {
    logError("Snapshot history", historyRes.reason);
    throw historyRes.reason;
  }

  if (holdersRes.status === "fulfilled") {
    holders = holdersRes.value;
  } else {
    logError("Snapshot holders", holdersRes.reason);
    throw holdersRes.reason;
  }

  const snapshot = {
    timestamp: new Date().toISOString(),
    market,
    tokenId,
    prices,
    midpoint,
    orderbook,
    history,
    holders
  };

  console.log(JSON.stringify(snapshot, null, 2));
}

export async function listMarkets(limit = CONFIG.radarLimit, json = false) {
  const radar = await loadRadar(limit);
  if (radar.length === 0) {
    console.log("No markets returned.");
    return;
  }

  if (json) {
    console.log(JSON.stringify(radar, null, 2));
    return;
  }

  radar.forEach((market, idx) => {
    const name = market.question || market.eventTitle || "(no title)";
    const outcome = market.outcomes[0] || "-";
    console.log(`${String(idx + 1).padStart(2, "0")} | ${name} | ${outcome} | ${market.conditionId}`);
  });
}

export function formatPulse({
  lastTrade,
  bestBid,
  bestAsk
}: {
  lastTrade?: number;
  bestBid?: number;
  bestAsk?: number;
}) {
  const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : undefined;
  return {
    lastTrade: formatPrice(lastTrade),
    bestBid: formatPrice(bestBid),
    bestAsk: formatPrice(bestAsk),
    spread: formatPrice(spread),
    bias: lastTrade !== undefined ? formatPct(lastTrade) : "-"
  };
}

export function formatHistory(series: number[]) {
  const spark = asciiSparkline(series, 40);
  const last = series.at(-1);
  return `${spark}  last=${formatPrice(last)}`;
}

export function formatDepth(levels: Array<{ price: number; size: number }>) {
  return levels.map((level) => [formatPrice(level.price), formatNumber(level.size)]);
}
