import { CONFIG } from "./config";
import { fetchJson, isNoOrderbookError, withQuery } from "./http";
import { GammaMarketSchema, validateWithSchema } from "./schemas";

/**
 * Polymarket Gamma API Event type.
 *
 * The API response is flexible and may contain fields with different naming conventions.
 * This interface captures known fields while allowing for extensibility via index signature.
 */
export interface GammaEvent {
	/** Unique event identifier */
	id?: string;
	/** URL-friendly slug for the event */
	slug?: string;
	/** Event display title */
	title?: string;
	/** Detailed event description */
	description?: string;
	/** Event start date (ISO string) */
	start_date?: string;
	startDate?: string;
	/** Event end date (ISO string) */
	end_date?: string;
	endDate?: string;
	/** Array of markets associated with this event */
	markets?: GammaMarket[];
	/** Event ID (alternative naming) */
	event_id?: string;
	eventId?: string;
	/** Whether the event is active */
	active?: boolean;
	/** Whether the event is closed */
	closed?: boolean;
	/** Number of markets in event */
	market_count?: number;
	marketCount?: number;
	/** Volume traded across all markets */
	volume?: number | string;
	/** Total liquidity */
	liquidity?: number | string;
	/** Tag/category for the event */
	tag?: string;
	/** Icon URL for the event */
	icon?: string;
	/** Image URL for the event */
	image?: string;
	/** Allow unknown fields for API extensibility */
	[unknownField: string]: unknown;
}

/**
 * Polymarket Gamma API Market type.
 *
 * The API response is flexible and may contain fields with different naming conventions.
 * This interface captures known fields while allowing for extensibility.
 */
export interface GammaMarket {
	/** Unique market identifier */
	id?: string;
	/** Polymarket condition ID (critical for orders/trading) */
	conditionId?: string;
	condition_id?: string;
	conditionID?: string;
	/** Market question/title */
	question?: string;
	title?: string;
	/** Market description */
	description?: string;
	/** URL-friendly slug */
	slug?: string;
	/** Possible outcomes for this market */
	outcomes?: string[] | string;
	outcome?: string[] | string;
	/** CLOB token IDs for trading */
	clobTokenIds?: string[] | string;
	clob_token_ids?: string[] | string;
	/** Nested token information */
	tokens?: Array<{
		token_id?: string;
		id?: string;
		outcome?: string;
		price?: number | string;
	}>;
	/** 24h trading volume */
	volume24hr?: number | string;
	volume24h?: number | string;
	volume24hrUsd?: number | string;
	volumeUSD?: number | string;
	/** 24h price change */
	priceChange24hr?: number | string;
	price_change_24hr?: number | string;
	priceChange24h?: number | string;
	/** Current best bid price */
	bestBid?: number | string;
	best_bid?: number | string;
	/** Current best ask price */
	bestAsk?: number | string;
	best_ask?: number | string;
	/** Associated event ID */
	eventId?: string;
	event_id?: string;
	/** Event slug */
	eventSlug?: string;
	/** Whether market is active */
	active?: boolean;
	/** Whether market is closed */
	closed?: boolean;
	/** Market end time */
	endTime?: string;
	end_time?: string;
	/** Allow unknown fields for API extensibility */
	[unknownField: string]: unknown;
}

/**
 * Normalized market information used throughout the application.
 *
 * This type provides a consistent interface for market data regardless of
 * the underlying API response format.
 */
export interface MarketInfo {
	/** Associated event ID */
	eventId?: string;
	/** Event display title */
	eventTitle?: string;
	/** Market ID (internal) */
	marketId?: string;
	/** Market question/title */
	question?: string;
	/** Polymarket condition ID (required for trading) */
	conditionId?: string;
	/** URL-friendly slug */
	slug?: string;
	/** Normalized outcome names (e.g., ["YES", "NO"]) */
	outcomes: string[];
	/** CLOB token IDs for each outcome */
	clobTokenIds: string[];
	/** 24h trading volume in USD */
	volume24hr?: number;
	/** 24h price change percentage */
	priceChange24hr?: number;
	/** Current best bid price */
	bestBid?: number;
	/** Current best ask price */
	bestAsk?: number;
	/** Market end/close date (ISO string) */
	endDate?: string;
}

/**
 * CLOB Orderbook response type.
 *
 * Represents the current state of the order book for a token.
 */
