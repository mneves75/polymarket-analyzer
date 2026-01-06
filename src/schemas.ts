/**
 * Zod schemas for runtime validation of Polymarket API data.
 *
 * These schemas are used to validate external API responses at the boundaries,
 * ensuring type safety and providing clear error messages when data doesn't match.
 */

import { z } from "zod";

/**
 * Helper to create a branded type Zod schema.
 * Validates that the value matches the branded type constructor.
 */
function createBrandedSchema<T>(
	brandedTypeConstructor: (val: string) => T,
	typeName: string,
) {
	return z.string().transform((val, ctx) => {
		try {
			return brandedTypeConstructor(val);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Invalid ${typeName}: ${message}`,
			});
			return z.NEVER;
		}
	});
}

/**
 * Zod schema for TokenId branded type.
 */
export const TokenIdSchema = createBrandedSchema((val) => {
	// Reuse the validation logic from types.ts
	if (typeof val !== "string") {
		throw new Error(`expected string, got ${typeof val}`);
	}
	if (val !== val.trim()) {
		throw new Error(`cannot contain leading or trailing whitespace`);
	}
	if (!val.startsWith("0x")) {
		throw new Error(`must start with '0x'`);
	}
	if (val.length < 10 || val.length > 66) {
		throw new Error(`invalid length ${val.length}, expected 10-66`);
	}
	return val as import("./types").TokenId;
}, "TokenId");

/**
 * Zod schema for ConditionId branded type.
 */
export const ConditionIdSchema = createBrandedSchema((val) => {
	if (typeof val !== "string") {
		throw new Error(`expected string, got ${typeof val}`);
	}
	if (val !== val.trim()) {
		throw new Error(`cannot contain leading or trailing whitespace`);
	}
	if (!val.startsWith("0x")) {
		throw new Error(`must start with '0x'`);
	}
	if (val.length !== 66) {
		throw new Error(`invalid length ${val.length}, expected 66`);
	}
	return val as import("./types").ConditionId;
}, "ConditionId");

/**
 * Zod schema for MarketId branded type.
 */
export const MarketIdSchema = z.union([
	createBrandedSchema((val) => {
		// Hex format
		if (val.length < 10 || val.length > 66) {
			throw new Error(`invalid hex length ${val.length}`);
		}
		return val as import("./types").MarketId;
	}, "MarketId"),
	createBrandedSchema((val) => {
		// Slug format
		if (!/^[a-z0-9-_]+$/.test(val)) {
			throw new Error(`invalid slug format`);
		}
		return val as import("./types").MarketId;
	}, "MarketId"),
]);

/**
 * Zod schema for GammaEvent API response.
 * Validates the flexible API response structure.
 */
export const GammaEventSchema: z.ZodType<import("./api").GammaEvent> = z.object(
	{
		id: z.string().optional(),
		slug: z.string().optional(),
		title: z.string().optional(),
		description: z.string().optional(),
		start_date: z.string().optional(),
		startDate: z.string().optional(),
		end_date: z.string().optional(),
		endDate: z.string().optional(),
		markets: z.array(z.lazy(() => GammaMarketSchema)).optional(),
		event_id: z.string().optional(),
		eventId: z.string().optional(),
		active: z.boolean().optional(),
		closed: z.boolean().optional(),
		market_count: z.number().optional(),
		marketCount: z.number().optional(),
		volume: z.union([z.number(), z.string()]).optional(),
		liquidity: z.union([z.number(), z.string()]).optional(),
		tag: z.string().optional(),
		icon: z.string().optional(),
		image: z.string().optional(),
	},
);

/**
 * Zod schema for GammaMarket API response.
 */
export const GammaMarketSchema: z.ZodType<import("./api").GammaMarket> =
	z.object({
		conditionId: ConditionIdSchema.optional(),
		question: z.string().optional(),
		outcomes: z.array(z.string()).optional(),
		slug: z.string().optional(),
		tokens: z
			.array(
				z.object({
					tokenId: TokenIdSchema.optional(),
					outcome: z.string().optional(),
				}),
			)
			.optional(),
		clobTokenIds: z.array(TokenIdSchema).optional(),
	});

/**
 * Zod schema for OrderbookState.
 */
export const OrderbookStateSchema: z.ZodType<
	import("./parsers").OrderbookState
> = z.object({
	bids: z.array(
		z.object({
			price: z.number(),
			size: z.number(),
		}),
	),
	asks: z.array(
		z.object({
			price: z.number(),
			size: z.number(),
		}),
	),
	tickSize: z.number().optional(),
	minOrderSize: z.number().optional(),
});

/**
 * Validates an unknown value against a Zod schema.
 * Returns the validated data or throws a detailed error.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param context - Context string for error messages
 * @returns Validated and typed data
 *
 * @example
 * try {
 *   const event = validateWithSchema(GammaEventSchema, apiResponse, "Gamma API event");
 * } catch (err) {
 *   console.error("Validation failed:", err);
 * }
 */
export function validateWithSchema<T>(
	schema: z.ZodType<T>,
	data: unknown,
	context: string,
): T {
	const result = schema.safeParse(data);

	if (!result.success) {
		// Format validation errors for better debugging
		const errors = result.error.issues
			.map((err: z.ZodIssue) => `  - ${err.path.join(".")}: ${err.message}`)
			.join("\n");

		throw new Error(
			`Validation failed for ${context}:\n${errors}\n\nReceived: ${JSON.stringify(data, null, 2).slice(0, 500)}...`,
		);
	}

	return result.data;
}
