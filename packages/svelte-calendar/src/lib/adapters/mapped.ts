/**
 * Mapped adapter — universal adapter factory for external schedule data.
 *
 * Takes any array of external records (yoga classes, gym schedules,
 * medical appointments, school timetables, etc.) and a mapping
 * configuration that describes how to extract `TimelineEvent` fields
 * from each record.
 *
 * Two usage modes:
 *   1. **Field mapping** — declarative config mapping field names:
 *        createMappedAdapter(rawEvents, {
 *          fields: { title: 'class_name', start: 'starts_at_iso', ... }
 *        });
 *
 *   2. **Custom mapper** — full control via a transform function:
 *        createMappedAdapter(rawEvents, {
 *          mapEvent: (raw, i) => ({ id: raw.ref, title: raw.name, ... })
 *        });
 *
 * The adapter is read-only by default (no create/update/delete).
 * Pass `readOnly: false` and supply mutation callbacks to enable writes.
 */
import type { TimelineEvent, EventStatus } from '../core/types.js';
import type { CalendarAdapter, DateRange } from './types.js';
import { VIVID_PALETTE } from '../core/palette.js';

// ── Public types ────────────────────────────────────────

/**
 * Declarative field mapping from external record keys to TimelineEvent fields.
 *
 * Each value is a key name (string) of the source object whose value
 * will be used for the corresponding TimelineEvent field.
 *
 * For `start` and `end`, the source value can be:
 *   - an ISO 8601 string  ("2026-03-03T07:00:00+01:00")
 *   - a Date object
 *   - a Unix timestamp (number, ms)
 *   - a pair of date + time strings when using `startDate`+`startTime`
 */
export interface FieldMapping {
	/** Source key for `id`. Falls back to `reference_id`, `externalId`, or auto-generated. */
	id?: string;
	/** Source key for `title` (required unless `mapEvent` is used) */
	title?: string;

	// ── Time ──
	/** Source key for a full start timestamp (ISO string, Date, or ms) */
	start?: string;
	/** Source key for a full end timestamp */
	end?: string;
	/**
	 * Source key for a date-only string (e.g. "2026-03-03").
	 * Combined with `startTime` / `endTime` when `start`/`end` are not available.
	 */
	date?: string;
	/** Source key for start time string (e.g. "07:00") — combined with `date` */
	startTime?: string;
	/** Source key for end time string (e.g. "08:15") — combined with `date` */
	endTime?: string;

	// ── Display ──
	/** Source key for `color` */
	color?: string;
	/** Source key for `subtitle` */
	subtitle?: string;
	/** Source key for `location` */
	location?: string;
	/** Source key for `category` */
	category?: string;
	/** Source key for `resourceId` */
	resourceId?: string;
	/** Source key for `externalId` */
	externalId?: string;

	// ── Status ──
	/**
	 * Source key for status. The source value is coerced:
	 *   - boolean `true`/`false` on an `is_cancelled`-type field → 'cancelled'/'confirmed'
	 *   - string 'cancelled'/'tentative'/'confirmed' used directly
	 */
	status?: string;

	/**
	 * Source keys that should be collected as tags.
	 * Each key's value is included as a tag if truthy/non-empty.
	 * String values are used directly; booleans use the key name.
	 */
	tags?: string[];
}

export interface MappedAdapterOptions<T = Record<string, unknown>> {
	/**
	 * Declarative field mapping — quick way to wire external fields
	 * to TimelineEvent properties.
	 */
	fields?: FieldMapping;

	/**
	 * Custom mapper function — full control over the transformation.
	 * When provided, `fields` is ignored.
	 */
	mapEvent?: (raw: T, index: number) => TimelineEvent;

	/**
	 * Fields to always include in `data` (the catch-all payload).
	 * Pass `'*'` to include all unmapped source fields.
	 * @default '*'
	 */
	includeData?: string[] | '*';

	/**
	 * When true (default), ignore source colors and auto-assign from
	 * the palette grouped by category / title.  This keeps the calendar
	 * visually consistent regardless of the upstream source.
	 * Set to `false` to preserve the original colors from the data.
	 * @default true
	 */
	autoColor?: boolean;

