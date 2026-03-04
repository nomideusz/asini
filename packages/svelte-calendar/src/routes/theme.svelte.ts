/**
 * Demo-site theme state.
 *
 * The library ships only `auto` (inherit), `neutral` (light) and `midnight` (dark).
 * Demo themes here simulate different host pages / design systems so `auto` can
 * be tested against varied palettes. They are NOT the same as package presets.
 */
import { neutral } from '$lib/theme/presets.js';

// ── Demo-only theme CSS strings ───────────────────────────

/** Slate — steel-blue dark page with violet accent (distinct from package midnight) */
const slate = `
	--dt-stage-bg: #0c0f17;
	--dt-bg: #10131d;
	--dt-surface: #161a28;
	--dt-border: rgba(130, 148, 196, 0.08);
	--dt-border-day: rgba(130, 148, 196, 0.14);
	--dt-text: rgba(210, 218, 235, 0.85);
	--dt-text-2: rgba(150, 162, 196, 0.55);
	--dt-text-3: rgba(100, 112, 148, 0.50);
	--dt-accent: #8b5cf6;
	--dt-accent-dim: rgba(139, 92, 246, 0.15);
	--dt-glow: rgba(139, 92, 246, 0.30);
	--dt-today-bg: rgba(139, 92, 246, 0.03);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(130, 148, 196, 0.10);
	--dt-success: rgba(74, 222, 128, 0.7);
`;

const forest = `
	--dt-stage-bg: #060d09;
	--dt-bg: #081210;
	--dt-surface: #0d1a16;
	--dt-border: rgba(74, 222, 128, 0.07);
	--dt-border-day: rgba(74, 222, 128, 0.14);
	--dt-text: rgba(200, 230, 210, 0.85);
	--dt-text-2: rgba(134, 188, 160, 0.55);
	--dt-text-3: rgba(90, 140, 115, 0.55);
	--dt-accent: #10b981;
	--dt-accent-dim: rgba(16, 185, 129, 0.15);
	--dt-glow: rgba(16, 185, 129, 0.30);
	--dt-today-bg: rgba(16, 185, 129, 0.03);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(74, 222, 128, 0.10);
	--dt-success: rgba(74, 222, 128, 0.7);
`;

const ocean = `
	--dt-stage-bg: #f0f7ff;
	--dt-bg: #f6faff;
	--dt-surface: #eaf3ff;
	--dt-border: rgba(0, 100, 180, 0.08);
	--dt-border-day: rgba(0, 100, 180, 0.14);
	--dt-text: rgba(0, 30, 60, 0.87);
	--dt-text-2: rgba(0, 50, 100, 0.50);
	--dt-text-3: rgba(0, 60, 120, 0.35);
	--dt-accent: #0891b2;
	--dt-accent-dim: rgba(8, 145, 178, 0.12);
	--dt-glow: rgba(8, 145, 178, 0.25);
	--dt-today-bg: rgba(8, 145, 178, 0.04);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(0, 100, 180, 0.08);
	--dt-success: rgba(22, 163, 74, 0.7);
	--dt-sans: inherit;
`;

const rose = `
	--dt-stage-bg: #fff5f5;
	--dt-bg: #fffafa;
	--dt-surface: #fef2f2;
	--dt-border: rgba(180, 50, 80, 0.07);
	--dt-border-day: rgba(180, 50, 80, 0.13);
	--dt-text: rgba(60, 10, 20, 0.87);
	--dt-text-2: rgba(120, 40, 60, 0.50);
	--dt-text-3: rgba(140, 60, 80, 0.38);
	--dt-accent: #e11d48;
	--dt-accent-dim: rgba(225, 29, 72, 0.12);
	--dt-glow: rgba(225, 29, 72, 0.25);
	--dt-today-bg: rgba(225, 29, 72, 0.03);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(180, 50, 80, 0.08);
	--dt-success: rgba(22, 163, 74, 0.7);
	--dt-sans: inherit;
`;

// ── Demo theme registry ───────────────────────────────────

export type DemoThemeName = 'slate' | 'light' | 'forest' | 'ocean' | 'rose';

export interface DemoTheme {
	label: string;
	vars: string;
	dark: boolean;
	stageBg: string;
	accent: string;
}

export const demoThemes: Record<DemoThemeName, DemoTheme> = {
	slate:    { label: 'Slate',    vars: slate,    dark: true,  stageBg: '#0c0f17', accent: '#8b5cf6' },
	light:     { label: 'Light',     vars: neutral,  dark: false, stageBg: '#ffffff', accent: '#2563eb' },

	forest:   { label: 'Forest',   vars: forest,    dark: true,  stageBg: '#060d09', accent: '#10b981' },
	ocean:    { label: 'Ocean',    vars: ocean,     dark: false, stageBg: '#f0f7ff', accent: '#0891b2' },
	rose:     { label: 'Rose',     vars: rose,      dark: false, stageBg: '#fff5f5', accent: '#e11d48' },
};

export const demoThemeNames: DemoThemeName[] = ['slate', 'light', 'forest', 'ocean', 'rose'];

// ── Persistent state ──────────────────────────────────────

const STORAGE_KEY = 'svelte-calendar-theme';

function getStored(): DemoThemeName {
	if (typeof localStorage !== 'undefined') {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v && (v in demoThemes)) return v as DemoThemeName;
	}
	return 'slate';
}

export const themeStore = $state<{ current: DemoThemeName }>({ current: getStored() });

export function setTheme(name: DemoThemeName) {
	themeStore.current = name;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, name);
	}
}
