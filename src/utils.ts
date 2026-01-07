/**
 * Get user locale from environment variables.
 * Checks LANG, LC_ALL, LC_TIME in order of precedence.
 * Returns undefined to use system default if not set.
 */
export function getUserLocale(): string | undefined {
	const envLocale =
		process.env.LC_ALL || process.env.LC_TIME || process.env.LANG;
	if (!envLocale) return undefined;
	// Convert format like "pt_BR.UTF-8" to "pt-BR"
	const match = envLocale.match(/^([a-z]{2})[-_]([A-Z]{2})/i);
	if (match && match[1] && match[2]) {
		return `${match[1]}-${match[2].toUpperCase()}`;
	}
	// Simple locale like "pt" or "en"
	const simple = envLocale.match(/^([a-z]{2})/i);
	if (simple && simple[1]) {
		return simple[1];
	}
	return undefined;
}

/**
 * Format a date using the user's locale.
 */
export function formatDateTime(date: Date): string {
	const locale = getUserLocale();
	return date.toLocaleString(locale);
}

/**
 * Format a date (no time) using the user's locale.
 */
export function formatDate(date: Date): string {
	const locale = getUserLocale();
	return date.toLocaleDateString(locale);
}

/**
 * Format time remaining as "X Hrs Y Mins left" or "X Days Y Hrs left".
 * Returns null if date is in the past or invalid.
 */
export function formatTimeRemaining(endDate: string | Date): string | null {
	const end = typeof endDate === "string" ? new Date(endDate) : endDate;
	if (Number.isNaN(end.getTime())) return null;

	const now = Date.now();
	const diff = end.getTime() - now;

	if (diff <= 0) return null;

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		const remainingHours = hours % 24;
		return `${days}d ${remainingHours}h left`;
	}
	if (hours > 0) {
		const remainingMins = minutes % 60;
		return `${hours}h ${remainingMins}m left`;
	}
	if (minutes > 0) {
		const remainingSecs = seconds % 60;
		return `${minutes}m ${remainingSecs}s left`;
	}
	return `${seconds}s left`;
}

export function formatPct(value?: number) {
	if (value === undefined) return "-";
	return `${(value * 100).toFixed(1)}%`;
}

export function formatPrice(value?: number) {
	if (value === undefined) return "-";
	return value.toFixed(4);
}

export function formatNumber(value?: number) {
	if (value === undefined) return "-";
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
	return value.toFixed(2);
}

// ============================================================================
// Chart Utilities - Bug-Fixed and Enhanced
// ============================================================================

/**
 * Sanitize chart data by removing non-finite values (NaN, Infinity, -Infinity).
 * This prevents chart rendering bugs when API returns malformed data.
 *
 * @param series - Raw number array that may contain non-finite values
 * @returns Object with sanitized data array and count of removed values
 */
export function sanitizeChartData(series: number[]): {
	data: number[];
	removed: number;
} {
	const data: number[] = [];
	let removed = 0;
	for (const val of series) {
		if (Number.isFinite(val)) {
			data.push(val);
		} else {
			removed++;
		}
	}
	return { data, removed };
}

/**
 * Calculate optimal decimal precision based on value range.
 * Ensures labels show meaningful differences between min and max.
 *
 * @param range - The difference between max and min values
 * @returns Number of decimal places to use
 */
export function calculatePrecision(range: number): number {
	if (range === 0) return 4;
	if (range < 0.0001) return 8;
	if (range < 0.001) return 6;
	if (range < 0.1) return 4;
	if (range < 10) return 2;
	if (range < 1000) return 1;
	return 0;
}

/**
 * Format a value with adaptive precision based on the data range.
 * Used for Y-axis labels to ensure meaningful display.
 *
 * @param value - The value to format
 * @param precision - Number of decimal places
 * @returns Formatted string
 */
export function formatWithPrecision(value: number, precision: number): string {
	return value.toFixed(precision);
}

// Unicode block elements for charts and sparklines (8 levels of fill)
// Used for both bar charts and sparklines for visual consistency
const BLOCK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

/**
 * Generate a compact sparkline using Unicode block characters.
 * Shows trend at a glance with 8 vertical levels per character.
 *
 * @param series - Array of numeric values (will be sanitized)
 * @param width - Maximum number of characters (default: 30)
 * @returns Single-line sparkline string
 */