export interface Orderbook {
	/** Array of bid levels (price, size) */
	bids?: Array<{ price: number | string; size: number | string }>;
	/** Array of ask levels (price, size) */
	asks?: Array<{ price: number | string; size: number | string }>;
	/** Token ID */
	token_id?: string;
	tokenId?: string;
	/** Timestamp of orderbook snapshot */
	timestamp?: number | string;
	/** Allow unknown fields */
	[unknownField: string]: unknown;
}

/**
 * CLOB Price response type.
 *
 * Represents the current price for a specific side (BUY/SELL).
 */
export interface PriceResponse {
	/** Current price */
	price?: number | string;
	/** Token ID */
	token_id?: string;
	tokenId?: string;
	/** Side (BUY or SELL) */
	side?: "BUY" | "SELL";
	/** Timestamp */
	timestamp?: number | string;
	/** Allow unknown fields */
	[unknownField: string]: unknown;
}

/**
 * CLOB Midpoint response type.
 *
 * Represents the calculated midpoint price.
 */
export interface MidpointResponse {
	/** Midpoint price */
	midpoint?: number | string;
	/** Token ID */
	token_id?: string;
	tokenId?: string;
	/** Timestamp */
	timestamp?: number | string;
	/** Allow unknown fields */
	[unknownField: string]: unknown;
}

/**
 * Price History response type.
 *
 * Historical price data over time.
 */
export interface PriceHistory {
	/** Array of price data points */
	prices?: Array<{
		price?: number | string;
		timestamp?: number | string;
		side?: "BUY" | "SELL";
	}>;
	/** Token ID / Market */
	market?: string;
	token_id?: string;
	/** Time interval between data points */
	interval?: string;
	/** Allow unknown fields */
	[unknownField: string]: unknown;
}

/**
 * Holder information response type.
 *
 * Data about token holders and their positions.
 */
export interface HolderInfo {
	/** Array of holder records */
	holders?: Array<{
		address?: string;
		quantity?: number | string;
		usd_value?: number | string;
		usdValue?: number | string;
	}>;
	/** Market/condition ID */
	market?: string;
	condition_id?: string;
	/** Total number of holders */
	total_holders?: number;
	totalHolders?: number;
	/** Allow unknown fields */
	[unknownField: string]: unknown;
}

/**
 * Trade information response type.
 *
 * Recent trades for a market.
 */
export interface TradeInfo {
	/** Array of trade records */
	trades?: Array<{
		trade_id?: string;
		tradeId?: string;
		side?: "BUY" | "SELL";
		price?: number | string;
		size?: number | string;
		timestamp?: number | string;
		creator?: string;
		matcher?: string;
	}>;
	/** Market/condition ID */
	market?: string;
	condition_id?: string;
	/** Allow unknown fields */
	[unknownField: string]: unknown;
}

/**
 * Fetch events from the Gamma API.
 *
 * @param limit - Maximum number of events to return (default: 10)
 * @param offset - Number of events to skip (default: 0)
 * @returns Array of GammaEvent objects
 *
 * @example
 * const events = await fetchEvents(20, 0);
 * console.log(`Found ${events.length} events`);
 */
export async function fetchEvents(
	limit = 10,
	offset = 0,
): Promise<GammaEvent[]> {
	const url = withQuery(`${CONFIG.gammaBase}/events`, {
		limit,
		offset,
		closed: false,
		active: true,
		order: "volume24hr",
		ascending: false,
	});
	const res = await fetchJson<unknown>(url);

	// Handle different response formats from the API
	if (Array.isArray(res)) return res as GammaEvent[];

	const record = res as Record<string, unknown>;
	const list =
		(record.events as GammaEvent[] | undefined) ||
		(record.data as GammaEvent[] | undefined) ||
		[];
	return list;
}

/**
 * Fetch markets from the Gamma API.
 *
 * @param limit - Maximum number of markets to return (default: 10)
 * @param offset - Number of markets to skip (default: 0)
 * @returns Array of GammaMarket objects
 *
 * @example
 * const markets = await fetchMarkets(50, 0);
 * console.log(`Found ${markets.length} markets`);
 */
