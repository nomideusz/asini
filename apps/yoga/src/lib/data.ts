// Re-export the canonical types from the DB queries layer.
// Pages get data via server load functions; this module provides
// shared types and pure utility helpers that run on both server & client.

export type { Listing, ScheduleEntryData as ScheduleEntry } from '$lib/server/db/queries';
import type { Listing } from '$lib/server/db/queries';

// ── Pure utility helpers (server & client) ──────────────────────────────────

/** Days since the price was last verified */
export function daysSincePriceCheck(listing: Listing): number {
  if (!listing.lastPriceCheck) return Infinity;
  const check = new Date(listing.lastPriceCheck);
  const now = new Date();
  return Math.floor((now.getTime() - check.getTime()) / 86_400_000);
}

/** Returns a freshness label for the price */
export type Freshness = 'fresh' | 'aging' | 'stale';

export function priceFreshness(listing: Listing): Freshness {
  const days = daysSincePriceCheck(listing);
  if (days <= 14) return 'fresh';
  if (days <= 30) return 'aging';
  return 'stale';
}

/** Polish month abbreviations */
const PL_MONTHS = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];

/** Format ISO date string as human-readable Polish date, e.g. "20 lut 2026" */
export function formatDatePL(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return `${d.getDate()} ${PL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Brutalist EU date format: DD.MM.YYYY */
export function formatDateEU(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Short relative label: "dziś", "2 dni temu", "3 tyg. temu", etc. */
export function relativeDate(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
  if (days <= 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  if (days < 30) return `${Math.floor(days / 7)} tyg. temu`;
  return `${Math.floor(days / 30)} mies. temu`;
}

/** ISO day-of-week number → Polish day name */
export const DAY_NAMES_PL: Record<number, string> = {
  0: 'Poniedziałek',
  1: 'Wtorek',
  2: 'Środa',
  3: 'Czwartek',
  4: 'Piątek',
  5: 'Sobota',
  6: 'Niedziela',
};

