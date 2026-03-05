/**
 * API endpoint for BookingFlow's SchedulerAdapter calls.
 *
 * Supports the subset of SchedulerAdapter methods that BookingFlow needs:
 * - getSlotById
 * - getTourById
 * - createSlot
 * - createBooking
 * - getSlots (for capacity checks)
 * - getBookingsForSlot
 * - updateSlot
 * - updateBookingStatus
 * - getBookingById
 * - getBookingByReference
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { method, args } = body as { method: string; args: unknown[] };

	const adapter = createDrizzleAdapter(getDb());

	// Whitelist of allowed methods to prevent arbitrary code execution
	const allowedMethods = new Set([
		'getSlotById',
		'getTourById',
		'createSlot',
		'createBooking',
		'getSlots',
		'getBookingsForSlot',
		'updateSlot',
		'updateBookingStatus',
		'getBookingById',
		'getBookingByReference',
	]);

	if (!allowedMethods.has(method)) {
		error(400, `Method not allowed: ${method}`);
	}

	const fn = adapter[method as keyof typeof adapter];
	if (typeof fn !== 'function') {
		error(400, `Unknown method: ${method}`);
	}

	// Deserialize Date objects from ISO strings in args
	const deserializedArgs = args.map((arg) => deserializeDates(arg));

	const result = await (fn as (...a: unknown[]) => Promise<unknown>).apply(
		adapter,
		deserializedArgs,
	);
	return json(result ?? null);
};

/**
 * Recursively walk through an object and convert ISO date strings back to Date objects.
 * Matches patterns like "2024-03-15T10:00:00.000Z" and date range objects.
 */
function deserializeDates(value: unknown): unknown {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
		return new Date(value);
	}
	if (Array.isArray(value)) {
		return value.map(deserializeDates);
	}
	if (value !== null && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			result[k] = deserializeDates(v);
		}
		return result;
	}
	return value;
}
