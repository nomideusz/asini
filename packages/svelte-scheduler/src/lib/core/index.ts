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

// ─── Pricing engine ─────────────────────────────────────
export type { StripeFeeEntry, PricingInput } from './pricing/index.js';
export { STRIPE_FEES, calculatePrice } from './pricing/index.js';
