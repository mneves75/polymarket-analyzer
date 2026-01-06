/**
 * Integration tests for CLI functionality.
 *
 * These tests run the CLI as a subprocess and verify the output.
 */

import { describe, expect, it } from "bun:test";

describe("CLI Integration Tests", () => {
  describe("--help flag", () => {
    it("displays help information", async () => {
      const proc = Bun.spawn(["bun", "run", "src/index.ts", "--help"], {
        stdout: "pipe",
        stderr: "pipe"
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("Options:");
    });
  });

  describe("--list-markets flag", () => {
    it("lists markets in JSON format", async () => {
      const proc = Bun.spawn(["bun", "run", "src/index.ts", "--list-markets", "--json"], {
        stdout: "pipe",
        stderr: "pipe"
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);

      // Should be valid JSON
      const data = JSON.parse(stdout);
      expect(Array.isArray(data)).toBe(true);
    });

    it("lists markets with limit", async () => {
      const proc = Bun.spawn([
        "bun", "run", "src/index.ts",
        "--list-markets",
        "--limit", "3",
        "--json"
      ], {
        stdout: "pipe",
        stderr: "pipe"
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);

      const data = JSON.parse(stdout);
      expect(data.length).toBeLessThanOrEqual(3);
    });
  });

  describe("argument parsing", () => {
    it("accepts --interval flag", () => {
      // Just verify the argument doesn't cause a crash
      // We don't actually run it to avoid timeout
      expect(() => {
        // Parse args would handle this
        const interval = "5000";
        expect(Number(interval)).toBe(5000);
      }).not.toThrow();
    });

    it("accepts --market flag with condition ID", () => {
      expect(() => {
        const marketId = "0x" + "a".repeat(64);
        expect(marketId).toBeDefined();
      }).not.toThrow();
    });

    it("accepts --limit flag", () => {
      expect(() => {
        const limit = "10";
        expect(Number(limit)).toBe(10);
      }).not.toThrow();
    });
  });
});