export function asciiSparkline(series: number[], width = 30): string {
	if (series.length === 0) return "(no data)";

	// Sanitize data to handle NaN/Infinity
	const { data } = sanitizeChartData(series);
	if (data.length === 0) return "(invalid data)";

	const sliced = data.slice(-width);
	const min = Math.min(...sliced);
	const max = Math.max(...sliced);
	const range = max - min;

	// Handle constant values - show middle block
	if (range === 0) {
		return BLOCK_CHARS[3].repeat(sliced.length);
	}

	return sliced
		.map((v) => {
			// Normalize to 0-1 range, then map to block index 0-7
			const normalized = (v - min) / range;
			const idx = Math.round(normalized * (BLOCK_CHARS.length - 1));
			return BLOCK_CHARS[Math.max(0, Math.min(BLOCK_CHARS.length - 1, idx))];
		})
		.join("");
}

/**
 * Generate an ASCII bar/area chart using Unicode block characters.
 * Shows data as filled bars from bottom, good for volume visualization.
 *
 * This is the original chart style - kept for backward compatibility.
 * For line charts (like Polymarket), use asciiLineChart() instead.
 *
 * @param series - Array of numeric values (will be sanitized)
 * @param width - Maximum data points to display (default: 50)
 * @param height - Number of rows in chart (default: 8)
 * @returns Array of strings, one per line
 */
export function asciiChart(series: number[], width = 50, height = 8): string[] {
	if (series.length === 0) return ["(no data)"];

	// Sanitize data to handle NaN/Infinity
	const { data, removed } = sanitizeChartData(series);
	if (data.length === 0) {
		return ["(no valid data - all values were NaN or Infinity)"];
	}

	const sliced = data.slice(-width);
	const min = Math.min(...sliced);
	const max = Math.max(...sliced);
	const range = max - min;
	const isConstant = range === 0;

	// Calculate adaptive precision based on range
	const precision = calculatePrecision(range);

	// Calculate label width based on actual formatted values
	const minLabel = formatWithPrecision(min, precision);
	const maxLabel = formatWithPrecision(max, precision);
	const labelWidth = Math.max(minLabel.length, maxLabel.length, 6);

	// For very few points, a chart isn't meaningful
	if (sliced.length < 3) {
		const value = sliced[sliced.length - 1] ?? 0;
		const suffix = removed > 0 ? ` (${removed} invalid values filtered)` : "";
		return [
			`Price: ${formatWithPrecision(value, precision)} (${sliced.length} point${sliced.length === 1 ? "" : "s"} - insufficient for chart)${suffix}`,
		];
	}

	const lines: string[] = [];

	// Handle constant values - show flat line with label
	if (isConstant) {
		const midRow = Math.floor(height / 2);
		for (let row = height - 1; row >= 0; row--) {
			const rowChars: string[] = [];
			for (let i = 0; i < sliced.length; i++) {
				rowChars.push(row === midRow ? "─" : " ");
			}
			const label = row === midRow ? minLabel : "";
			lines.push(`${label.padStart(labelWidth)} │${rowChars.join("")}`);
		}
		lines.push(`${"".padStart(labelWidth)} └${"─".repeat(sliced.length)}`);
		lines.push(`${"".padStart(labelWidth)}  (stable price - no variation)`);
		return lines;
	}

	// Normal case - values have range
	// Create the chart rows (top to bottom)
	for (let row = height - 1; row >= 0; row--) {
		const rowChars: string[] = [];

		for (const val of sliced) {
			const normalized = (val - min) / range;
			const fillLevel = normalized * height;

			if (fillLevel >= row + 1) {
				// Fully filled cell
				rowChars.push("█");
			} else if (fillLevel > row) {
				// Partially filled cell - select appropriate block character
				const partialFill = fillLevel - row; // 0 to 1
				const blockIdx = Math.floor(partialFill * BLOCK_CHARS.length);
				rowChars.push(
					BLOCK_CHARS[Math.min(blockIdx, BLOCK_CHARS.length - 1)] ?? " ",
				);
			} else {
				// Empty cell
				rowChars.push(" ");
			}
		}

		// Add Y-axis label only for top and bottom rows
		const label =
			row === height - 1 ? maxLabel : row === 0 ? minLabel : "";
		lines.push(`${label.padStart(labelWidth)} │${rowChars.join("")}`);
	}

	// Add bottom axis
	lines.push(`${"".padStart(labelWidth)} └${"─".repeat(sliced.length)}`);

	return lines;
}