	/**
	 * Color palette used for auto-coloring.
	 * Defaults to VIVID_PALETTE.
	 */
	palette?: string[];

	/**
	 * When true (default), create/update/delete throw an error.
	 * Set to false and provide `onMutate` to enable writes.
	 */
	readOnly?: boolean;

	/**
	 * Optional mutation handler for write operations.
	 * Only used when `readOnly` is false.
	 */
	onMutate?: MutationHandler<T>;
}

export interface MutationHandler<T = Record<string, unknown>> {
	onCreate?: (event: Omit<TimelineEvent, 'id'>) => Promise<T>;
	onUpdate?: (id: string, patch: Partial<TimelineEvent>) => Promise<T>;
	onDelete?: (id: string) => Promise<void>;
}

// ── Internal helpers ────────────────────────────────────

let counter = 0;
function uid(): string {
	return `mapped-${Date.now()}-${++counter}`;
}

/** Parse a date/time value into a Date object */
function toDate(value: unknown): Date {
	if (value instanceof Date) return value;
	if (typeof value === 'number') return new Date(value);
	if (typeof value === 'string') {
		const d = new Date(value);
		if (isNaN(d.getTime())) {
			throw new Error(`Cannot parse date: "${value}"`);
		}
		return d;
	}
	throw new Error(`Cannot convert to Date: ${typeof value}`);
}

/** Combine "YYYY-MM-DD" date and "HH:MM" time into a Date */
function combineDateAndTime(dateStr: string, timeStr: string): Date {
	// Handle various date formats
	const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
	const d = new Date(`${datePart}T${timeStr}:00`);
	if (isNaN(d.getTime())) {
		throw new Error(`Cannot combine date "${dateStr}" and time "${timeStr}"`);
	}
	return d;
}

/** Coerce a source value into an EventStatus */
function coerceStatus(value: unknown, fieldName: string): EventStatus {
	if (typeof value === 'string') {
		const lower = value.toLowerCase();
		if (lower === 'cancelled' || lower === 'canceled') return 'cancelled';
		if (lower === 'tentative') return 'tentative';
		return 'confirmed';
	}
	if (typeof value === 'boolean') {
		// E.g. is_cancelled: true → 'cancelled'
		const lowerField = fieldName.toLowerCase();
		if (lowerField.includes('cancel')) return value ? 'cancelled' : 'confirmed';
		if (lowerField.includes('tentative')) return value ? 'tentative' : 'confirmed';
		return value ? 'confirmed' : 'tentative';
	}
	return 'confirmed';
}

/** Parse an RGB string like "rgb(62, 101, 255)" to a hex color */
function normalizeColor(value: unknown): string | undefined {
	if (!value) return undefined;
	if (typeof value !== 'string') return undefined;

	const str = value.trim();
	// Already hex
	if (str.startsWith('#')) return str;
	// rgb(r, g, b) format
	const rgbMatch = str.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
	if (rgbMatch) {
		const r = parseInt(rgbMatch[1], 10);
		const g = parseInt(rgbMatch[2], 10);
		const b = parseInt(rgbMatch[3], 10);
		return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
	}
	// CSS named colors and other formats — pass through
	return str;
}

/**
 * Collect unmapped fields into the `data` payload.
 */
function collectData(
	raw: Record<string, unknown>,
	mappedKeys: Set<string>,
	include: string[] | '*',
): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	const keys = include === '*' ? Object.keys(raw) : include;
	for (const key of keys) {
		if (!mappedKeys.has(key) && raw[key] !== undefined) {
			data[key] = raw[key];
		}
	}
	return data;
}

// ── Factory ─────────────────────────────────────────────

