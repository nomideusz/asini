// ─── Theme barrel export ────────────────────────────────
export {
	auto,
	neutral,
	midnight,
	presets,
} from './presets.js';
export type { PresetName } from './presets.js';

// ─── Smart auto-theme ───────────────────────────────────
export { probeHostTheme, observeHostTheme } from './auto.js';
export type { AutoThemeOptions } from './auto.js';