// ============================================================================
// Line Chart - Polymarket Style (Clean line connecting points)
// ============================================================================

/**
 * Box-drawing characters for line charts.
 * These create clean, connected lines like traditional charts.
 */
const LINE_CHARS = {
	horizontal: "─",
	vertical: "│",
	cross: "┼",
	leftT: "┤",
	bottomLeft: "└",
	// Rounded corners for smooth curves
	topRightRound: "╮",
	bottomRightRound: "╯",
	topLeftRound: "╭",
	bottomLeftRound: "╰",
} as const;

export interface LineChartOptions {
	/** Chart width in characters (default: 50) */
	width?: number;
	/** Chart height in rows (default: 8) */
	height?: number;
	/** Minimum value for Y-axis (auto-calculated if not provided) */
	min?: number;
	/** Maximum value for Y-axis (auto-calculated if not provided) */
	max?: number;
	/** Label padding offset (default: 3) */
	offset?: number;
}

/**
 * Generate an ASCII line chart using box-drawing characters.
 * This matches the Polymarket aesthetic with clean connected lines.
 *
 * Algorithm adapted from the popular asciichart library:
 * https://github.com/kroitor/asciichart
 *
 * @param series - Array of numeric values (will be sanitized)
 * @param options - Chart configuration options
 * @returns Array of strings, one per line
 */