export async function fetchMarkets(
	limit = 10,
	offset = 0,
): Promise<GammaMarket[]> {
	const url = withQuery(`${CONFIG.gammaBase}/markets`, {
		limit,
		offset,
		closed: false,
		active: true,
		order: "volume24hr",
		ascending: false,
	});
	const res = await fetchJson<unknown>(url);

	// Handle different response formats from the API
	let markets: GammaMarket[];
	if (Array.isArray(res)) {
		markets = res as GammaMarket[];
	} else {
		const record = res as Record<string, unknown>;
		markets =
			(record.markets as GammaMarket[] | undefined) ||
			(record.data as GammaMarket[] | undefined) ||
			[];
	}

	// Validate markets if validation is enabled
	if (CONFIG.enableValidation) {
		return markets.map((market) =>
			validateWithSchema(
				GammaMarketSchema,
				market,
				`fetchMarkets market ${market.conditionId ?? "unknown"}`,
			),
		);
	}

	return markets;
}

/**
 * Fetch a single market by its slug.
 *
 * @param slug - URL-friendly market slug
 * @returns GammaMarket object
 *
 * @example
 * const market = await fetchMarketBySlug("will-trump-win-2024");
 */
export async function fetchMarketBySlug(slug: string): Promise<GammaMarket> {
	const res = await fetchJson<unknown>(
		`${CONFIG.gammaBase}/markets/slug/${slug}`,
	);

	// API may return { market: {...} } or just the market object
	if (
		res &&
		typeof res === "object" &&
		"market" in (res as Record<string, unknown>)
	) {
		return (res as Record<string, unknown>).market as GammaMarket;
	}
	return res as GammaMarket;
}

/**
 * Fetch a single event by its slug.
 *
 * @param slug - URL-friendly event slug
 * @returns GammaEvent object
 *
 * @example
 * const event = await fetchEventBySlug("us-elections-2024");
 */
export async function fetchEventBySlug(slug: string): Promise<GammaEvent> {
	const res = await fetchJson<unknown>(
		`${CONFIG.gammaBase}/events/slug/${slug}`,
	);

	// API may return { event: {...} } or just the event object
	if (
		res &&
		typeof res === "object" &&
		"event" in (res as Record<string, unknown>)
	) {
		return (res as Record<string, unknown>).event as GammaEvent;
	}
	return res as GammaEvent;
}

/**
 * Fetch a market by its Polymarket condition ID.
 *
 * @param conditionId - Polymarket condition ID (0x-prefixed hex string)
 * @returns GammaMarket object or undefined if not found
 *
 * @example
 * const market = await fetchMarketByConditionId("0x1234...");
 * if (market) {
 *   console.log(`Found: ${market.question}`);
 * }
 */
export async function fetchMarketByConditionId(
	conditionId: string,
): Promise<GammaMarket | undefined> {
	const url = withQuery(`${CONFIG.gammaBase}/markets`, {
		condition_ids: conditionId,
		limit: 1,
	});
	const res = await fetchJson<unknown>(url);

	if (Array.isArray(res)) return res[0] as GammaMarket | undefined;

	const record = res as Record<string, unknown>;
	const list =
		(record.markets as GammaMarket[] | undefined) ||
		(record.data as GammaMarket[] | undefined) ||
		[];
	return list[0];
}

/**
 * Normalize a GammaMarket into a consistent MarketInfo format.
 *
 * This function handles the various naming conventions and data formats
 * that the Polymarket API may return, providing a consistent interface.
 *
 * @param market - Raw market data from the API
 * @param event - Optional event data (if market was fetched from event endpoint)
 * @returns Normalized MarketInfo, or null if required fields are missing
 *
 * @example
 * const markets = await fetchMarkets(10);
 * const normalized = markets
 *   .map(m => normalizeMarket(m))
 *   .filter((m): m is MarketInfo => m !== null);
 */
