import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
});

const FROM = process.env.SMTP_FROM || 'noreply@terminko.app';

export type AppointmentEmailParams = {
  guestEmail: string;
  guestName: string;
  resourceName: string;
  serviceName: string;
  startAt: Date;
  endAt: Date;
  cancellationCode: string;
};

export async function sendAppointmentConfirmation(params: AppointmentEmailParams): Promise<void> {
  const {
    guestEmail,
    guestName,
    resourceName,
    serviceName,
    startAt,
    endAt,
    cancellationCode,
  } = params;

  const dateStr = startAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStart = startAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const timeEnd = endAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Appointment Confirmed</h2>
      <p>Hi ${guestName},</p>
      <p>Thank you for booking your appointment! Here are the details:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 6px 12px; font-weight: bold;">Service</td><td style="padding: 6px 12px;">${serviceName}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: bold;">With</td><td style="padding: 6px 12px;">${resourceName}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: bold;">Date</td><td style="padding: 6px 12px;">${dateStr}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: bold;">Time</td><td style="padding: 6px 12px;">${timeStart} – ${timeEnd}</td></tr>
      </table>
      <p>If you need to cancel, use the following code:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 12px; background: #f4f4f4; border-radius: 8px;">${cancellationCode}</p>
      <p style="color: #666; font-size: 13px;">Keep this code safe — you will need it to cancel your appointment.</p>
      <p>We look forward to seeing you!</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to: guestEmail,
    subject: `Appointment Confirmed – ${serviceName} on ${dateStr}`,
    html,
  });
}
