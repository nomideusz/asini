/**
 * Reactive drag state — tracks drag-to-create, drag-to-move, and resize operations.
 *
 * This is a state machine, not actual DOM event handling.
 * View components use Svelte `use:` actions (from actions/) to wire
 * pointer events → this state. The engine reads this state and commits
 * changes to the event store on drop.
 */

export type DragMode = 'none' | 'create' | 'move' | 'resize-start' | 'resize-end';

export interface DragPayload {
	/** The event being dragged (null for create) */
	eventId: string | null;
	/** Current tentative start */
	start: Date;
	/** Current tentative end */
	end: Date;
	/** Which day column / row is the pointer over */
	dayIndex: number;
}

export interface DragState {
	readonly mode: DragMode;
	readonly payload: DragPayload | null;
	readonly active: boolean;

	beginCreate(start: Date, end: Date, dayIndex?: number): void;
	beginMove(eventId: string, start: Date, end: Date): void;
	beginResize(eventId: string, edge: 'start' | 'end', start: Date, end: Date): void;
	updatePointer(start: Date, end: Date, dayIndex?: number): void;
	commit(): DragPayload | null;
	cancel(): void;
}

export function createDragState(): DragState {
	let mode = $state<DragMode>('none');
	let payload = $state<DragPayload | null>(null);

	const active = $derived(mode !== 'none');

	function reset() {
		mode = 'none';
		payload = null;
	}

	return {
		get mode() {
			return mode;
		},
		get payload() {
			return payload;
		},
		get active() {
			return active;
		},

		beginCreate(start: Date, end: Date, dayIndex = 0) {
			mode = 'create';
			payload = { eventId: null, start, end, dayIndex };
		},

		beginMove(eventId: string, start: Date, end: Date) {
			mode = 'move';
			payload = { eventId, start, end, dayIndex: 0 };
		},

		beginResize(eventId: string, edge: 'start' | 'end', start: Date, end: Date) {
			mode = edge === 'start' ? 'resize-start' : 'resize-end';
			payload = { eventId, start, end, dayIndex: 0 };
		},

		updatePointer(start: Date, end: Date, dayIndex?: number) {
			if (!payload) return;
			payload = {
				...payload,
				start,
				end,
				...(dayIndex !== undefined ? { dayIndex } : {}),
			};
		},

		commit(): DragPayload | null {
			const result = payload;
			reset();
			return result;
		},

		cancel() {
			reset();
		},
	};
}