export function asciiLineChart(
	series: number[],
	options: LineChartOptions = {},
): string[] {
	const { width = 50, height = 8, offset = 3 } = options;

	if (series.length === 0) return ["(no data)"];

	// Sanitize data to handle NaN/Infinity
	const { data, removed } = sanitizeChartData(series);
	if (data.length === 0) {
		return ["(no valid data - all values were NaN or Infinity)"];
	}

	// Slice to width (take most recent data points)
	const sliced = data.slice(-width);

	// For very few points, a chart isn't meaningful
	if (sliced.length < 2) {
		const value = sliced[0] ?? 0;
		const suffix = removed > 0 ? ` (${removed} invalid values filtered)` : "";
		return [`Price: ${formatPrice(value)} (insufficient data for chart)${suffix}`];
	}

	// Calculate min/max (use provided values or auto-calculate)
	const dataMin = Math.min(...sliced);
	const dataMax = Math.max(...sliced);
	const min = options.min ?? dataMin;
	const max = options.max ?? dataMax;
	const range = max - min;

	// Calculate adaptive precision based on range
	const precision = calculatePrecision(range);

	// Calculate label width
	const minLabel = formatWithPrecision(min, precision);
	const maxLabel = formatWithPrecision(max, precision);
	const labelWidth = Math.max(minLabel.length, maxLabel.length) + offset;

	// Handle constant values - show flat line
	if (range === 0) {
		const lines: string[] = [];
		const midRow = Math.floor(height / 2);
		for (let row = height - 1; row >= 0; row--) {
			const label = row === midRow ? minLabel : "";
			const lineContent =
				row === midRow
					? LINE_CHARS.leftT + LINE_CHARS.horizontal.repeat(sliced.length)
					: " ".repeat(sliced.length + 1);
			lines.push(`${label.padStart(labelWidth)}${lineContent}`);
		}
		lines.push(`${"".padStart(labelWidth)}${LINE_CHARS.bottomLeft}${"─".repeat(sliced.length)}`);
		return lines;
	}

	// Scale factor: maps data values to row indices
	// Row 0 is bottom (min), row (height-1) is top (max)
	const rows = height - 1;
	const scale = rows / range;

	/**
	 * Convert a data value to its row index (0 = bottom, rows = top).
	 * Uses rounding to snap values to discrete row positions.
	 */
	const valueToRow = (val: number): number => {
		return Math.round((val - min) * scale);
	};

	// Initialize the canvas: height rows x (sliced.length + 1) columns
	// Each cell will contain a character or space
	// Using explicit typing for safe array access
	const canvas: string[][] = Array.from({ length: rows + 1 }, () =>
		Array.from({ length: sliced.length + 1 }, () => " "),
	);

	// Add Y-axis on the left (column 0)
	for (let row = 0; row <= rows; row++) {
		const canvasRow = canvas[row];
		if (canvasRow) canvasRow[0] = LINE_CHARS.leftT;
	}

	// Plot the line chart
	// We iterate through adjacent pairs of points and draw connectors
	for (let col = 0; col < sliced.length; col++) {
		const currentVal = sliced[col];
		if (currentVal === undefined) continue;
		const currentRow = valueToRow(currentVal);

		if (col === 0) {
			// First point - just mark the position
			const targetRow = canvas[currentRow];
			if (targetRow) targetRow[1] = LINE_CHARS.horizontal;
			continue;
		}

		const prevVal = sliced[col - 1];
		if (prevVal === undefined) continue;
		const prevRow = valueToRow(prevVal);

		// Column index in canvas (offset by 1 for Y-axis)
		const canvasCol = col + 1;

		if (currentRow === prevRow) {
			// Same level - horizontal line
			const targetRow = canvas[currentRow];
			if (targetRow) targetRow[canvasCol] = LINE_CHARS.horizontal;
		} else if (currentRow > prevRow) {
			// Going UP: line rises from prevRow (bottom) to currentRow (top)
			// At bottom (prevRow): ╯ connects left-to-top (enters from left, exits up)
			// At top (currentRow): ╭ connects bottom-to-right (enters from below, exits right)
			const prevRowArr = canvas[prevRow];
			if (prevRowArr) prevRowArr[canvasCol] = LINE_CHARS.bottomRightRound; // ╯
			for (let r = prevRow + 1; r < currentRow; r++) {
				const midRow = canvas[r];
				if (midRow) midRow[canvasCol] = LINE_CHARS.vertical;
			}
			const currRowArr = canvas[currentRow];
			if (currRowArr) currRowArr[canvasCol] = LINE_CHARS.topLeftRound; // ╭
		} else {
			// Going DOWN: line falls from prevRow (top) to currentRow (bottom)
			// At top (prevRow): ╮ connects left-to-bottom (enters from left, exits down)
			// At bottom (currentRow): ╰ connects top-to-right (enters from above, exits right)
			const prevRowArr = canvas[prevRow];
			if (prevRowArr) prevRowArr[canvasCol] = LINE_CHARS.topRightRound; // ╮
			for (let r = currentRow + 1; r < prevRow; r++) {
				const midRow = canvas[r];
				if (midRow) midRow[canvasCol] = LINE_CHARS.vertical;
			}
			const currRowArr = canvas[currentRow];
			if (currRowArr) currRowArr[canvasCol] = LINE_CHARS.bottomLeftRound; // ╰
		}
	}

	// Convert canvas to output lines (top to bottom)
	const lines: string[] = [];
	for (let row = rows; row >= 0; row--) {
		// Y-axis label: show at top, bottom, and optionally middle
		let label = "";
		if (row === rows) {
			label = maxLabel;
		} else if (row === 0) {
			label = minLabel;
		} else if (rows >= 4 && row === Math.floor(rows / 2)) {
			// Add middle label for taller charts
			const midVal = min + range / 2;
			label = formatWithPrecision(midVal, precision);
		}

		const canvasRow = canvas[row];
		const lineContent = canvasRow ? canvasRow.join("") : "";
		lines.push(`${label.padStart(labelWidth)}${lineContent}`);
	}

	// Add bottom axis
	lines.push(
		`${"".padStart(labelWidth)}${LINE_CHARS.bottomLeft}${"─".repeat(sliced.length)}`,
	);

	return lines;
}

export function padRight(value: string, len: number) {
	if (value.length >= len) return value.slice(0, len);
	return value + " ".repeat(len - value.length);
}

export function midpointFrom(bestBid?: number, bestAsk?: number) {
	if (bestBid === undefined || bestAsk === undefined) return undefined;
	return (bestBid + bestAsk) / 2;
}
