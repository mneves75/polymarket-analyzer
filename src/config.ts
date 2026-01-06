export const CONFIG = {
	gammaBase: "https://gamma-api.polymarket.com",
	clobRestBase: "https://clob.polymarket.com",
	clobWsBase: "wss://ws-subscriptions-clob.polymarket.com/ws/",
	dataApiBase: "https://data-api.polymarket.com",
	rtdsBase: "wss://ws-live-data.polymarket.com",
	refreshMs: 3000,
	historyMs: 30000,
	holdersMs: 60000,
	radarMs: 60000,
	wsStaleMs: 15000,
	restStaleMs: 20000,
	reconcileMs: 60000,
	resyncCooldownMs: 15000,
	resyncDelayMs: 1200,
	noOrderbookCooldownMs: 30000,
	alertDelta: 0.05,
	historyInterval: "1d",
	historyFidelity: 30,
	holdersLimit: 8,
	orderbookDepth: 10,
	radarLimit: 50,
	restTimeoutMs: 10000,
	/**
	 * Enable runtime validation of API responses using Zod schemas.
	 * Set to true in development to catch API contract issues early.
	 * Set to false in production to avoid performance overhead.
	 *
	 * @default false (disabled by default)
	 */
	enableValidation: false,
};
