/**
 * Smart auto-color palette generator.
 *
 * Given a base accent hex (e.g. from `--dt-accent`), generates a
 * palette of perceptually distinct colors that harmonize with the theme.
 *
 * Usage:
 *   generatePalette('#ef4444', 8)  // 8 theme-harmonious colors
 *   generatePalette(undefined, 8)  // falls back to the vivid default
 */

// ── Hardcoded vivid fallback (original behavior) ────────
export const VIVID_PALETTE = [
	'#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
	'#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
	'#06b6d4', '#84cc16', '#d946ef', '#0ea5e9', '#10b981',
];

// ── Color math (hex ↔ HSL) ──────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const n = h.length === 3
		? parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16)
		: parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;
	return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
	h = ((h % 1) + 1) % 1; // normalize to [0, 1)
	const hue2rgb = (p: number, q: number, t: number): number => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	let r: number, g: number, b: number;
	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Extract the --dt-accent hex value from a theme CSS string.
 * Returns undefined if not found.
 */
export function extractAccent(themeString: string): string | undefined {
	const m = themeString.match(/--dt-accent\s*:\s*(#[0-9a-fA-F]{3,8})/);
	return m?.[1];
}

// ── Palette generation ──────────────────────────────────

/**
 * Generate `count` visually distinct and theme-harmonious colors
 * by rotating hue evenly from the base accent, keeping saturation
 * and lightness within a pleasant range.
 *
 * Dark themes (l < 0.5): bump lightness to 0.55–0.65 so colors pop on dark bg.
 * Light themes (l ≥ 0.5): pull lightness to 0.38–0.48 so colors read on light bg.
 *
 * @param accent  Hex color string (e.g. '#ef4444'). If undefined, returns VIVID_PALETTE.
 * @param count   Number of colors to generate (default: 15).
 */
export function generatePalette(accent?: string, count = 15): string[] {
	if (!accent) return VIVID_PALETTE.slice(0, count);

	const [r, g, b] = hexToRgb(accent);
	const [baseH, baseS, baseL] = rgbToHsl(r, g, b);

	// Determine a good saturation range
	const sat = Math.max(0.45, Math.min(0.8, baseS));

	// Light vs dark theme: adjust lightness for contrast
	const isDark = baseL < 0.5;
	const lCenter = isDark ? 0.6 : 0.43;
	const lRange = 0.05;

	const colors: string[] = [];
	for (let i = 0; i < count; i++) {
		// Golden-angle hue rotation for maximum perceptual spread
		const hue = baseH + (i * 0.618033988749895);
		// Slight lightness oscillation for differentiation
		const lOff = ((i % 3) - 1) * lRange;
		// Slight saturation variation
		const sOff = ((i % 2) === 0 ? 0.04 : -0.04);
		const s = Math.max(0.35, Math.min(0.85, sat + sOff));
		const l = Math.max(0.3, Math.min(0.7, lCenter + lOff));
		colors.push(hslToHex(hue, s, l));
	}

	return colors;
}
