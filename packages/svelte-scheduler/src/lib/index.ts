// ─── Re-exports from @nomideusz/svelte-calendar (peer dep) ──
// These types are inherited — never redefined in this package.
export type {
	TimelineEvent,
	CalendarAdapter,
	DateRange,
} from '@nomideusz/svelte-calendar';

// ─── Core domain types ──────────────────────────────────
export type {
	PricingModel,
	BookingStatus,
	SlotStatus,
	PaymentStatus,
	AttendanceStatus,
	SchedulePattern,
	TourDefinition,
	ScheduleRule,
	TourSlot,
	Booking,
	GuestProfile,
	PriceStructure,
	ParticipantCategory,
	GroupPricingTier,
	GroupDiscountTier,
	OptionalAddon,
	PriceBreakdown,
	CancellationPolicy,
	CancellationRule,
	GuideAvailability,
} from './core/index.js';

// ─── Recurrence & slot generation ───────────────────────
export type { OccurrencePair } from './core/index.js';
export { expandRule, generateSlots } from './core/index.js';

// ─── Adapter interface ──────────────────────────────────
export type {
	SchedulerAdapter,
} from './adapters/index.js';
