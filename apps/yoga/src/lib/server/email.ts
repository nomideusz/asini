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

const FROM = 'noreply@auth.zaur.app';
const FROM_NAME = 'szkolyjogi.pl';
const ADMIN_EMAIL = 'joga@zaur.app';

export type ClaimNotificationData = {
  schoolName: string;
  schoolId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string | null;
  claimantRole: string;
  message: string | null;
};

function claimNotificationHtml(data: ClaimNotificationData): string {
  const roleLabels: Record<string, string> = {
    owner: 'Właściciel/ka',
    manager: 'Manager/ka',
    instructor: 'Instruktor/ka',
  };

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a2332;">
  <div style="border-bottom: 2px solid #3d7ce0; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 18px; font-weight: 600; margin: 0;">Nowe zgłoszenie przejęcia profilu</h1>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px; width: 120px;">Studio</td>
      <td style="padding: 8px 0; font-weight: 500;">${data.schoolName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">Imię i nazwisko</td>
      <td style="padding: 8px 0;">${data.claimantName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">E-mail</td>
      <td style="padding: 8px 0;"><a href="mailto:${data.claimantEmail}" style="color: #3d7ce0;">${data.claimantEmail}</a></td>
    </tr>
    ${data.claimantPhone ? `<tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">Telefon</td>
      <td style="padding: 8px 0;">${data.claimantPhone}</td>
    </tr>` : ''}
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">Rola</td>
      <td style="padding: 8px 0;">${roleLabels[data.claimantRole] ?? data.claimantRole}</td>
    </tr>
    ${data.message ? `<tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px; vertical-align: top;">Wiadomość</td>
      <td style="padding: 8px 0;">${data.message}</td>
    </tr>` : ''}
  </table>

  <a href="https://szkolyjogi.pl/listing/${data.schoolId}"
     style="display: inline-block; padding: 10px 20px; background: #3d7ce0; color: #fff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
    Zobacz profil studia
  </a>

  <p style="margin-top: 32px; font-size: 12px; color: #6b7a8f;">
    Ta wiadomość została wysłana automatycznie przez szkolyjogi.pl
  </p>
</body>
</html>`;
}

export async function sendClaimNotification(data: ClaimNotificationData): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: `${FROM_NAME} <${FROM}>`,
    to: [ADMIN_EMAIL],
    subject: `Przejęcie profilu: ${data.schoolName}`,
    html: claimNotificationHtml(data),
  });
}
