/**
 * Unit tests for OpenTUI Configuration
 */

import { afterEach, describe, expect, it } from "bun:test";
import {
	DEFAULT_CONFIG,
	getConfig,
	resetConfig,
	updateConfig,
} from "../../src/opentui/config";

describe("OpenTUI Config", () => {
	afterEach(() => {
		resetConfig();
	});

	describe("DEFAULT_CONFIG", () => {
		it("has correct layout defaults", () => {
			expect(DEFAULT_CONFIG.layout.radarWidth).toBe(40);
			expect(DEFAULT_CONFIG.layout.marketWidth).toBe(60);
			expect(DEFAULT_CONFIG.layout.headerHeight).toBe(1);
			expect(DEFAULT_CONFIG.layout.footerHeight).toBe(1);
		});

		it("has correct color scheme", () => {
			expect(DEFAULT_CONFIG.colors.bid).toBe("green");
			expect(DEFAULT_CONFIG.colors.ask).toBe("red");
			expect(DEFAULT_CONFIG.colors.border).toBe("blue");
			expect(DEFAULT_CONFIG.colors.header).toBe("white");
			expect(DEFAULT_CONFIG.colors.selected).toBe("yellow");
		});

		it("has correct performance settings", () => {
			expect(DEFAULT_CONFIG.performance.renderDebounceMs).toBe(16);
			expect(DEFAULT_CONFIG.performance.cacheExpiryMs).toBe(30000);
			expect(DEFAULT_CONFIG.performance.maxRadarItems).toBe(100);
		});
	});

	describe("getConfig", () => {
		it("returns default config initially", () => {
			const config = getConfig();

			expect(config.layout.radarWidth).toBe(40);
			expect(config.colors.bid).toBe("green");
			expect(config.performance.renderDebounceMs).toBe(16);
		});

		it("returns same object on multiple calls", () => {
			const config1 = getConfig();
			const config2 = getConfig();

			expect(config1).toBe(config2);
		});
	});

	describe("updateConfig", () => {
		it("updates layout settings", () => {
			updateConfig({
				layout: { radarWidth: 50, marketWidth: 50 },
			});

			const config = getConfig();
			expect(config.layout.radarWidth).toBe(50);
			expect(config.layout.marketWidth).toBe(50);
			// Other layout values should remain default
			expect(config.layout.headerHeight).toBe(1);
		});

		it("updates color settings", () => {
			updateConfig({
				colors: { bid: "cyan", ask: "magenta" },
			});

			const config = getConfig();
			expect(config.colors.bid).toBe("cyan");
			expect(config.colors.ask).toBe("magenta");
			// Other colors should remain default
			expect(config.colors.border).toBe("blue");
		});

		it("updates performance settings", () => {
			updateConfig({
				performance: { renderDebounceMs: 32, cacheExpiryMs: 60000 },
			});

			const config = getConfig();
			expect(config.performance.renderDebounceMs).toBe(32);
			expect(config.performance.cacheExpiryMs).toBe(60000);
		});

		it("allows partial updates", () => {
			updateConfig({ layout: { radarWidth: 45 } });

			const config = getConfig();
			expect(config.layout.radarWidth).toBe(45);
			expect(config.layout.marketWidth).toBe(60); // unchanged
		});
	});

	describe("resetConfig", () => {
		it("resets to default values", () => {
			updateConfig({
				layout: { radarWidth: 50 },
				colors: { bid: "cyan" },
				performance: { renderDebounceMs: 32 },
			});

			resetConfig();

			const config = getConfig();
			expect(config.layout.radarWidth).toBe(40);
			expect(config.colors.bid).toBe("green");
			expect(config.performance.renderDebounceMs).toBe(16);
		});
	});
});
