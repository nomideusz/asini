import { describe, it, expect } from 'vitest';
import { cancellationTemplate } from './cancellation.js';

const base = {
  guestName: 'Anna Kowalski',
  guestEmail: 'anna@example.com',
  tourName: 'Old Town Walking Tour',
  slotStartTime: new Date('2026-06-15T10:00:00Z'),
  participants: 2,
  totalAmount: 8000,
  currency: 'PLN',
  bookingReference: 'TB-12345',
  cancelledBy: 'guest' as const,
  refundAmount: 8000,
};

describe('cancellationTemplate', () => {
  it('mentions refund when refundAmount > 0', () => {
    const { html } = cancellationTemplate({ ...base, refundAmount: 8000 });
    expect(html.toLowerCase()).toMatch(/refund/);
  });

  it('says no refund when refundAmount is 0', () => {
    const { html } = cancellationTemplate({ ...base, refundAmount: 0 });
    expect(html).toContain('No refund');
  });

  it('includes booking reference', () => {
    const { html, subject } = cancellationTemplate(base);
    expect(html).toContain('TB-12345');
    expect(subject).toContain('TB-12345');
  });
});
