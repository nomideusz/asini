/**
 * Shared TypeScript types for the timeline design system.
 */

/**
 * Represents an event on the timeline / scheduler.
 * Core interface for all views, adapters, and the event store.
 */
/**
 * Event status — universal across scheduling domains.
 *
 *   'confirmed'  — default, normal event
 *   'cancelled'  — visually struck through, still shown on grid
 *   'tentative'  — e.g. awaiting confirmation
 */
export type EventStatus = 'confirmed' | 'cancelled' | 'tentative';

export interface TimelineEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color?: string;
	/** True for all-day events (no specific start/end time) */
	allDay?: boolean;
	/** Category for grouping (e.g. "wellness", "work", "life") */
	category?: string;
	/** Subtitle displayed below the title (e.g. instructor name, level) */
	subtitle?: string;
	/** Tags displayed as small pills (e.g. ["Beginner", "Yoga"]) */
	tags?: string[];

	// ── Universal scheduling fields ──

	/**
	 * Location or room where the event takes place.
	 * Universal across domains: yoga studio, meeting room, classroom, venue.
	 */
	location?: string;

	/**
	 * Event status. Defaults to `'confirmed'` when omitted.
	 * Cancelled events are visually distinct but still shown on the grid.
	 */
	status?: EventStatus;

	/**
	 * ID from the external / upstream system (e.g. booking platform,
	 * CRM, LMS). Preserved during mapping so the consumer can
	 * cross-reference back to the source.
	 */
	externalId?: string;

	/**
	 * Resource this event belongs to — for multi-resource views.
	 * Could be a room ID, instructor ID, court number, etc.
	 * The calendar can group columns/lanes by this value.
	 */
	resourceId?: string;

	/** Arbitrary payload from the source app (bookings, attendees, etc.) */
	data?: Record<string, unknown>;
}

/**
 * Represents a blocked/unavailable time slot on the calendar.
 * Used to mark times when events cannot be created (e.g. lunch break, maintenance).
 */
export interface BlockedSlot {
	/** ISO weekday (1=Mon … 7=Sun). If omitted, applies to all days. */
	day?: number;
	/** Start hour (0–24, decimals allowed: 12.5 = 12:30) */
	start: number;
	/** End hour (0–24, decimals allowed: 13.5 = 1:30 PM) */
	end: number;
	/** Optional label shown on the blocked region */
	label?: string;
}
