import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import {
  bookingConfirmationTemplate,
  guideNotificationTemplate,
  cancellationTemplate,
} from '@nomideusz/svelte-notify';
import type { BookingNotificationData, CancellationNotificationData } from '@nomideusz/svelte-notify';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = 'noreply@thebest.travel';
const FROM_NAME = 'thebest.travel';

// Re-export types so callers don't need to import from two places
export type { BookingNotificationData, CancellationNotificationData };

export async function sendBookingConfirmation(data: BookingNotificationData): Promise<void> {
  const { subject, html } = bookingConfirmationTemplate(data);
  const resend = getResend();
  await resend.emails.send({ from: `${FROM_NAME} <${FROM}>`, to: [data.guestEmail], subject, html });
}

export async function sendGuideBookingNotification(data: BookingNotificationData): Promise<void> {
  if (!data.guideEmail) return;
  const { subject, html } = guideNotificationTemplate(data);
  const resend = getResend();
  await resend.emails.send({ from: `${FROM_NAME} <${FROM}>`, to: [data.guideEmail], subject, html });
}

export async function sendCancellationEmail(data: CancellationNotificationData): Promise<void> {
  const { subject, html } = cancellationTemplate(data);
  const resend = getResend();
  await resend.emails.send({ from: `${FROM_NAME} <${FROM}>`, to: [data.guestEmail], subject, html });
}
