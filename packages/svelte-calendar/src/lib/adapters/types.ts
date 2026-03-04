/**
 * CalendarAdapter — the integration contract.
 *
 * Any data source (REST API, GraphQL, local storage, in-memory)
 * implements this interface. The event store calls these methods
 * and the adapter handles persistence.
 */
import type { TimelineEvent } from '../core/types.js';

/** Simple date range for queries */
export interface DateRange {
	start: Date;
	end: Date;
}

export interface CalendarAdapter {
	/** Fetch events that overlap the given date range */
	fetchEvents(range: DateRange): Promise<TimelineEvent[]>;

	/** Create a new event, return it with a server-assigned ID */
	createEvent(event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent>;

	/** Update an event, return the full updated event */
	updateEvent(id: string, patch: Partial<TimelineEvent>): Promise<TimelineEvent>;

	/** Delete an event by ID */
	deleteEvent(id: string): Promise<void>;
}
