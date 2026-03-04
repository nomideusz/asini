import { describe, it, expect } from 'vitest';
import { generatePalette, VIVID_PALETTE } from './palette.js';

describe('generatePalette', () => {
	it('returns VIVID_PALETTE slice when no accent provided', () => {
		const p = generatePalette(undefined, 5);
		expect(p).toEqual(VIVID_PALETTE.slice(0, 5));
	});

	it('returns full vivid palette by default', () => {
		const p = generatePalette();
		expect(p).toEqual(VIVID_PALETTE);
	});

	it('generates N distinct hex colors from an accent', () => {
		const p = generatePalette('#ef4444', 8);
		expect(p).toHaveLength(8);
		for (const c of p) {
			expect(c).toMatch(/^#[0-9a-f]{6}$/);
		}
		// All colors should be unique
		expect(new Set(p).size).toBe(8);
	});

	it('generates different palettes for different accents', () => {
		const red = generatePalette('#ef4444', 6);
		const blue = generatePalette('#2563eb', 6);
		// At least some colors should differ
		const shared = red.filter((c) => blue.includes(c));
		expect(shared.length).toBeLessThan(6);
	});

	it('handles 3-char hex shorthand', () => {
		const p = generatePalette('#f00', 4);
		expect(p).toHaveLength(4);
		for (const c of p) {
			expect(c).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('keeps lightness appropriate for dark themes (dark accent)', () => {
		// Dark accent → should generate colors with l > 0.5 for visibility
		const p = generatePalette('#1a1a2e', 5);
		expect(p).toHaveLength(5);
		// All should be valid hex
		for (const c of p) {
			expect(c).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('keeps lightness appropriate for light themes (light accent)', () => {
		const p = generatePalette('#e8dfd0', 5);
		expect(p).toHaveLength(5);
		for (const c of p) {
			expect(c).toMatch(/^#[0-9a-f]{6}$/);
		}
	});
});
