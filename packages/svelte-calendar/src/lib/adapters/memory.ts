/**
 * In-memory adapter — the default for demos and testing.
 *
 * Events are stored in a plain array. No persistence across page loads.
 * Events without a `color` are auto-assigned one from a palette,
 * grouped by `category` or `title` so related events share a color.
 *
 * Usage:
 *   import { createMemoryAdapter } from '$lib/adapters';
 *   const adapter = createMemoryAdapter(initialEvents);
 *   const adapter = createMemoryAdapter(initialEvents, { palette: myColors });
 */
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter, DateRange } from './types.js';
import { VIVID_PALETTE } from '../core/palette.js';

export interface MemoryAdapterOptions {
	/**
	 * Custom color palette for auto-coloring events.
	 * Defaults to VIVID_PALETTE. Pass `generatePalette(accent)` to
	 * make event colors adapt to your theme.
	 */
	palette?: string[];
}

let counter = 0;
function uid(): string {
	return `mem-${Date.now()}-${++counter}`;
}

export function createMemoryAdapter(
	initial: TimelineEvent[] = [],
	options?: MemoryAdapterOptions,
): CalendarAdapter {
	const events: TimelineEvent[] = [...initial];
	const palette = options?.palette ?? VIVID_PALETTE;

	// Auto-color: assign from vivid palette by category/title
	const colorAssignments = new Map<string, string>();
	let colorIndex = 0;

	function resolveColor(ev: TimelineEvent): string | undefined {
		if (ev.color) return ev.color;
		const key = ev.category ?? ev.title;
		if (!colorAssignments.has(key)) {
			colorAssignments.set(key, palette[colorIndex % palette.length]);
			colorIndex++;
		}
		return colorAssignments.get(key);
	}

	function withColor(ev: TimelineEvent): TimelineEvent {
		const color = resolveColor(ev);
		return color ? { ...ev, color } : ev;
	}

	function overlaps(ev: TimelineEvent, range: DateRange): boolean {
		return ev.start < range.end && ev.end > range.start;
	}

	return {
		async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
			return events.filter((ev) => overlaps(ev, range)).map(withColor);
		},

		async createEvent(
			data: Omit<TimelineEvent, 'id'>,
		): Promise<TimelineEvent> {
			const ev: TimelineEvent = { ...data, id: uid() };
			events.push(ev);
			return withColor(ev);
		},

		async updateEvent(
			id: string,
			patch: Partial<TimelineEvent>,
		): Promise<TimelineEvent> {
			const idx = events.findIndex((e) => e.id === id);
			if (idx < 0) throw new Error(`Event not found: ${id}`);
			events[idx] = { ...events[idx], ...patch, id };
			return withColor(events[idx]);
		},

		async deleteEvent(id: string): Promise<void> {
			const idx = events.findIndex((e) => e.id === id);
			if (idx < 0) throw new Error(`Event not found: ${id}`);
			events.splice(idx, 1);
		},
	};
}
