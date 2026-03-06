import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

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

export interface BookingEmailData {
	guestName: string;
	guestEmail: string;
	tourName: string;
	slotStartTime: Date;
	participants: number;
	totalAmount: number;
	currency: string;
	bookingReference: string;
	guideEmail?: string;
	guideName?: string;
}

function formatDate(d: Date): string {
	return d.toLocaleString('en-GB', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Warsaw',
	});
}

function formatMoney(cents: number, currency: string): string {
	return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
	const resend = getResend();
	await resend.emails.send({
		from: `${FROM_NAME} <${FROM}>`,
		to: [data.guestEmail],
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
	});
}

export async function sendGuideBookingNotification(data: BookingEmailData): Promise<void> {
	if (!data.guideEmail) return;
	const resend = getResend();
	await resend.emails.send({
		from: `${FROM_NAME} <${FROM}>`,
		to: [data.guideEmail],
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
	});
}

export async function sendCancellationEmail(
	data: BookingEmailData & {
		cancelledBy: 'guest' | 'guide' | 'system';
		refundAmount: number;
	},
): Promise<void> {
	const resend = getResend();
	const refundText =
		data.refundAmount > 0
			? `A refund of ${formatMoney(data.refundAmount, data.currency)} will be processed within 5-10 business days.`
			: 'No refund applies per the cancellation policy.';
	await resend.emails.send({
		from: `${FROM_NAME} <${FROM}>`,
		to: [data.guestEmail],
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
	});
}
