import { describe, it, expect } from 'vitest';
import { bookingConfirmationTemplate } from './booking-confirmation.js';

const base = {
  guestName: 'Anna Kowalski',
  guestEmail: 'anna@example.com',
  tourName: 'Old Town Walking Tour',
  slotStartTime: new Date('2026-06-15T10:00:00Z'),
  participants: 2,
  totalAmount: 8000,  // 80.00 PLN in cents
  currency: 'PLN',
  bookingReference: 'TB-12345',
};

describe('bookingConfirmationTemplate', () => {
  it('includes guest name in html', () => {
    const { html } = bookingConfirmationTemplate(base);
    expect(html).toContain('Anna Kowalski');
  });

  it('includes tour name in subject', () => {
    const { subject } = bookingConfirmationTemplate(base);
    expect(subject).toContain('Old Town Walking Tour');
  });

  it('includes booking reference in subject and html', () => {
    const { subject, html } = bookingConfirmationTemplate(base);
    expect(subject).toContain('TB-12345');
    expect(html).toContain('TB-12345');
  });

  it('includes formatted amount', () => {
    const { html } = bookingConfirmationTemplate(base);
    expect(html).toContain('80');
  });

  it('returns an EmailTemplate shape', () => {
    const result = bookingConfirmationTemplate(base);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.html).toBe('string');
  });
});
