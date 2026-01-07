/**
 * Unit tests for OpenTUI Result type
 */

import { describe, expect, it } from "bun:test";
import {
	err,
	fromPromise,
	isErr,
	isOk,
	mapErr,
	mapOk,
	ok,
	type Result,
	unwrap,
	unwrapOr,
} from "../../src/opentui/result";

describe("Result type", () => {
	describe("ok()", () => {
		it("creates a success result", () => {
			const result = ok(42);

			expect(result.ok).toBe(true);
			expect((result as { ok: true; value: number }).value).toBe(42);
		});

		it("works with objects", () => {
			const data = { name: "test", count: 5 };
			const result = ok(data);

			expect(result.ok).toBe(true);
			expect((result as { ok: true; value: typeof data }).value).toEqual(data);
		});

		it("works with null and undefined", () => {
			const nullResult = ok(null);
			const undefinedResult = ok(undefined);

			expect(nullResult.ok).toBe(true);
			expect(undefinedResult.ok).toBe(true);
		});
	});

	describe("err()", () => {
		it("creates an error result", () => {
			const error = new Error("Test error");
			const result = err(error);

			expect(result.ok).toBe(false);
			expect((result as { ok: false; error: Error }).error).toBe(error);
		});

		it("works with string errors", () => {
			const result = err("Something went wrong");

			expect(result.ok).toBe(false);
			expect((result as { ok: false; error: string }).error).toBe(
				"Something went wrong",
			);
		});
	});

	describe("isOk()", () => {
		it("returns true for success results", () => {
			const result = ok(42);
			expect(isOk(result)).toBe(true);
		});

		it("returns false for error results", () => {
			const result = err(new Error("Test"));
			expect(isOk(result)).toBe(false);
		});
	});

	describe("isErr()", () => {
		it("returns true for error results", () => {
			const result = err(new Error("Test"));
			expect(isErr(result)).toBe(true);
		});

		it("returns false for success results", () => {
			const result = ok(42);
			expect(isErr(result)).toBe(false);
		});
	});

	describe("unwrap()", () => {
		it("returns value for success results", () => {
			const result = ok(42);
			expect(unwrap(result)).toBe(42);
		});

		it("throws for error results", () => {
			const result = err(new Error("Test error"));
			expect(() => unwrap(result)).toThrow("Test error");
		});

		it("throws generic message for non-Error errors", () => {
			const result = err("String error");
			expect(() => unwrap(result)).toThrow("Unwrap called on error result");
		});
	});

	describe("unwrapOr()", () => {
		it("returns value for success results", () => {
			const result = ok(42);
			expect(unwrapOr(result, 0)).toBe(42);
		});

		it("returns default for error results", () => {
			const result: Result<number, Error> = err(new Error("Test"));
			expect(unwrapOr(result, 0)).toBe(0);
		});
	});

	describe("mapOk()", () => {
		it("maps success values", () => {
			const result = ok(42);
			const mapped = mapOk(result, (n) => n * 2);

			expect(mapped.ok).toBe(true);
			expect((mapped as { ok: true; value: number }).value).toBe(84);
		});

		it("passes through error results", () => {
			const error = new Error("Test");
			const result: Result<number, Error> = err(error);
			const mapped = mapOk(result, (n) => n * 2);

			expect(mapped.ok).toBe(false);
			expect((mapped as { ok: false; error: Error }).error).toBe(error);
		});
	});

	describe("mapErr()", () => {
		it("maps error values", () => {
			const result: Result<number, string> = err("original error");
			const mapped = mapErr(result, (e) => new Error(e));

			expect(mapped.ok).toBe(false);
			expect((mapped as { ok: false; error: Error }).error.message).toBe(
				"original error",
			);
		});

		it("passes through success results", () => {
			const result = ok(42);
			const mapped = mapErr(result, (e) => new Error(String(e)));

			expect(mapped.ok).toBe(true);
			expect((mapped as { ok: true; value: number }).value).toBe(42);
		});
	});

	describe("fromPromise()", () => {
		it("returns ok for resolved promises", async () => {
			const promise = Promise.resolve(42);
			const result = await fromPromise(promise);

			expect(result.ok).toBe(true);
			expect((result as { ok: true; value: number }).value).toBe(42);
		});

		it("returns err for rejected promises with Error", async () => {
			const promise = Promise.reject(new Error("Test error"));
			const result = await fromPromise(promise);

			expect(result.ok).toBe(false);
			expect((result as { ok: false; error: Error }).error.message).toBe(
				"Test error",
			);
		});

		it("wraps non-Error rejections in Error", async () => {
			const promise = Promise.reject("string error");
			const result = await fromPromise(promise);

			expect(result.ok).toBe(false);
			expect((result as { ok: false; error: Error }).error).toBeInstanceOf(
				Error,
			);
			expect((result as { ok: false; error: Error }).error.message).toBe(
				"string error",
			);
		});

		it("handles async functions", async () => {
			const asyncFn = async () => {
				await new Promise((r) => setTimeout(r, 1));
				return "async result";
			};

			const result = await fromPromise(asyncFn());

			expect(result.ok).toBe(true);
			expect((result as { ok: true; value: string }).value).toBe(
				"async result",
			);
		});
	});
});
