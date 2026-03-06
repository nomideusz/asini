import type { CancellationNotificationData, EmailTemplate } from '../types.js';

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export function cancellationTemplate(data: CancellationNotificationData): EmailTemplate {
  const refundText = data.refundAmount > 0
    ? `A refund of ${formatMoney(data.refundAmount, data.currency)} will be processed within 5–10 business days.`
    : 'No refund applies per the cancellation policy.';

  return {
    subject: `Booking cancelled: ${data.tourName} — Ref ${data.bookingReference}`,
    html: `
      <h2>Booking cancelled</h2>
      <p>Hi ${data.guestName},</p>
      <p>Your booking for <strong>${data.tourName}</strong> on ${formatDate(data.slotStartTime)} has been cancelled.</p>
      <p>${refundText}</p>
      <p>Reference: <strong>${data.bookingReference}</strong></p>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
