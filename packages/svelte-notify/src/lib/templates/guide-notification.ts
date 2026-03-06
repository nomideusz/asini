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

export function guideNotificationTemplate(data: BookingNotificationData): EmailTemplate {
  return {
    subject: `New booking: ${data.tourName} — ${data.participants} participant(s)`,
    html: `
      <h2>New booking received</h2>
      <p>Hi ${data.guideName ?? 'Guide'},</p>
      <p><strong>${data.guestName}</strong> booked <strong>${data.tourName}</strong>.</p>
      <ul>
        <li>Date: ${formatDate(data.slotStartTime)}</li>
        <li>Participants: ${data.participants}</li>
        <li>Amount: ${formatMoney(data.totalAmount, data.currency)}</li>
        <li>Guest email: ${data.guestEmail}</li>
        <li>Reference: ${data.bookingReference}</li>
      </ul>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
