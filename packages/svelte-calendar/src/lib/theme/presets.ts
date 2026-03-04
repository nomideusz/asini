/**
 * Theme presets for timeline components.
 *
 * Each preset is a CSS inline-style string of --dt-* custom properties.
 * Pass to the `theme` prop of any timeline component.
 *
 * Presets:
 *   auto     — Transparent: inherit --dt-* from the host page (recommended default)
 *   neutral  — Explicit light theme: white bg, blue accent, works standalone
 *   midnight — Explicit dark theme: charcoal bg, red accent
 */

/**
 * Auto — triggers the smart auto-theme engine.
 *
 * When passed to Calendar's `theme` prop, the component will probe the host
 * page at mount time (background, fonts, accent color, light/dark mode)
 * and generate matching --dt-* CSS tokens automatically.
 *
 * Reactively watches for host theme changes (e.g. dark-mode toggle).
 *
 * If you want passive inheritance only (no probing), pass `autoTheme={false}`
 * alongside `theme={auto}`.
 */
export const auto = ``;

/**
 * Neutral — explicit light theme. White bg, blue accent, inherits host fonts.
 * Use when embedding standalone without ancestor --dt-* vars.
 */
export const neutral = `
	--dt-stage-bg: #ffffff;
	--dt-bg: #ffffff;
	--dt-surface: #f9fafb;
	--dt-border: rgba(0, 0, 0, 0.08);
	--dt-border-day: rgba(0, 0, 0, 0.14);
	--dt-text: rgba(0, 0, 0, 0.87);
	--dt-text-2: rgba(0, 0, 0, 0.54);
	--dt-text-3: rgba(0, 0, 0, 0.38);
	--dt-accent: #2563eb;
	--dt-accent-dim: rgba(37, 99, 235, 0.12);
	--dt-glow: rgba(37, 99, 235, 0.25);
	--dt-today-bg: rgba(37, 99, 235, 0.04);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(0, 0, 0, 0.1);
	--dt-success: rgba(22, 163, 74, 0.7);
	--dt-serif: inherit;
	--dt-sans: inherit;
	--dt-mono: ui-monospace, 'SFMono-Regular', monospace;
`;

/** Midnight Industrial — dark charcoal + red accent, tech monitoring */
export const midnight = `
	--dt-stage-bg: #080a0f;
	--dt-bg: #0b0e14;
	--dt-surface: #10141c;
	--dt-border: rgba(148, 163, 184, 0.07);
	--dt-border-day: rgba(148, 163, 184, 0.14);
	--dt-text: rgba(226, 232, 240, 0.85);
	--dt-text-2: rgba(148, 163, 184, 0.55);
	--dt-text-3: rgba(100, 116, 139, 0.55);
	--dt-accent: #ef4444;
	--dt-accent-dim: rgba(239, 68, 68, 0.18);
	--dt-glow: rgba(239, 68, 68, 0.35);
	--dt-today-bg: rgba(239, 68, 68, 0.02);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(148, 163, 184, 0.12);
	--dt-success: rgba(74, 222, 128, 0.7);
	--dt-serif: Georgia, 'Times New Roman', serif;
`;

/** All available presets keyed by name */
export const presets = { auto, neutral, midnight } as const;
export type PresetName = keyof typeof presets;
