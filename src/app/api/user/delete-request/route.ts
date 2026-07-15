import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { successResponse, errorResponse } from '@/lib/api/errors';
import dbConnect from '@/config/dbConnect';
import User from '@/models/user';
import { signToken } from '@/utils/jwt';

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw Object.assign(
      new Error('Email service is not configured. Please contact support.'),
      { code: 'INTERNAL_ERROR' }
    );
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const { email } = body as { email?: unknown };

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse(
        Object.assign(new Error('A valid email address is required'), { code: 'MISSING_BANK_FIELD' })
      );
    }

    const normalised = email.trim().toLowerCase();

    // Look up user — but always return the same response to prevent email enumeration.
    const user = await User.findOne({ email: normalised }).select('_id email username').lean();

    if (user) {
      const token = signToken(
        { userId: user._id.toString(), role: 'user', purpose: 'account-deletion' } as Parameters<typeof signToken>[0] & { purpose: string },
        { expiresIn: '1h' }
      );

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
      const deleteLink = `${baseUrl}/delete-account/confirm?token=${token}`;

      const resend = getResendClient();

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: normalised,
        subject: 'Confirm account deletion — Poker 77',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
              <tr><td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;max-width:560px;width:100%;">

                  <!-- Header -->
                  <tr>
                    <td style="background:#1e293b;padding:32px 40px 24px;border-bottom:1px solid #334155;text-align:center;">
                      <span style="font-size:28px;">&#9824;</span>
                      <p style="margin:8px 0 0;font-size:18px;font-weight:600;color:#f8fafc;letter-spacing:0.5px;">Poker 77</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 40px;">
                      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f8fafc;">Delete your account</h1>
                      <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
                        Hi ${user.username ?? normalised},
                      </p>
                      <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
                        We received a request to permanently delete your Poker 77 account. Click the button below to confirm.
                        This link expires in <strong style="color:#e2e8f0;">1 hour</strong>.
                      </p>

                      <!-- Warning box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#450a0a;border:1px solid #991b1b;border-radius:10px;margin-bottom:28px;">
                        <tr>
                          <td style="padding:16px 20px;">
                            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#fca5a5;">This action is permanent and cannot be undone:</p>
                            <ul style="margin:0;padding-left:18px;font-size:13px;color:#fca5a5;line-height:1.8;">
                              <li>Your player profile and username will be removed</li>
                              <li>Your wallet balance and transaction history will be deleted</li>
                              <li>Your saved bank accounts will be removed</li>
                              <li>You will not be able to recover your account</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${deleteLink}"
                               style="display:inline-block;background:#b91c1c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                              Confirm account deletion
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
                        If you did not request this, you can safely ignore this email. Your account will remain active.
                      </p>
                      <p style="margin:16px 0 0;font-size:12px;color:#475569;word-break:break-all;">
                        Or copy this link into your browser:<br>
                        <span style="color:#6366f1;">${deleteLink}</span>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 40px;border-top:1px solid #334155;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#475569;">
                        &copy; ${new Date().getFullYear()} JDPC Global Pvt Ltd &bull; Jaipur, Rajasthan, India
                      </p>
                    </td>
                  </tr>

                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      });
    }

    // Always return the same response — never reveal whether the email exists.
    return successResponse({
      message: 'If an account with that email exists, a deletion link has been sent.',
    });
  } catch (err) {
    return errorResponse(err);
  }
}
