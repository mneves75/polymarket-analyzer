import { CONFIG } from "./config";
import { getErrorInfo } from "./errors";
import { asNumber } from "./parsers";

export type WsUpdate = {
	assetId: string;
	eventType: string;
	bestBid?: number;
	bestAsk?: number;
	lastTrade?: number;
	side?: "BUY" | "SELL";
	price?: number;
	size?: number;
	hash?: string;
	timestamp?: number;
	sequence?: number;
	ts: number;
};

export type WsHandlers = {
	onUpdate: (update: WsUpdate) => void;
	onBook?: (assetId: string, book: Record<string, unknown>) => void;
	onStatus?: (status: string) => void;
};

export function parseMarketMessage(data: Record<string, unknown>) {
	const updates: WsUpdate[] = [];
	const books: Array<{ assetId: string; book: Record<string, unknown> }> = [];
	const eventType = String(data.event_type || data.type || "");
	const baseTs = asNumber(data.timestamp ?? data.ts ?? data.time);

	if (eventType === "book") {
		const assetId = String(data.asset_id || data.token_id || "");
		if (assetId) {
			books.push({ assetId, book: data });
		}
		return { updates, books };
	}

	if (eventType === "best_bid_ask") {
		const assetId = String(data.asset_id || data.token_id || "");
		const bestBid = asNumber(data.best_bid);
		const bestAsk = asNumber(data.best_ask);
		if (assetId) {
			const ts = baseTs ?? Date.now();
			const update: WsUpdate = {
				assetId,
				eventType,
				ts,
			};
			if (bestBid !== undefined) update.bestBid = bestBid;
			if (bestAsk !== undefined) update.bestAsk = bestAsk;
			if (baseTs !== undefined) update.timestamp = baseTs;
			updates.push(update);
		}
		return { updates, books };
	}

	if (eventType === "last_trade_price") {
		const assetId = String(data.asset_id || data.token_id || "");
		const price = asNumber(data.price);
		if (assetId && price !== undefined) {
			const ts = baseTs ?? Date.now();
			const update: WsUpdate = {
				assetId,
				eventType,
				lastTrade: price,
				ts,
			};
			if (baseTs !== undefined) update.timestamp = baseTs;
			updates.push(update);
		}
		return { updates, books };
	}

	if (eventType === "price_change") {
		const assetId = String(data.asset_id || data.token_id || "");
		const bestBid = asNumber(data.best_bid);
		const bestAsk = asNumber(data.best_ask);
		const hash = typeof data.hash === "string" ? data.hash : undefined;
		const sequence = asNumber((data.sequence ?? data.seq) as unknown);

		const changes = Array.isArray(data.price_changes)
			? (data.price_changes as Array<Record<string, unknown>>)
			: Array.isArray(data.changes)
				? (data.changes as Array<Record<string, unknown>>)
				: [];

		if (changes.length === 0) {
			if (assetId && (bestBid !== undefined || bestAsk !== undefined)) {
				const ts = baseTs ?? Date.now();
				const update: WsUpdate = {
					assetId,
					eventType,
					ts,
				};
				if (bestBid !== undefined) update.bestBid = bestBid;
				if (bestAsk !== undefined) update.bestAsk = bestAsk;
				if (hash !== undefined) update.hash = hash;
				if (sequence !== undefined) update.sequence = sequence;
				if (baseTs !== undefined) update.timestamp = baseTs;
				updates.push(update);
			}
			return { updates, books };
		}

		for (const change of changes) {
			const changeAsset = String(
				change.asset_id || change.token_id || assetId || "",
			);
			const side = String(change.side || change.action || "").toUpperCase();
			const price = asNumber(change.price ?? change.p);
			const size = asNumber(change.size ?? change.quantity ?? change.amount);
			const changeHash =
				(typeof change.hash === "string"
					? (change.hash as string)
					: undefined) || hash;
			const changeSeq = asNumber(change.sequence ?? change.seq ?? sequence);
			const changeTs = asNumber(change.timestamp ?? change.ts ?? baseTs);
			if (!changeAsset || price === undefined) continue;

			const update: WsUpdate = {
				assetId: changeAsset,
				eventType,
				side: side === "SELL" ? "SELL" : "BUY",
				price,
				ts: changeTs ?? Date.now(),
			};
			if (size !== undefined) update.size = size;
			if (bestBid !== undefined) update.bestBid = bestBid;
			else {
				const changeBestBid = asNumber(change.best_bid);
				if (changeBestBid !== undefined) update.bestBid = changeBestBid;
			}
			if (bestAsk !== undefined) update.bestAsk = bestAsk;
			else {
				const changeBestAsk = asNumber(change.best_ask);
				if (changeBestAsk !== undefined) update.bestAsk = changeBestAsk;
			}
			if (changeHash !== undefined) update.hash = changeHash;
			if (changeSeq !== undefined) update.sequence = changeSeq;
			if (changeTs !== undefined) update.timestamp = changeTs;
			updates.push(update);
		}
		return { updates, books };
	}

	if (eventType === "tick_size_change") {
		const assetId = String(data.asset_id || data.token_id || "");
		if (assetId) {
			const ts = baseTs ?? Date.now();
			const update: WsUpdate = {
				assetId,
				eventType,
				ts,
			};
			if (baseTs !== undefined) update.timestamp = baseTs;
			updates.push(update);
		}
	}

	return { updates, books };
}

