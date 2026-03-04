/**
 * Reactive selection state — tracks selected and hovered events.
 *
 * Usage:
 *   const sel = createSelection();
 *   sel.selectedId   — currently selected event ID (or null)
 *   sel.hoveredId    — currently hovered event ID (or null)
 *   sel.selectedIds  — Set of selected IDs (multi-select)
 *   sel.select(id)   — select one event (clears multi)
 *   sel.toggle(id)   — toggle in multi-select
 *   sel.clear()      — deselect all
 */

export interface Selection {
	readonly selectedId: string | null;
	readonly hoveredId: string | null;
	readonly selectedIds: ReadonlySet<string>;

	select(id: string): void;
	deselect(): void;
	toggle(id: string): void;
	clear(): void;
	hover(id: string | null): void;
	isSelected(id: string): boolean;
}

export function createSelection(): Selection {
	let selectedId = $state<string | null>(null);
	let hoveredId = $state<string | null>(null);
	let selectedIds = $state<Set<string>>(new Set());

	return {
		get selectedId() {
			return selectedId;
		},
		get hoveredId() {
			return hoveredId;
		},
		get selectedIds() {
			return selectedIds;
		},

		select(id: string) {
			selectedId = id;
			selectedIds = new Set([id]);
		},

		deselect() {
			selectedId = null;
			selectedIds = new Set();
		},

		toggle(id: string) {
			const next = new Set(selectedIds);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			selectedIds = next;
			selectedId = next.size === 1 ? [...next][0] : null;
		},

		clear() {
			selectedId = null;
			hoveredId = null;
			selectedIds = new Set();
		},

		hover(id: string | null) {
			hoveredId = id;
		},

		isSelected(id: string): boolean {
			return selectedIds.has(id);
		},
	};
}
