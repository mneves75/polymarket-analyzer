/**
 * Branded type definitions for type-safe ID handling.
 *
 * Per 2025 TypeScript best practices, branded types prevent ID confusion
 * and ensure compile-time type safety for identifiers.
 *
 * @example
 * // ❌ WRONG - Any string can be passed
 * function getToken(tokenId: string) { }
 *
 * // ✅ CORRECT - Only valid TokenId accepted
 * function getToken(tokenId: TokenId) { }
 */

/**
 * Branded type for Polymarket token IDs.
 * Format: 0x[a-fA-F0-9]+ (66 characters for full ID)
 */
export type TokenId = string & { readonly __brand: unique symbol };

/**
 * Branded type for Polymarket condition IDs.
 * Format: 0x[a-fA-F0-9]+ (66 characters)
 */
export type ConditionId = string & { readonly __brand: unique symbol };

/**
 * Branded type for market identifiers.
 * Can be either condition ID or a slug.
 */
export type MarketId = string & { readonly __brand: unique symbol };

/**
 * Branded type for event identifiers.
 * Format: Integer or UUID string
 */
export type EventId = string & { readonly __brand: unique symbol };

/**
 * Validate and convert a string to TokenId.
 *
 * @param id - The string to validate
 * @returns The input as TokenId if valid
 * @throws Error if the ID format is invalid
 *
 * @example
 * const tokenId = asTokenId("0x1234567890abcdef...");
 */
export function asTokenId(id: string): TokenId {
	if (typeof id !== "string") {
		throw new Error(`Invalid TokenId: expected string, got ${typeof id}`);
	}
	// Token IDs are hex strings starting with 0x
	if (!id.startsWith("0x")) {
		throw new Error(
			`Invalid TokenId: must start with '0x', got ${id.slice(0, 10)}...`,
		);
	}
	// Full token IDs are 66 characters (0x + 64 hex chars)
	// Partial token IDs (shorter) are also valid in some contexts
	if (id.length < 10 || id.length > 66) {
		throw new Error(
			`Invalid TokenId: invalid length ${id.length}, expected 10-66`,
		);
	}
	return id as TokenId;
}

/**
 * Validate and convert a string to ConditionId.
 *
 * @param id - The string to validate
 * @returns The input as ConditionId if valid
 * @throws Error if the ID format is invalid
 */
export function asConditionId(id: string): ConditionId {
	if (typeof id !== "string") {
		throw new Error(`Invalid ConditionId: expected string, got ${typeof id}`);
	}
	if (!id.startsWith("0x")) {
		throw new Error(
			`Invalid ConditionId: must start with '0x', got ${id.slice(0, 10)}...`,
		);
	}
	if (id.length !== 66) {
		throw new Error(
			`Invalid ConditionId: invalid length ${id.length}, expected 66`,
		);
	}
	return id as ConditionId;
}

/**
 * Validate and convert a string to MarketId.
 *
 * Market IDs can be either:
 * - A condition ID (0x-prefixed hex)
 * - A slug (kebab-case string)
 *
 * @param id - The string to validate
 * @returns The input as MarketId if valid
 * @throws Error if the ID format is invalid
 */
export function asMarketId(id: string): MarketId {
	if (typeof id !== "string") {
		throw new Error(`Invalid MarketId: expected string, got ${typeof id}`);
	}
	if (id.length === 0) {
		throw new Error(`Invalid MarketId: cannot be empty`);
	}
	// Accept either hex format or slug format
	if (id.startsWith("0x")) {
		// Validate as hex ID
		if (id.length < 10 || id.length > 66) {
			throw new Error(`Invalid MarketId: invalid hex length ${id.length}`);
		}
	} else {
		// Validate as slug (lowercase alphanumeric, hyphens, underscores)
		if (!/^[a-z0-9-_]+$/.test(id)) {
			throw new Error(`Invalid MarketId: invalid slug format`);
		}
	}
	return id as MarketId;
}

/**
 * Validate and convert a string to EventId.
 *
 * @param id - The string to validate
 * @returns The input as EventId if valid
 * @throws Error if the ID format is invalid
 */
export function asEventId(id: string | number): EventId {
	const idStr = String(id);
	if (idStr.length === 0) {
		throw new Error(`Invalid EventId: cannot be empty`);
	}
	return idStr as EventId;
}

/**
 * Type guard to check if a string is a valid TokenId format.
 *
 * @param id - The string to check
 * @returns true if the string matches TokenId format
 */
export function isTokenId(id: string): id is TokenId {
	return id.startsWith("0x") && id.length >= 10 && id.length <= 66;
}

/**
 * Type guard to check if a string is a valid ConditionId format.
 *
 * @param id - The string to check
 * @returns true if the string matches ConditionId format
 */
export function isConditionId(id: string): id is ConditionId {
	return id.startsWith("0x") && id.length === 66;
}

/**
 * Type guard to check if a string is a valid MarketId format.
 *
 * @param id - The string to check
 * @returns true if the string matches MarketId format
 */
export function isMarketId(id: string): id is MarketId {
	if (id.length === 0) return false;
	if (id.startsWith("0x")) {
		return id.length >= 10 && id.length <= 66;
	}
	return /^[a-z0-9-_]+$/.test(id);
}
