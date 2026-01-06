/**
 * Polymarket API Response Parsing Utilities
 *
 * This module provides type-safe parsers for Polymarket API responses.
 * It handles the various response formats from Gamma API, CLOB REST API,
 * and Data API with proper type safety and extensibility.
 *
 * ## Type Safety Approach
 *
 * Rather than using Record<string, unknown>, we define proper interfaces
 * for API responses with index signatures for extensibility. This provides:
 * - Type-safe property access
 * - Autocomplete support
 * - Compile-time error detection
 * - Runtime validation for critical fields
 *
 * @module parsers
 */

/**
 * A generic API response with optional fields.
 * Used as base interface for API responses.
 */
interface ApiResponse {
	[key: string]: unknown;
}

/**
 * Orderbook level/entry containing price and size.
 */
export interface OrderbookLevel {
	price: number;
	size: number;
}

/**
 * Orderbook state with bids, asks, and metadata.
 */
export interface OrderbookState {
	bids: OrderbookLevel[];
	asks: OrderbookLevel[];
	minOrderSize?: number;
	tickSize?: number;
	negRisk?: boolean;
}

/**
 * Raw API response that may contain price information.
 */
interface PriceResponse extends ApiResponse {
	price?: unknown;
	best_price?: unknown;
	value?: unknown;
}

/**
 * Raw API response that may contain midpoint information.
 */
interface MidpointResponse extends ApiResponse {
	midpoint?: unknown;
	midpoint_price?: unknown;
	price?: unknown;
	value?: unknown;
}

/**
 * Raw API response that may contain price history.
 */
interface HistoryResponse extends ApiResponse {
	history?: unknown;
	prices?: unknown;
	data?: unknown;
}

/**
 * Raw API response for orderbook data.
 */
interface OrderbookResponse extends ApiResponse {
	bids?: unknown;
	buys?: unknown;
	asks?: unknown;
	sells?: unknown;
	min_order_size?: unknown;
	tick_size?: unknown;
	neg_risk?: unknown;
}

/**
 * Raw API response for holders data.
 */
interface HoldersResponse extends ApiResponse {
	holders?: unknown;
}

/**
 * Individual history/data point.
 */
interface HistoryPoint {
	p?: unknown;
	price?: unknown;
	value?: unknown;
	close?: unknown;
}

/**
 * Extract price from various API response formats.
 *
 * @param response - API response object
 * @returns Parsed price as number, or undefined if not found
 */
export function extractPrice(response: PriceResponse): number | undefined {
	const direct = response.price ?? response.best_price ?? response.value;
	if (direct !== undefined) return asNumber(direct);
	return undefined;
}

/**
 * Extract midpoint from various API response formats.
 *
 * @param response - API response object
 * @returns Parsed midpoint as number, or undefined if not found
 */
export function extractMidpoint(
	response: MidpointResponse,
): number | undefined {
	const direct =
		response.midpoint ??
		response.midpoint_price ??
		response.price ??
		response.value;
	if (direct !== undefined) return asNumber(direct);
	return undefined;
}

/**
 * Extract price history from various API response formats.
 *
 * @param response - API response object
 * @returns Array of price numbers
 */
export function extractHistory(response: HistoryResponse): number[] {
	const raw =
		(response.history as Array<HistoryPoint> | undefined) ||
		(response.prices as Array<HistoryPoint> | undefined) ||
		(response.data as Array<HistoryPoint> | undefined) ||
		[];

	return raw
		.map((point) =>
			asNumber(point?.p ?? point?.price ?? point?.value ?? point?.close),
		)
		.filter((value): value is number => value !== undefined);
}

/**
 * Normalize orderbook from API response.
 *
 * @param response - API response object
 * @returns Normalized orderbook state
 */
export function normalizeOrderbook(
	response: OrderbookResponse,
): OrderbookState {
	const bids = normalizeLevels(
		(response.bids as unknown[]) ?? (response.buys as unknown[]) ?? [],
	);
	const asks = normalizeLevels(
		(response.asks as unknown[]) ?? (response.sells as unknown[]) ?? [],
	);

	const minOrderSize = asNumber(response.min_order_size);
	const tickSize = asNumber(response.tick_size);
	const negRisk =
		response.neg_risk === true
			? true
			: response.neg_risk === false
				? false
				: undefined;

	const result: OrderbookState = {
		bids,
		asks,
	};

	if (minOrderSize !== undefined) result.minOrderSize = minOrderSize;
	if (tickSize !== undefined) result.tickSize = tickSize;
	if (negRisk !== undefined) result.negRisk = negRisk;

	return result;
}

/**
 * Normalize orderbook levels from various formats.
 *
 * Handles both array format [price, size] and object format.
 *
 * @param levels - Raw levels from API
 * @returns Normalized orderbook levels
 */
export function normalizeLevels(levels: unknown[]): OrderbookLevel[] {
	if (!Array.isArray(levels)) return [];

	return levels
		.map((level): OrderbookLevel | null => {
			if (Array.isArray(level)) {
				const price = asNumber(level[0]);
				const size = asNumber(level[1]);
				if (price !== undefined && size !== undefined) {
					return { price, size };
				}
				return null;
			}
			if (level && typeof level === "object") {
				const record = level as Record<string, unknown>;
				const price = asNumber(record.price ?? record.p ?? record.rate);
				const size = asNumber(
					record.size ?? record.s ?? record.amount ?? record.quantity,
				);
				if (price !== undefined && size !== undefined) {
					return { price, size };
				}
				return null;
			}
			return null;
		})
		.filter((level): level is OrderbookLevel => level !== null)
		.filter((level) => level.price !== 0 && level.size !== 0);
}

/**
 * Normalize holders from API response.
 *
 * @param data - API response object (either array or object with holders property)
 * @returns Array of holder objects
 */
export function normalizeHolders(
	data: HoldersResponse | Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
	let holdersArray: Array<Record<string, unknown>>;

	if (Array.isArray(data)) {
		if (data.length === 0) return [];
		const first = data[0];
		if (!first) return [];
		holdersArray =
			(first.holders as Array<Record<string, unknown>> | undefined) ?? [];
	} else {
		holdersArray =
			(data.holders as Array<Record<string, unknown>> | undefined) ?? [];
	}

	return holdersArray;
}

/**
 * Safely convert unknown value to number.
 *
 * @param value - Value to convert
 * @returns Number if conversion successful, undefined otherwise
 */
export function asNumber(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === "number") {
		return Number.isNaN(value) ? undefined : value;
	}
	if (typeof value === "string") {
		const num = Number(value);
		return Number.isNaN(num) ? undefined : num;
	}
	if (typeof value === "bigint") {
		return Number(value);
	}
	return undefined;
}
