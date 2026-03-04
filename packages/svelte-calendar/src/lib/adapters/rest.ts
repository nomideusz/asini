/**
 * REST adapter skeleton — connect to any REST API.
 *
 * Override the URL builder and response mapper for your API shape.
 * This is a starting point; production use should add auth headers,
 * error handling, retry logic, etc.
 */
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter, DateRange } from './types.js';

export interface RestAdapterOptions {
	/** Base URL of the API (e.g. "https://api.example.com/v1") */
	baseUrl: string;
	/** Custom headers (e.g. Authorization) */
	headers?: Record<string, string>;
	/** Map API response to TimelineEvent[] */
	mapEvents?: (data: unknown) => TimelineEvent[];
	/** Map API response to a single TimelineEvent */
	mapEvent?: (data: unknown) => TimelineEvent;
}

export function createRestAdapter(options: RestAdapterOptions): CalendarAdapter {
	const { baseUrl, headers = {} } = options;

	const mapEvents =
		options.mapEvents ?? ((data: unknown) => data as TimelineEvent[]);
	const mapEvent =
		options.mapEvent ?? ((data: unknown) => data as TimelineEvent);

	async function request(
		path: string,
		init?: RequestInit,
	): Promise<unknown> {
		const res = await fetch(`${baseUrl}${path}`, {
			...init,
			headers: {
				'Content-Type': 'application/json',
				...headers,
				...((init?.headers as Record<string, string>) ?? {}),
			},
		});
		if (!res.ok) {
			throw new Error(`Calendar API error: ${res.status} ${res.statusText}`);
		}
		if (res.status === 204) return undefined;
		try {
			return await res.json();
		} catch {
			throw new Error(`Calendar API error: invalid JSON response from ${path}`);
		}
	}

	return {
		async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
			const params = new URLSearchParams({
				start: range.start.toISOString(),
				end: range.end.toISOString(),
			});
			const data = await request(`/events?${params}`);
			return mapEvents(data);
		},

		async createEvent(
			event: Omit<TimelineEvent, 'id'>,
		): Promise<TimelineEvent> {
			const data = await request('/events', {
				method: 'POST',
				body: JSON.stringify(event),
			});
			return mapEvent(data);
		},

		async updateEvent(
			id: string,
			patch: Partial<TimelineEvent>,
		): Promise<TimelineEvent> {
			const data = await request(`/events/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(patch),
			});
			return mapEvent(data);
		},

		async deleteEvent(id: string): Promise<void> {
			await request(`/events/${id}`, { method: 'DELETE' });
		},
	};
}