export function connectMarketWs(assetIds: string[], handlers: WsHandlers) {
	let ws: WebSocket | null = null;
	let closed = false;
	let reconnectAttempts = 0;
	let lastMessageAt = 0;
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

	const connect = () => {
		if (closed) return;
		ws = new WebSocket(CONFIG.clobWsBase);
		handlers.onStatus?.("connecting");

		ws.addEventListener("open", () => {
			reconnectAttempts = 0;
			handlers.onStatus?.("connected");
			lastMessageAt = Date.now();
			sendSubscribe(assetIds);
			startHeartbeat();
		});

		ws.addEventListener("message", (event) => {
			lastMessageAt = Date.now();
			try {
				const data = JSON.parse(String(event.data)) as Record<string, unknown>;
				if (isPingMessage(data)) {
					sendPong(data);
					return;
				}
				const parsed = parseMarketMessage(data);
				parsed.books.forEach((book) => {
					handlers.onBook?.(book.assetId, book.book);
				});
				parsed.updates.forEach((update) => {
					handlers.onUpdate(update);
				});
			} catch (err) {
				handlers.onStatus?.(`ws parse error: ${getErrorInfo(err).message}`);
			}
		});

		ws.addEventListener("close", () => {
			handlers.onStatus?.("closed");
			stopHeartbeat();
			scheduleReconnect();
		});

		ws.addEventListener("error", () => {
			handlers.onStatus?.("error");
			ws?.close();
		});
	};

	const sendSubscribe = (ids: string[]) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		const payload = {
			type: "MARKET",
			assets_ids: ids,
			custom_feature_enabled: true,
		};
		ws.send(JSON.stringify(payload));
	};

	const sendOperation = (
		ids: string[],
		operation: "subscribe" | "unsubscribe",
	) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		const payload = {
			assets_ids: ids,
			operation,
			custom_feature_enabled: true,
		};
		ws.send(JSON.stringify(payload));
	};

	const scheduleReconnect = () => {
		if (closed) return;
		reconnectAttempts += 1;
		const backoff = Math.min(30_000, 500 * 2 ** (reconnectAttempts - 1));
		setTimeout(
			() => {
				if (!closed) connect();
			},
			backoff + Math.floor(Math.random() * 200),
		);
	};

	const startHeartbeat = () => {
		stopHeartbeat();
		heartbeatTimer = setInterval(() => {
			if (!ws || ws.readyState !== WebSocket.OPEN) return;
			const now = Date.now();
			if (now - lastMessageAt > CONFIG.wsStaleMs) {
				handlers.onStatus?.("stale");
				ws.close();
				return;
			}
		}, 2000);
	};

	const stopHeartbeat = () => {
		if (heartbeatTimer) clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	};

	const isPingMessage = (data: Record<string, unknown>) => {
		const type = String(data.type || data.event_type || "");
		return type === "ping" || type === "heartbeat";
	};

	const sendPong = (data: Record<string, unknown>) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		const type = String(data.type || data.event_type || "");
		const payload: Record<string, unknown> = {};
		if (type === "ping") payload.type = "pong";
		if (type === "heartbeat") payload.type = "heartbeat";
		if ("id" in data) payload.id = data.id as unknown;
		if (Object.keys(payload).length > 0) {
			ws.send(JSON.stringify(payload));
		}
	};

	connect();

	return {
		close() {
			closed = true;
			stopHeartbeat();
			ws?.close();
		},
		subscribe(ids: string[]) {
			sendOperation(ids, "subscribe");
		},
		unsubscribe(ids: string[]) {
			sendOperation(ids, "unsubscribe");
		},
	};
}