/**
 * Create a CalendarAdapter from an array of external records + mapping config.
 *
 * @example
 * ```ts
 * // Yoga school schedule
 * const adapter = createMappedAdapter(yogaSchedule.events, {
 *   fields: {
 *     title: 'class_name',
 *     start: 'starts_at_iso',
 *     end: 'ends_at_iso',
 *     subtitle: 'teacher',
 *     location: 'room',
 *     color: 'color',
 *     externalId: 'reference_id',
 *     status: 'is_cancelled',
 *     tags: ['is_free', 'is_bookable_online'],
 *   },
 * });
 *
 * // Medical appointments
 * const adapter = createMappedAdapter(appointments, {
 *   fields: {
 *     title: 'procedure_name',
 *     start: 'scheduled_at',
 *     end: 'scheduled_end',
 *     subtitle: 'doctor_name',
 *     location: 'office',
 *     resourceId: 'doctor_id',
 *   },
 * });
 *
 * // Full custom mapper
 * const adapter = createMappedAdapter(rawData, {
 *   mapEvent: (raw) => ({
 *     id: raw.uid,
 *     title: `${raw.first_name} ${raw.last_name}`,
 *     start: new Date(raw.timestamp),
 *     end: new Date(raw.timestamp + raw.duration_ms),
 *     location: raw.room,
 *   }),
 * });
 * ```
 */
