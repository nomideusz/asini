/**
 * Smart Auto Theme — probes the host page and generates --dt-* CSS tokens
 * that blend the calendar into any design system.
 *
 * How it works:
 *   1. Reads computed styles from the element's ancestors (body, parent)
 *   2. Detects light/dark mode from background luminance
 *   3. Extracts fonts, text colors, accent/brand colors
 *   4. Generates a full --dt-* CSS variable string
 *
 * Usage:
 *   const vars = probeHostTheme(calendarElement);
 *   // → "--dt-bg: #fff; --dt-text: rgba(0,0,0,0.87); ..."
 *
 * The Calendar component calls this automatically when theme is `auto` (empty string).
 */

// ── Color math ──────────────────────────────────────────

type RGB = [number, number, number];
type HSL = [number, number, number];

function parseColor(raw: string): RGB | null {
	if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return null;

	// rgb(r, g, b) or rgba(r, g, b, a)
	const rgba = raw.match(
		/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
	);
	if (rgba) return [+rgba[1], +rgba[2], +rgba[3]];

	// #hex
	if (raw.startsWith('#')) {
		const h = raw.replace('#', '');
		const n =
			h.length === 3
				? parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16)
				: parseInt(h, 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}
	return null;
}

function luminance([r, g, b]: RGB): number {
	// Relative luminance (sRGB → linear)
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function rgbToHsl(r: number, g: number, b: number): HSL {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
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

function hslToRgb(h: number, s: number, l: number): RGB {
	h = ((h % 1) + 1) % 1;
	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	if (s === 0) {
		const v = Math.round(l * 255);
		return [v, v, v];
	}
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [
		Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		Math.round(hue2rgb(p, q, h) * 255),
		Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
	];
}

function rgbStr(r: number, g: number, b: number): string {
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function rgba(r: number, g: number, b: number, a: number): string {
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Mix two colors. t=0 → c1, t=1 → c2. */
function mix(c1: RGB, c2: RGB, t: number): RGB {
	return [
		Math.round(c1[0] + (c2[0] - c1[0]) * t),
		Math.round(c1[1] + (c2[1] - c1[1]) * t),
		Math.round(c1[2] + (c2[2] - c1[2]) * t),
	];
}

// ── Text color detection ────────────────────────────────

/**
 * Common CSS variable names for text / foreground color used by popular frameworks.
 */
const TEXT_VAR_CANDIDATES = [
	// Generic
	'--text',
	'--text-color',
	'--color-text',
	'--foreground',            // Shadcn/ui
	'--color-foreground',
	// Bootstrap
	'--bs-body-color',
	// Chakra
	'--chakra-colors-text',
	'--chakra-colors-gray-800',
	// Material
	'--md-sys-color-on-background',
	'--mdc-theme-on-surface',
	// DaisyUI
	'--bc',                    // DaisyUI base-content
	// Radix
	'--gray-12',
	// Open Props
	'--text-1',
];

/**
 * Probe the host page for a usable text (foreground) color.
 * Uses the same three-pass strategy as `probeBackground()`:
 *   1. CSS custom-property probe on :root (discrete, not animated)
 *   2. Inline-style walk (`element.style.color` — immune to CSS transitions)
 *   3. Computed-style walk (`getComputedStyle().color`)
 *
 * After probing, validates that the text color has adequate contrast against
 * the given background. If contrast is poor (WCAG ratio < 3:1), returns null
 * so the caller can derive text from the background luminance.
 */
function probeTextColor(el: HTMLElement, bg: RGB): RGB | null {
	const candidates: RGB[] = [];

	// 1. Try common CSS variables on :root (discrete, never animated)
	try {
		const rootCs = getComputedStyle(document.documentElement);
		for (const name of TEXT_VAR_CANDIDATES) {
			const val = rootCs.getPropertyValue(name).trim();
			if (val) {
				const rgb = parseColor(val);
				if (rgb) { candidates.push(rgb); break; }
			}
		}
	} catch { /* ignore */ }

	// 2. Walk up the DOM reading *inline* style.color
	let node: HTMLElement | null = el;
	while (node) {
		const raw = node.style.color;
		if (raw) {
			const rgb = parseColor(raw);
			if (rgb) { candidates.push(rgb); break; }
		}
		node = node.parentElement;
	}

	// 3. Walk up the DOM reading *computed* color
	node = el;
	while (node) {
		try {
			const raw = getComputedStyle(node).color;
			const rgb = parseColor(raw);
			if (rgb) { candidates.push(rgb); break; }
		} catch { /* ignore */ }
		node = node.parentElement;
	}

	// Pick the first candidate with adequate contrast against the background.
	// WCAG AA large-text minimum is 3:1.
	const bgLum = luminance(bg);
	for (const c of candidates) {
		const cLum = luminance(c);
		const ratio = (Math.max(bgLum, cLum) + 0.05) / (Math.min(bgLum, cLum) + 0.05);
		if (ratio >= 3) return c;
	}

	// All probed colors have poor contrast — let the caller derive from BG.
	return null;
}

// ── Accent detection ────────────────────────────────────

/**
 * Common CSS variable names used by popular frameworks/design systems
 * for their primary/brand accent color.
 */
const ACCENT_VAR_CANDIDATES = [
	// Generic
	'--accent',
	'--accent-color',
	'--primary',
	'--primary-color',
	'--brand',
	'--brand-color',
	'--theme-color',
	'--color-primary',
	'--color-accent',
	// Tailwind / DaisyUI
	'--p',             // DaisyUI primary
	'--color-primary',
	// Shadcn/ui
	'--primary',
	// MUI / Material
	'--md-sys-color-primary',
	'--mdc-theme-primary',
	// Bootstrap
	'--bs-primary',
	'--bs-primary-rgb',
	// Chakra
	'--chakra-colors-brand-500',
	'--chakra-colors-primary',
	// Open Props
	'--blue-6',
	// Radix
	'--accent-9',
	// Generic numbered
	'--color-primary-500',
	'--primary-500',
];

/**
 * Try to extract a usable accent color from the host page.
 * Priority: CSS variables → link color → selection color → null.
 */
function probeAccent(root: HTMLElement): RGB | null {
	let cs: CSSStyleDeclaration;
	try {
		cs = getComputedStyle(root);
	} catch {
		return null;
	}

	// 1. Try known CSS custom properties
	for (const name of ACCENT_VAR_CANDIDATES) {
		const val = cs.getPropertyValue(name).trim();
		if (val) {
			const rgb = parseColor(val);
			if (rgb) {
				const [, s] = rgbToHsl(...rgb);
				// Only accept if it has some saturation (not grey)
				if (s > 0.15) return rgb;
			}
		}
	}

	// 2. Try <a> link color (often the brand color)
	const link = root.querySelector('a[href]') as HTMLElement | null;
	if (link) {
		const lc = parseColor(getComputedStyle(link).color);
		if (lc) {
			const [, s] = rgbToHsl(...lc);
			if (s > 0.2) return lc;
		}
	}

	// 3. Try the OS accent color (CSS `AccentColor` keyword)
	const accent = cs.getPropertyValue('accent-color').trim();
	if (accent && accent !== 'auto') {
		const rgb = parseColor(accent);
		if (rgb) return rgb;
	}

	// 4. Try button/input accent
	const btn = root.querySelector('button:not([class*="cal-"])') as HTMLElement | null;
	if (btn) {
		const bg = parseColor(getComputedStyle(btn).backgroundColor);
		if (bg) {
			const [, s] = rgbToHsl(...bg);
			if (s > 0.25) return bg;
		}
	}

	return null;
}

// ── Font detection ──────────────────────────────────────

function probeFonts(el: HTMLElement): { sans: string; mono: string } {
	let bodyFont = 'system-ui, sans-serif';
	try {
		const cs = getComputedStyle(el);
		if (cs.fontFamily) bodyFont = cs.fontFamily;
	} catch {
		// getComputedStyle may fail in test environments
	}

	// For monospace, check if the page defines one
	const pre = el.querySelector('pre, code, .mono, [class*="mono"]') as HTMLElement | null;
	let mono = "ui-monospace, 'SFMono-Regular', monospace";
	if (pre) {
		try {
			const pf = getComputedStyle(pre).fontFamily;
			if (pf) mono = pf;
		} catch { /* ignore */ }
	}

	return { sans: bodyFont, mono };
}

// ── Background walking ──────────────────────────────────

/**
 * Common CSS variable names for background color used by popular frameworks.
 */
const BG_VAR_CANDIDATES = [
	'--bg',
	'--background',
	'--color-bg',
	'--color-background',
	'--body-bg',
	'--bs-body-bg',                    // Bootstrap
	'--chakra-colors-bg',              // Chakra
	'--md-sys-color-background',       // Material
	'--b1',                            // DaisyUI base
	'--background',                    // Shadcn/ui
	'--color-background',              // Radix / generic
];

/**
 * Walk up the DOM tree to find the first non-transparent background.
 * Also probes common CSS variables for background color.
 * Returns the parsed RGB and whether this is a dark background.
 *
 * Uses a three-pass strategy:
 *   1. CSS custom-property probe on :root (instant, not animated)
 *   2. Inline-style walk (reads `element.style.background` — the *target*
 *      value, immune to CSS `transition` interpolation)
 *   3. Computed-style walk (reads `getComputedStyle().backgroundColor` —
 *      may return a mid-transition intermediate value)
 *
 * Passes 1-2 are preferred because CSS transitions animate the resolved
 * `background-color` property, making `getComputedStyle` unreliable
 * during the transition window.
 */
function probeBackground(el: HTMLElement): { bg: RGB; isDark: boolean } {
	const result = (rgb: RGB) => ({ bg: rgb, isDark: luminance(rgb) < 0.4 });

	// 1. Try common CSS variables on the root element (discrete, never animated)
	try {
		const rootCs = getComputedStyle(document.documentElement);
		for (const name of BG_VAR_CANDIDATES) {
			const val = rootCs.getPropertyValue(name).trim();
			if (val) {
				const rgb = parseColor(val);
				if (rgb) return result(rgb);
			}
		}
	} catch { /* ignore */ }

	// 2. Walk up the DOM reading *inline* style.background / style.backgroundColor.
	//    Inline styles reflect the declared target value, not the transition
	//    midpoint, so they're reliable even while a CSS transition is running.
	let node: HTMLElement | null = el;
	while (node) {
		const raw = node.style.backgroundColor || node.style.background;
		if (raw) {
			const rgb = parseColor(raw);
			if (rgb) return result(rgb);
		}
		node = node.parentElement;
	}

	// 3. Fall back to computed backgroundColor (may be mid-transition, but
	//    still correct when no transition is active).
	node = el;
	while (node) {
		try {
			const raw = getComputedStyle(node).backgroundColor;
			const rgb = parseColor(raw);
			if (rgb) return result(rgb);
		} catch {
			// getComputedStyle may fail in test environments
		}
		node = node.parentElement;
	}

	// 4. Ultimate fallback: check color-scheme preference
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return { bg: [18, 18, 18], isDark: true };
	}
	return { bg: [255, 255, 255], isDark: false };
}

// ── Theme generation ────────────────────────────────────

/** Options for fine-tuning auto-detection behavior. */
export interface AutoThemeOptions {
	/**
	 * Force light or dark mode instead of auto-detecting.
	 * Useful when the host page has a known color scheme.
	 */
	mode?: 'light' | 'dark' | 'auto';

	/**
	 * Override the accent color (hex). Skips accent probing.
	 * Example: '#2563eb'
	 */
	accent?: string;

	/**
	 * Override the font stack. Skips font probing.
	 * Example: '"Inter", system-ui, sans-serif'
	 */
	font?: string;
}

/**
 * Probe the host page surrounding `el` and generate a complete --dt-* CSS string.
 *
 * @param el       The calendar's root element (or any element in the host page).
 * @param options  Optional overrides for mode, accent, font.
 * @returns        A CSS inline-style string of --dt-* custom properties.
 */
export function probeHostTheme(
	el: HTMLElement,
	options: AutoThemeOptions = {},
): string {
	// Start probing from the parent — `el` itself is the calendar root, which
	// has its own --dt-bg fallback in CSS. We need the *host page's* context.
	const host = el.parentElement ?? el;
	const htmlRoot = (host.closest('body') ?? host) instanceof HTMLElement
		? (host.closest('body') ?? host) as HTMLElement
		: document.body;

	// ── Background & mode ──
	const { bg, isDark: autoDark } = probeBackground(host);
	const isDark = options.mode === 'auto' || !options.mode ? autoDark : options.mode === 'dark';

	// ── Accent color ──
	let accent: RGB;
	if (options.accent) {
		accent = parseColor(options.accent) ?? [37, 99, 235];
	} else {
		accent = probeAccent(htmlRoot) ?? (isDark ? [239, 68, 68] : [37, 99, 235]);
	}
	const [aH, aS, aL] = rgbToHsl(...accent);

	// ── Fonts ──
	// When auto-probing, use `inherit` so the calendar naturally inherits the
	// host page's font via CSS inheritance. Probing getComputedStyle().fontFamily
	// and re-declaring it can break the cascade (resolved names differ from the
	// authored font stack). Only use an explicit value if the user overrides.
	const fonts = options.font
		? { sans: options.font, mono: "ui-monospace, 'SFMono-Regular', monospace" }
		: { sans: 'inherit', mono: "ui-monospace, 'SFMono-Regular', monospace" };

	// ── Text colors (probe host's actual text, validate contrast) ──
	const probedText = probeTextColor(host, bg);
	const textBase: RGB = probedText ?? (isDark ? [226, 232, 240] : [30, 30, 46]);

	// ── Generate surfaces ──
	// The probed color is the host page background. The calendar should feel
	// like a card sitting *on* that page, so we lift it slightly toward white
	// (dark mode) or darken it a hair (light mode) for subtle depth.
	const calBg = isDark
		? mix(bg, [255, 255, 255], 0.02)   // barely perceptible lift
		: mix(bg, [0, 0, 0], 0.005);        // near-invisible darken

	const stageBg = bg;                      // stage = the actual page bg

	const surface = isDark
		? mix(calBg, [255, 255, 255], 0.04) // surface: lift from card
		: mix(calBg, [0, 0, 0], 0.02);      // slightly darker stripe

	// ── Border colors ──
	const borderAlpha = isDark ? 0.07 : 0.08;
	const borderDayAlpha = isDark ? 0.14 : 0.14;
	const borderRgb: RGB = isDark ? [148, 163, 184] : [0, 0, 0];

	// ── Accent derivatives ──
	const accentDim = isDark ? 0.15 : 0.12;
	const glow = isDark ? 0.30 : 0.25;
	const todayBg = isDark ? 0.03 : 0.04;

	// Ensure accent is readable on the background — adjust lightness if needed
	const accentL = isDark
		? Math.max(aL, 0.45)  // bright enough on dark
		: Math.min(aL, 0.48); // dark enough on light
	const accentAdj = hslToRgb(aH, Math.max(aS, 0.5), accentL);

	// btn-text: white for dark accents, dark for light accents
	const accentLum = luminance(accentAdj);
	const btnText = accentLum < 0.4 ? '#ffffff' : '#1a1a2e';

	// ── Scrollbar ──
	const scrollAlpha = isDark ? 0.12 : 0.10;

	// ── Success (green, theme-adapted) ──
	const successRgb: RGB = isDark ? [74, 222, 128] : [22, 163, 74];

	// ── Assemble CSS string ──
	const vars = [
		`--dt-stage-bg: ${rgbStr(...stageBg)}`,
		`--dt-bg: ${rgbStr(...calBg)}`,
		`--dt-surface: ${rgbStr(...surface)}`,
		`--dt-border: ${rgba(...borderRgb, borderAlpha)}`,
		`--dt-border-day: ${rgba(...borderRgb, borderDayAlpha)}`,
		`--dt-text: ${rgba(...textBase, isDark ? 0.87 : 0.87)}`,
		`--dt-text-2: ${rgba(...textBase, isDark ? 0.55 : 0.54)}`,
		`--dt-text-3: ${rgba(...textBase, isDark ? 0.38 : 0.38)}`,
		`--dt-accent: ${rgbStr(...accentAdj)}`,
		`--dt-accent-dim: ${rgba(...accentAdj, accentDim)}`,
		`--dt-glow: ${rgba(...accentAdj, glow)}`,
		`--dt-today-bg: ${rgba(...accentAdj, todayBg)}`,
		`--dt-btn-text: ${btnText}`,
		`--dt-scrollbar: ${rgba(...borderRgb, scrollAlpha)}`,
		`--dt-success: ${rgba(...successRgb, 0.7)}`,
		`--dt-sans: ${fonts.sans}`,
		`--dt-mono: ${fonts.mono}`,
	];

	return vars.map((v) => `\t${v}`).join(';\n') + ';';
}

/**
 * Observe changes to the host page that might affect theming
 * (color-scheme toggle, class changes on <html>/<body>, style attribute changes).
 *
 * Returns a cleanup function to stop observing.
 *
 * @param el        The calendar's root element.
 * @param callback  Called with the new CSS string whenever the host theme changes.
 * @param options   Passthrough to probeHostTheme.
 */
export function observeHostTheme(
	el: HTMLElement,
	callback: (vars: string) => void,
	options: AutoThemeOptions = {},
): () => void {
	let last = '';
	const update = () => {
		const next = probeHostTheme(el, options);
		if (next !== last) {
			last = next;
			callback(next);
		}
	};

	// 1. Respond to system color-scheme changes
	const hasMQL = typeof window.matchMedia === 'function';
	const mql = hasMQL ? window.matchMedia('(prefers-color-scheme: dark)') : null;
	const onScheme = () => update();
	mql?.addEventListener('change', onScheme);

	// 2. Observe class/style changes on <html> and <body> (common theme-toggle pattern)
	let rafId = 0;
	const scheduleUpdate = () => {
		// Cancel any pending probe — multiple mutations (html + body) often fire
		// in quick succession. Use double-rAF so all style changes have been
		// applied and composited before we read computed styles.
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			rafId = requestAnimationFrame(update);
		});
	};

	const observer = new MutationObserver(scheduleUpdate);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class', 'style', 'data-theme', 'data-mode', 'color-scheme'],
	});
	observer.observe(document.body, {
		attributes: true,
		attributeFilter: ['class', 'style', 'data-theme', 'data-mode', 'color-scheme'],
	});

	// Initial probe
	update();

	return () => {
		cancelAnimationFrame(rafId);
		mql?.removeEventListener('change', onScheme);
		observer.disconnect();
	};
}