export function normalizeMarket(
	market: GammaMarket,
	event?: GammaEvent,
): MarketInfo | null {
	// Extract conditionId from various possible field names
	const conditionId =
		(market.conditionId as string | undefined) ||
		(market.condition_id as string | undefined) ||
		(market.conditionID as string | undefined);

	// Extract marketId from various possible field names
	const marketId =
		(market.id as string | undefined) ||
		(market.marketId as string | undefined) ||
		(market.market_id as string | undefined);

	// Extract question/title from various possible fields
	const question =
		(market.question as string | undefined) ||
		(market.title as string | undefined) ||
		(event?.title as string | undefined);

	// Extract and normalize outcomes
	const outcomes = extractOutcomes(market);
	const clobTokenIds = extractTokenIds(market);

	// Parse numeric fields (handle both number and string formats)
	const volume24hr = asNumber(
		market.volume24hr ??
			market.volume24h ??
			market.volume24hrUsd ??
			market.volumeUSD,
	);
	const priceChange24hr = asNumber(
		market.priceChange24hr ?? market.price_change_24hr ?? market.priceChange24h,
	);
	const bestBid = asNumber(market.bestBid ?? market.best_bid);
	const bestAsk = asNumber(market.bestAsk ?? market.best_ask);

	// Condition ID and token IDs are required
	if (!conditionId || clobTokenIds.length === 0) return null;

	// Use default outcomes if none provided
	const resolvedOutcomes =
		outcomes.length > 0 ? outcomes : defaultOutcomes(clobTokenIds.length);

	const result: MarketInfo = {
		outcomes: resolvedOutcomes,
		clobTokenIds,
	};

	const eventId =
		(event?.id as string | undefined) || (market.eventId as string | undefined);
	if (eventId !== undefined) result.eventId = eventId;

	const eventTitle = event?.title as string | undefined;
	if (eventTitle !== undefined) result.eventTitle = eventTitle;

	if (marketId !== undefined) result.marketId = marketId;
	if (question !== undefined) result.question = question;
	if (conditionId !== undefined) result.conditionId = conditionId;

	const slug =
		(market.slug as string | undefined) || (event?.slug as string | undefined);
	if (slug !== undefined) result.slug = slug;

	if (volume24hr !== undefined) result.volume24hr = volume24hr;
	if (priceChange24hr !== undefined) result.priceChange24hr = priceChange24hr;
	if (bestBid !== undefined) result.bestBid = bestBid;
	if (bestAsk !== undefined) result.bestAsk = bestAsk;

	// Extract end date from market or event
	const endDate =
		(market.endDate as string | undefined) ||
		(market.end_date as string | undefined) ||
		(market.endTime as string | undefined) ||
		(market.end_time as string | undefined) ||
		(event?.endDate as string | undefined) ||
		(event?.end_date as string | undefined);
	if (endDate !== undefined) result.endDate = endDate;

	return result;
}

/**
 * Extract outcome names from a market object.
 *
 * Handles multiple formats:
 * - outcomes array: ["YES", "NO"]
 * - outcomes JSON string: '["YES", "NO"]'
 * - Nested in tokens array
 *
 * @param market - Raw market data
 * @returns Array of outcome names
 */
function extractOutcomes(market: GammaMarket): string[] {
	// Try direct outcomes field first
	const raw =
		(market.outcomes as string[] | string | undefined) ||
		(market.outcome as string[] | string | undefined);
	const parsed = parseMaybeJsonArray(raw);
	if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);

	// Try nested in tokens array
	const nested = market.tokens as Array<Record<string, unknown>> | undefined;
	if (Array.isArray(nested)) {
		const names = nested
			.map((token) => token.outcome as string | undefined)
			.filter(Boolean);
		if (names.length > 0) return names as string[];
	}

	return [];
}

/**
 * Generate default outcome names when none are provided.
 *
 * @param count - Number of outcomes needed
 * @returns Array of default outcome names
 */
function defaultOutcomes(count: number): string[] {
	if (count === 2) return ["YES", "NO"];
	return Array.from({ length: count }, (_, idx) => `OUTCOME_${idx + 1}`);
}

/**
 * Safely convert a value to a number.
 *
 * @param value - Value to convert (number, string, or undefined/null)
 * @returns Number if conversion succeeded, undefined otherwise
 */
function asNumber(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	const num = Number(value);
	return Number.isNaN(num) ? undefined : num;
}

/**
 * Extract CLOB token IDs from a market object.
 *
 * Handles multiple formats:
 * - clobTokenIds array: ["0x123...", "0x456..."]
 * - clobTokenIds JSON string: '["0x123...", "0x456..."]'
 * - Nested in tokens array with token_id or id fields
 *
 * @param market - Raw market data
 * @returns Array of token IDs (hex strings)
 */
function extractTokenIds(market: GammaMarket): string[] {
	// Try direct clobTokenIds field (camelCase and snake_case variants)
	const direct =
		(market.clobTokenIds as string[] | string | undefined) ||
		(market.clob_token_ids as string[] | string | undefined);
	const parsed = parseMaybeJsonArray(direct);
	if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);

	// Try nested in tokens array
	const nested = market.tokens as Array<Record<string, unknown>> | undefined;
	if (Array.isArray(nested)) {
		const ids = nested
			.map(
				(token) =>
					(token.token_id as string | undefined) ||
					(token.id as string | undefined),
			)
			.filter(Boolean);
		if (ids.length > 0) return ids as string[];
	}

	return [];
}