export function createMappedAdapter<T extends Record<string, unknown> = Record<string, unknown>>(
	sourceData: T[],
	options: MappedAdapterOptions<T> = {},
): CalendarAdapter {
	const {
		fields,
		mapEvent: customMapper,
		includeData = '*',
		autoColor = true,
		palette = VIVID_PALETTE,
		readOnly = true,
	} = options;

	// Build the internal event list
	const events: TimelineEvent[] = [];
	const colorAssignments = new Map<string, string>();
	let colorIndex = 0;

	function resolveColor(ev: TimelineEvent): string | undefined {
		// When autoColor is on, always assign from palette (ignore source color)
		if (!autoColor && ev.color) return ev.color;
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

	/**
	 * Map a single raw record using the declarative field mapping.
	 */
	function mapWithFields(raw: T, index: number): TimelineEvent {
		const f = fields!;
		const r = raw as Record<string, unknown>;

		// ── ID ──
		const id = f.id
			? String(r[f.id] ?? '')
			: String(r['id'] ?? r['reference_id'] ?? r['externalId'] ?? r['_id'] ?? uid());

		// ── Title ──
		const titleKey = f.title ?? 'title';
		const title = String(r[titleKey] ?? r['name'] ?? r['class_name'] ?? `Event ${index + 1}`);

		// ── Start / End ──
		let start: Date;
		let end: Date;

		if (f.start && r[f.start] !== undefined) {
			start = toDate(r[f.start]);
		} else if (f.date && f.startTime && r[f.date] && r[f.startTime]) {
			start = combineDateAndTime(String(r[f.date]), String(r[f.startTime]));
		} else if (r['start'] !== undefined) {
			start = toDate(r['start']);
		} else if (r['starts_at_iso'] !== undefined) {
			start = toDate(r['starts_at_iso']);
		} else if (r['start_time'] !== undefined && r['date'] !== undefined) {
			start = combineDateAndTime(String(r['date']), String(r['start_time']));
		} else {
			throw new Error(`Cannot determine start time for record ${index}: no matching field found`);
		}

		if (f.end && r[f.end] !== undefined) {
			end = toDate(r[f.end]);
		} else if (f.date && f.endTime && r[f.date] && r[f.endTime]) {
			end = combineDateAndTime(String(r[f.date]), String(r[f.endTime]));
		} else if (r['end'] !== undefined) {
			end = toDate(r['end']);
		} else if (r['ends_at_iso'] !== undefined) {
			end = toDate(r['ends_at_iso']);
		} else if (r['end_time'] !== undefined && r['date'] !== undefined) {
			end = combineDateAndTime(String(r['date']), String(r['end_time']));
		} else {
			// Default: 1 hour after start
			end = new Date(start.getTime() + 60 * 60 * 1000);
		}

		// ── Optional fields ──
		const color = normalizeColor(r[f.color ?? 'color']);
		const subtitle = f.subtitle ? String(r[f.subtitle] ?? '') || undefined : undefined;
		const location = f.location
			? String(r[f.location] ?? '') || undefined
			: r['room'] ? String(r['room']) : r['location'] ? String(r['location']) : undefined;
		const category = f.category ? String(r[f.category] ?? '') || undefined : undefined;
		const resourceId = f.resourceId ? String(r[f.resourceId] ?? '') || undefined : undefined;
		const externalId = f.externalId
			? String(r[f.externalId] ?? '') || undefined
			: r['reference_id'] ? String(r['reference_id']) : undefined;

		// ── Status ──
		let status: EventStatus | undefined;
		if (f.status && r[f.status] !== undefined) {
			status = coerceStatus(r[f.status], f.status);
		} else if (r['is_cancelled'] !== undefined) {
			status = coerceStatus(r['is_cancelled'], 'is_cancelled');
		}

		// ── Tags ──
		let tags: string[] | undefined;
		if (f.tags && f.tags.length > 0) {
			tags = [];
			for (const tagKey of f.tags) {
				const val = r[tagKey];
				if (val === true) {
					// Convert key name to human-readable tag
					tags.push(tagKey.replace(/^is_/, '').replace(/_/g, ' '));
				} else if (typeof val === 'string' && val) {
					tags.push(val);
				}
			}
			if (tags.length === 0) tags = undefined;
		}

		// ── Data (unmapped fields) ──
		const mappedKeys = new Set<string>();
		for (const v of Object.values(f)) {
			if (typeof v === 'string') mappedKeys.add(v);
			if (Array.isArray(v)) v.forEach((k) => mappedKeys.add(k));
		}
		// Also mark auto-detected keys as mapped
		for (const k of ['id', 'title', 'name', 'class_name', 'start', 'end',
			'starts_at_iso', 'ends_at_iso', 'start_time', 'end_time', 'date',
			'color', 'room', 'location', 'reference_id', 'is_cancelled']) {
			mappedKeys.add(k);
		}
		const data = collectData(r, mappedKeys, includeData);

		const ev: TimelineEvent = { id, title, start, end };
		if (color) ev.color = color;
		if (subtitle) ev.subtitle = subtitle;
		if (location) ev.location = location;
		if (category) ev.category = category;
		if (resourceId) ev.resourceId = resourceId;
		if (externalId) ev.externalId = externalId;
		if (status && status !== 'confirmed') ev.status = status;
		if (tags) ev.tags = tags;
		if (Object.keys(data).length > 0) ev.data = data;

		return ev;
	}

	// ── Build events array ──
	for (let i = 0; i < sourceData.length; i++) {
		const mapper = customMapper ?? mapWithFields;
		const ev = withColor(mapper(sourceData[i], i));
		events.push(ev);
	}

	// ── Adapter interface ──

	function overlaps(ev: TimelineEvent, range: DateRange): boolean {
		return ev.start < range.end && ev.end > range.start;
	}

	return {
		async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
			return events.filter((ev) => overlaps(ev, range));
		},

		async createEvent(data: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> {
			if (readOnly) {
				throw new Error('Mapped adapter is read-only. Set readOnly: false and provide onMutate to enable writes.');
			}
			const handler = options.onMutate?.onCreate;
			if (handler) {
				const raw = await handler(data);
				const mapper = customMapper ?? mapWithFields;
				const ev = withColor(mapper(raw, events.length));
				events.push(ev);
				return ev;
			}
			// Fallback: create locally
			const ev: TimelineEvent = { ...data, id: uid() };
			events.push(withColor(ev));
			return ev;
		},

		async updateEvent(id: string, patch: Partial<TimelineEvent>): Promise<TimelineEvent> {
			if (readOnly) {
				throw new Error('Mapped adapter is read-only. Set readOnly: false and provide onMutate to enable writes.');
			}
			const idx = events.findIndex((e) => e.id === id);
			if (idx < 0) throw new Error(`Event not found: ${id}`);

			const handler = options.onMutate?.onUpdate;
			if (handler) {
				const raw = await handler(id, patch);
				const mapper = customMapper ?? mapWithFields;
				const ev = withColor(mapper(raw, idx));
				events[idx] = ev;
				return ev;
			}
			events[idx] = { ...events[idx], ...patch, id };
			return events[idx];
		},

		async deleteEvent(id: string): Promise<void> {
			if (readOnly) {
				throw new Error('Mapped adapter is read-only. Set readOnly: false and provide onMutate to enable writes.');
			}
			const handler = options.onMutate?.onDelete;
			if (handler) await handler(id);
			const idx = events.findIndex((e) => e.id === id);
			if (idx >= 0) events.splice(idx, 1);
		},
	};
}
