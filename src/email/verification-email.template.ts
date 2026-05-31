export function buildVerificationEmailHtml(options: {
  name?: string;
  verifyUrl: string;
}) {
  const { name, verifyUrl } = options;
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px 12px;text-align:center;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);">
              <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">AlgoArena</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#64748b;">${greeting}</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">Verify your email address</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569;">
                Thanks for signing up. Confirm your email to activate your account and start using AlgoArena.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);">
                    <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
                If you did not create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                © ${new Date().getFullYear()} AlgoArena · <a href="https://algoarena.co.in" style="color:#6366f1;text-decoration:none;">algoarena.co.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
