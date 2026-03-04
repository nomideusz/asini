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
} from './types.js';

export {
	CANCELLATION_POLICIES,
	getApplicableRule,
	calculateRefund,
	describeRefund,
} from './policy.js';

// ─── Pricing engine ─────────────────────────────────────
export type { StripeFeeEntry, PricingInput } from './pricing/index.js';
export { STRIPE_FEES, calculatePrice } from './pricing/index.js';

export type { OccurrencePair } from './events/recurrence.js';
export { expandRule } from './events/recurrence.js';
export { generateSlots } from './events/generator.js';

// ─── Capacity utilities ─────────────────────────────────
export { availableSpots, isFull, isAtRisk, checkCapacity } from './capacity.js';

// ─── Booking state machine ──────────────────────────────
export { createBooking, cancelBooking, BookingError } from './booking.js';
