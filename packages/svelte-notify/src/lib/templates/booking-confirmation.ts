import type { BookingNotificationData, EmailTemplate } from '../types.js';
import { getQrMatrix, matrixToSvg } from '@nomideusz/svelte-qr';

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
  const qrSection = data.verifyUrl
    ? (() => {
        const matrix = getQrMatrix(data.verifyUrl, { errorCorrection: 'M', size: 160 });
        const svg = matrixToSvg(matrix, { size: 160 });
        const b64 = btoa(svg);
        return `
        <div style="text-align:center;margin:24px 0;">
          <p style="font-size:13px;color:#666;margin-bottom:8px;">Show this QR code at your tour</p>
          <img src="data:image/svg+xml;base64,${b64}" width="160" height="160" alt="Booking QR code" style="display:block;margin:0 auto;"/>
        </div>`;
      })()
    : '';

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
      ${qrSection}
      <p>See you there!</p>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
