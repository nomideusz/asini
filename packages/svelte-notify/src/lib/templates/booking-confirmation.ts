import type { BookingNotificationData, EmailTemplate } from '../types.js';

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export function bookingConfirmationTemplate(data: BookingNotificationData): EmailTemplate {
  return {
    subject: `Booking confirmed: ${data.tourName} — Ref ${data.bookingReference}`,
    html: `
      <h2>Your booking is confirmed</h2>
      <p>Hi ${data.guestName},</p>
      <p>Your booking for <strong>${data.tourName}</strong> is confirmed.</p>
      <ul>
        <li>Date: ${formatDate(data.slotStartTime)}</li>
        <li>Participants: ${data.participants}</li>
        <li>Total paid: ${formatMoney(data.totalAmount, data.currency)}</li>
        <li>Reference: <strong>${data.bookingReference}</strong></li>
      </ul>
      <p>See you there!</p>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