/**
 * Parse a value that may be a JSON array string.
 *
 * @param value - Value to parse (array, string, or undefined)
 * @returns Parsed array, or undefined if parsing fails
 */
function parseMaybeJsonArray(value: string[] | string | undefined): unknown {
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

/**
 * Fetch the order book for a token.
 *
 * @param tokenId - CLOB token ID
 * @returns Orderbook object
 * @throws HttpError if orderbook doesn't exist and allowNoOrderbook is false
 *
 * @example
 * const orderbook = await getOrderbook("0x123...");
 * console.log(`Bids: ${orderbook.bids?.length}`);
 */
export async function getOrderbook(
	tokenId: string,
): Promise<Record<string, unknown>>;

/**
 * Fetch the order book for a token, returning null if it doesn't exist.
 *
 * @param tokenId - CLOB token ID
 * @param options.allowNoOrderbook - If true, return null instead of throwing for missing orderbooks
 * @param options.signal - AbortSignal for request cancellation
 * @returns Orderbook object or null
 *
 * @example
 * const orderbook = await getOrderbook("0x123...", { allowNoOrderbook: true });
 * if (orderbook) {
 *   console.log(`Bids: ${orderbook.bids?.length}`);
 * }
 */
export async function getOrderbook(
	tokenId: string,
	options: { allowNoOrderbook: true; signal?: AbortSignal },
): Promise<Record<string, unknown> | null>;

/**
 * Fetch the order book for a token.
 *
 * @param tokenId - CLOB token ID
 * @param options - Optional configuration
 * @returns Orderbook object or null
 */
export async function getOrderbook(
	tokenId: string,
	options: { allowNoOrderbook?: boolean; signal?: AbortSignal } = {},
): Promise<Record<string, unknown> | null> {
	const url = withQuery(`${CONFIG.clobRestBase}/book`, { token_id: tokenId });
	try {
		return await fetchJson<Record<string, unknown>>(url, {
			timeoutMs: CONFIG.restTimeoutMs,
			signal: options.signal,
		});
	} catch (err) {
		if (options.allowNoOrderbook && isNoOrderbookError(err)) return null;
		throw err;
	}
}

/**
 * Fetch current buy and sell prices for a token.
 *
 * @param tokenId - CLOB token ID
 * @returns Object with buy and sell price responses
 * @throws HttpError if prices cannot be fetched and allowNoOrderbook is false
 *
 * @example
 * const prices = await getPrices("0x123...");
 * console.log(`Buy: ${prices.buy.price}, Sell: ${prices.sell.price}`);
 */
export async function getPrices(
	tokenId: string,
): Promise<{ buy: Record<string, unknown>; sell: Record<string, unknown> }>;

/**
 * Fetch current buy and sell prices for a token, returning null on error.
 *
 * @param tokenId - CLOB token ID
 * @param options.allowNoOrderbook - If true, return null instead of throwing
 * @param options.signal - AbortSignal for request cancellation
 * @returns Price responses or null
 */
export async function getPrices(
	tokenId: string,
	options: { allowNoOrderbook: true; signal?: AbortSignal },
): Promise<{
	buy: Record<string, unknown>;
	sell: Record<string, unknown>;
} | null>;

/**
 * Fetch current buy and sell prices for a token.
 *
 * @param tokenId - CLOB token ID
 * @param options - Optional configuration
 * @returns Price responses or null
 */
export async function getPrices(
	tokenId: string,
	options: { allowNoOrderbook?: boolean; signal?: AbortSignal } = {},
): Promise<{
	buy: Record<string, unknown>;
	sell: Record<string, unknown>;
} | null> {
	const buy = withQuery(`${CONFIG.clobRestBase}/price`, {
		token_id: tokenId,
		side: "BUY",
	});
	const sell = withQuery(`${CONFIG.clobRestBase}/price`, {
		token_id: tokenId,
		side: "SELL",
	});

	try {
		const [buyRes, sellRes] = await Promise.all([
			fetchJson<Record<string, unknown>>(buy, {
				timeoutMs: CONFIG.restTimeoutMs,
				signal: options.signal,
			}),
			fetchJson<Record<string, unknown>>(sell, {
				timeoutMs: CONFIG.restTimeoutMs,
				signal: options.signal,
			}),
		]);
		return { buy: buyRes, sell: sellRes };
	} catch (err) {
		if (options.allowNoOrderbook && isNoOrderbookError(err)) return null;
		throw err;
	}
}

/**
 * Fetch the calculated midpoint price for a token.
 *
 * The midpoint is the average of the best bid and best ask prices.
 *
 * @param tokenId - CLOB token ID
 * @param options.signal - AbortSignal for request cancellation
 * @returns Midpoint response object
 *
 * @example
 * const midpoint = await getMidpoint("0x123...");
 * console.log(`Midpoint: ${midpoint.midpoint}`);
 */
export async function getMidpoint(
	tokenId: string,
	options: { signal?: AbortSignal } = {},
): Promise<Record<string, unknown>> {
	const url = withQuery(`${CONFIG.clobRestBase}/midpoint`, {
		token_id: tokenId,
	});
	return fetchJson<Record<string, unknown>>(url, {
		timeoutMs: CONFIG.restTimeoutMs,
		signal: options.signal,
	});
}

/**
 * Fetch price history for a token.
 *
 * Races both endpoints in parallel and returns the first successful response.
 * The losing request is aborted to save bandwidth (Bug fix #3).
 *
 * @param tokenId - CLOB token ID
 * @param options.signal - AbortSignal for request cancellation
 * @returns Price history response object
 *
 * @example
 * const history = await getPriceHistory("0x123...");
 * console.log(`Price points: ${history.prices?.length}`);
 */
export async function getPriceHistory(
	tokenId: string,
	options: { signal?: AbortSignal } = {},
): Promise<Record<string, unknown>> {
	const baseParams = {
		market: tokenId,
		interval: CONFIG.historyInterval,
		fidelity: CONFIG.historyFidelity,
	};

	const primaryUrl = withQuery(
		`${CONFIG.clobRestBase}/prices-history`,
		baseParams,
	);
	const fallbackUrl = withQuery(
		`${CONFIG.clobRestBase}/price_history`,
		baseParams,
	);

	// Internal abort controller to cancel the losing request (Bug fix #3)
	const raceAbort = new AbortController();

	// Link external signal to internal controller
	const abortHandler = () => raceAbort.abort();
	options.signal?.addEventListener("abort", abortHandler);

	// Race both endpoints in parallel - first success wins
	const primary = fetchJson<Record<string, unknown>>(primaryUrl, {
		timeoutMs: CONFIG.restTimeoutMs,
		signal: raceAbort.signal,
	});
	const fallback = fetchJson<Record<string, unknown>>(fallbackUrl, {
		timeoutMs: CONFIG.restTimeoutMs,
		signal: raceAbort.signal,
	});

	try {
		// Promise.any returns first fulfilled promise, ignoring rejections
		const result = await Promise.any([primary, fallback]);
		// Abort the loser to save bandwidth
		raceAbort.abort();
		return result;
	} catch (err) {
		// Clean up on error
		raceAbort.abort();
		// AggregateError means both failed - throw the first error
		if (err instanceof AggregateError && err.errors.length > 0) {
			throw err.errors[0];
		}
		throw err;
	} finally {
		options.signal?.removeEventListener("abort", abortHandler);
	}
}

/**
 * Fetch token holders information for a market.
 *
 * @param conditionId - Polymarket condition ID
 * @param limit - Maximum number of holders to return (default: 10)
 * @returns Holders information response
 *
 * @example
 * const holders = await getHolders("0x123...", 20);
 * console.log(`Total holders: ${holders.total_holders || holders.holders?.length}`);
 */
export async function getHolders(
	conditionId: string,
	limit = 10,
): Promise<Array<Record<string, unknown>>> {
	const url = withQuery(`${CONFIG.dataApiBase}/holders`, {
		market: conditionId,
		limit,
	});
	return fetchJson<Array<Record<string, unknown>>>(url, {
		timeoutMs: CONFIG.restTimeoutMs,
	});
}

/**
 * Fetch recent trades for a market.
 *
 * @param conditionId - Polymarket condition ID
 * @param limit - Maximum number of trades to return (default: 10)
 * @returns Trades information response
 *
 * @example
 * const trades = await getTrades("0x123...", 50);
 * console.log(`Recent trades: ${trades.trades?.length}`);
 */
export async function getTrades(
	conditionId: string,
	limit = 10,
): Promise<Record<string, unknown>> {
	const url = withQuery(`${CONFIG.dataApiBase}/trades`, {
		market: conditionId,
		limit,
	});
	return fetchJson<Record<string, unknown>>(url);
}
