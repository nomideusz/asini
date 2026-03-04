# Product Specification

## 1) Directory & Listings

### Requirements

- Support both **table view** and **card view** with user toggle.
- Table view should be fast, sortable, and desktop-optimized.
- School names in table must link only to internal detail pages.
- Keep all listings permanently (including unverified schools).
- Differentiate verified/active vs unclaimed schools visually.
- Add `Claim this listing` CTA on every unclaimed school profile.
- Do not show photos on unclaimed listings.
- Use manually assigned price range labels: `budget`, `mid`, `premium`.

### Acceptance Criteria

- User can switch table/card in one click with persistent state.
- No external website links appear in primary listing name column.
- Unclaimed listing pages include claim CTA and no image gallery.

## 2) School Detail Page

### Required Data Blocks

- Embedded Google Map
- Address, phone, website link (secondary emphasis)
- Styles taught
- Price range
- Languages offered
- Beginner-friendly flag
- Google Places reviews

### Active-School Enhancements

- Next 3 upcoming classes with booking CTA
- Rich profile sections (teacher bios, photos, schedules)
- Optional embedded Instagram module

### SEO Requirement

- Each detail page must include unique textual content.
- Avoid duplicate/thin templated copy.

### Acceptance Criteria

- Active schools render class agenda + booking CTA.
- Unclaimed schools render static info + claim CTA.
- Every detail page stores or generates unique SEO text block.

## 3) Yoga Style Pages (SEO Multiplier)

### Required Pages

- Dedicated pages for key styles (e.g. hatha, vinyasa, ashtanga, yin, kundalini, prenatal).

### Function

- Explain style and intent-based search context.
- Cross-link to matching city/style school listings.

### Acceptance Criteria

- Style page exists for each priority style in content matrix.
- At least one internal link path: style → schools and schools → style.

## 4) Homepage

### Required Sections

1. Front-and-center search (city/postcode + style)
2. “Lessons starting soon near you” agenda
3. City browser tiles (Warszawa, Kraków, Wrocław, Gdańsk, Poznań)
4. Short owner-focused “how it works” with free-trial message
5. Social proof counters (schools listed, classes scheduled)

### Acceptance Criteria

- Agenda visible without login.
- Search interaction is first-screen and actionable.
- City tiles navigate to filtered listing pages.

## 5) Booking UX

### Requirements

- No mandatory registration for booking.
- Guest checkout requires only name, email, phone.
- Offer optional account creation after 3+ guest bookings.
- Send confirmation email with QR code pass.
- Send 24-hour reminder email.
- Include token-based cancellation link in email (no account required).

### Acceptance Criteria

- Guest can complete booking without creating password/account.
- Confirmation and reminder emails are sent reliably.
- Cancellation works through secure token link.
