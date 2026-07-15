/**
 * @fileoverview Email sending placeholder.
 *
 * TODO: Replace this stub with a real email transport before going live.
 *
 * Two recommended options:
 *
 * Option A -- Nodemailer + Gmail SMTP
 *   npm install nodemailer @types/nodemailer
 *   Env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *
 * Option B -- Resend (transactional email service)
 *   npm install resend
 *   Env vars: RESEND_API_KEY, RESEND_FROM_ADDRESS
 *
 * The function signature below must not change -- only the body needs filling in.
 */

export async function sendDeletionEmail(
  toEmail: string,
  deletionLink: string
): Promise<void> {
  // TODO: implement with chosen email provider.
  // The deletionLink is a fully-qualified URL e.g.:
  //   https://yourdomain.com/delete-account/confirm?token=<signed-jwt>
  //
  // Email should contain:
  //   Subject : "Delete your Poker 77 account"
  //   Body    : Explain the action is irreversible, show the link, state it
  //             expires in 1 hour.

  // Temporary: log to server console so the flow is testable end-to-end
  // without a real mailer in place. Remove before production.
  console.log('[sendDeletionEmail] TO:', toEmail);
  console.log('[sendDeletionEmail] LINK:', deletionLink);
}
