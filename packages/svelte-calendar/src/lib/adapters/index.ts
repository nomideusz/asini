// ─── Adapters barrel export ─────────────────────────────
export type { CalendarAdapter, DateRange } from './types.js';
export { createMemoryAdapter } from './memory.js';
export type { MemoryAdapterOptions } from './memory.js';
export { createRestAdapter } from './rest.js';
export type { RestAdapterOptions } from './rest.js';
export { createRecurringAdapter } from './recurring.js';
export type { RecurringEvent, RecurringAdapterOptions } from './recurring.js';
export { createMappedAdapter } from './mapped.js';
export type { FieldMapping, MappedAdapterOptions, MutationHandler } from './mapped.js';
export { createCompositeAdapter } from './composite.js';
export type { CompositeAdapterOptions } from './composite.js';
