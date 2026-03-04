# Embeddable Widget Specification

## Why It Matters

The embeddable booking widget is the lowest-friction adoption path:

- School keeps existing website.
- Booking data flows into our platform.
- Trial conversion becomes easier with minimal migration.

## Product Definition

One-line embed code that renders a school’s live booking calendar on external sites.

## MVP Scope

- Script embed + container snippet
- School-specific calendar rendering
- Booking flow (guest checkout)
- Event tracking back to platform
- Basic branding compatibility (responsive layout)

## Non-MVP Scope

- Deep visual customization system
- Full white-label behavior
- Multi-widget orchestration for franchise-level sites

## Technical Requirements

- Async loading and minimal page performance impact
- Isolation to avoid CSS/JS conflicts on host websites
- Domain-safe configuration + abuse prevention
- Reliable analytics for impressions, starts, completions

## Acceptance Criteria

- School owner can paste snippet and render widget without developer support.
- Booking completed in widget appears in school dashboard.
- Core funnel metrics are tracked end-to-end.
