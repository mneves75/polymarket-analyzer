import { describe, expect, it } from "bun:test";
import {
	asConditionId,
	asEventId,
	asMarketId,
	asTokenId,
	type ConditionId,
	type EventId,
	isConditionId,
	isMarketId,
	isTokenId,
	type MarketId,
	type TokenId,
} from "../src/types";

describe("asTokenId", () => {
	it("accepts valid full 66-character hex token ID", () => {
		const validId = `0x${"a".repeat(64)}`;
		expect(() => asTokenId(validId)).not.toThrow();
		const tokenId = asTokenId(validId);
		expect(tokenId).toBe(validId);
	});

	it("accepts valid partial token ID (10-65 characters)", () => {
		const partialId = "0x1234567890abcdef";
		expect(() => asTokenId(partialId)).not.toThrow();
		const tokenId = asTokenId(partialId);
		expect(tokenId).toBe(partialId);
	});

	it("rejects non-string input", () => {
		expect(() => asTokenId(123 as unknown as string)).toThrow(
			"expected string, got number",
		);
		expect(() => asTokenId(null as unknown as string)).toThrow(
			"expected string, got object",
		);
		expect(() => asTokenId(undefined as unknown as string)).toThrow(
			"expected string, got undefined",
		);
	});

	it("rejects ID without 0x prefix", () => {
		expect(() => asTokenId("1234567890abcdef")).toThrow("must start with '0x'");
	});

	it("rejects ID that is too short", () => {
		expect(() => asTokenId("0x123")).toThrow(
			"invalid length 5, expected 10-66",
		);
	});

	it("rejects ID that is too long", () => {
		const tooLong = `0x${"a".repeat(100)}`;
		expect(() => asTokenId(tooLong)).toThrow(
			"invalid length 102, expected 10-66",
		);
	});

	it("returns branded type that cannot be used interchangeably with string", () => {
		const tokenId = asTokenId("0x1234567890abcdef");
		// Type assertion to verify branding
		const branded: TokenId = tokenId;
		expect(branded).toBe("0x1234567890abcdef");
	});
});

describe("asConditionId", () => {
	it("accepts valid 66-character hex condition ID", () => {
		const validId = `0x${"f".repeat(64)}`;
		expect(() => asConditionId(validId)).not.toThrow();
		const conditionId = asConditionId(validId);
		expect(conditionId).toBe(validId);
	});

	it("rejects non-string input", () => {
		expect(() => asConditionId(123 as unknown as string)).toThrow(
			"expected string, got number",
		);
	});

	it("rejects ID without 0x prefix", () => {
		expect(() => asConditionId("1234567890abcdef")).toThrow(
			"must start with '0x'",
		);
	});

	it("rejects ID that is not exactly 66 characters", () => {
		expect(() => asConditionId("0x1234567890abcdef")).toThrow(
			"invalid length 18, expected 66",
		);
		const tooLong = `0x${"a".repeat(100)}`;
		expect(() => asConditionId(tooLong)).toThrow(
			"invalid length 102, expected 66",
		);
	});

	it("returns branded type", () => {
		const conditionId = asConditionId(`0x${"0".repeat(64)}`);
		const branded: ConditionId = conditionId;
		expect(branded).toBe(`0x${"0".repeat(64)}`);
	});
});

describe("asMarketId", () => {
	it("accepts valid hex format (condition ID)", () => {
		const hexId = `0x${"a".repeat(42)}`;
		expect(() => asMarketId(hexId)).not.toThrow();
		const marketId = asMarketId(hexId);
		expect(marketId).toBe(hexId);
	});

	it("accepts valid slug format", () => {
		expect(() => asMarketId("will-bitcoin-reach-100k")).not.toThrow();
		expect(() => asMarketId("trump-2024-election")).not.toThrow();
		expect(() => asMarketId("crypto_market_2025")).not.toThrow();
	});

	it("rejects empty string", () => {
		expect(() => asMarketId("")).toThrow("cannot be empty");
	});

	it("rejects non-string input", () => {
		expect(() => asMarketId(123 as unknown as string)).toThrow(
			"expected string, got number",
		);
	});

	it("rejects invalid hex length", () => {
		expect(() => asMarketId("0x123")).toThrow("invalid hex length 5");
		const tooLong = `0x${"a".repeat(100)}`;
		expect(() => asMarketId(tooLong)).toThrow("invalid hex length 102");
	});

	it("rejects invalid slug format", () => {
		expect(() => asMarketId("invalid slug with spaces")).toThrow(
			"invalid slug format",
		);
		expect(() => asMarketId("Invalid-Uppercase-With-Dots.com")).toThrow(
			"invalid slug format",
		);
	});

	it("returns branded type", () => {
		const marketId = asMarketId("bitcoin-price-2025");
		const branded: MarketId = marketId;
		expect(branded).toBe("bitcoin-price-2025");
	});
});

describe("asEventId", () => {
	it("accepts string input", () => {
		expect(() => asEventId("event-123")).not.toThrow();
		const eventId = asEventId("event-123");
		expect(eventId).toBe("event-123");
	});

	it("accepts number input and converts to string", () => {
		const eventId = asEventId(12345);
		expect(eventId).toBe("12345");
	});

	it("rejects empty string", () => {
		expect(() => asEventId("")).toThrow("cannot be empty");
	});

	it("returns branded type", () => {
		const eventId = asEventId(12345);
		const branded: EventId = eventId;
		expect(branded).toBe("12345");
	});
});

describe("isTokenId (type guard)", () => {
	it("returns true for valid token IDs", () => {
		expect(isTokenId("0x1234567890abcdef")).toBe(true);
		expect(isTokenId(`0x${"a".repeat(64)}`)).toBe(true);
	});

	it("returns false for invalid token IDs", () => {
		expect(isTokenId("")).toBe(false);
		expect(isTokenId("12345")).toBe(false); // missing 0x
		expect(isTokenId("0x123")).toBe(false); // too short
		expect(isTokenId(`0x${"a".repeat(100)}`)).toBe(false); // too long
	});
});

describe("isConditionId (type guard)", () => {
	it("returns true for valid 66-character condition IDs", () => {
		expect(isConditionId(`0x${"f".repeat(64)}`)).toBe(true);
	});

	it("returns false for invalid condition IDs", () => {
		expect(isConditionId("")).toBe(false);
		expect(isConditionId("12345")).toBe(false); // missing 0x
		expect(isConditionId("0x1234567890abcdef")).toBe(false); // wrong length
		expect(isConditionId(`0x${"a".repeat(100)}`)).toBe(false); // too long
	});
});

describe("isMarketId (type guard)", () => {
	it("returns true for valid hex market IDs", () => {
		expect(isMarketId(`0x${"a".repeat(42)}`)).toBe(true);
	});

	it("returns true for valid slug market IDs", () => {
		expect(isMarketId("bitcoin-price")).toBe(true);
		expect(isMarketId("will-trump-win-2024")).toBe(true);
		expect(isMarketId("crypto_market_2025")).toBe(true);
	});

	it("returns false for invalid market IDs", () => {
		expect(isMarketId("")).toBe(false);
		expect(isMarketId("invalid slug with spaces")).toBe(false);
		expect(isMarketId("0x123")).toBe(false); // too short hex
		expect(isMarketId(`0x${"a".repeat(100)}`)).toBe(false); // too long hex
	});
});
