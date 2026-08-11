export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderEmailLayout({
  title,
  preview,
  children,
  footer,
}: {
  title: string;
  preview: string;
  children: string;
  footer?: string;
}) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f4f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 18px;border-bottom:1px solid #e6edf5;">
                <div style="display:inline-block;background:#1656a3;color:#ffffff;border-radius:6px;padding:8px 10px;font-weight:700;font-size:13px;letter-spacing:0;">AVI CERTIFY</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                ${children}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;border-top:1px solid #e6edf5;color:#6b7280;font-size:12px;line-height:20px;">
                ${escapeHtml(
                  footer ??
                    "AVI CERTIFY accompagne les etudiants dans leurs demarches AVI, hebergement, prefinancement et visa.",
                )}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderParagraph(value: string) {
  return `<p style="margin:0 0 14px;line-height:26px;color:#334155;font-size:15px;">${escapeHtml(value)}</p>`;
}

export function renderHeading(value: string) {
  return `<h1 style="margin:0 0 16px;color:#0f172a;font-size:24px;line-height:32px;">${escapeHtml(value)}</h1>`;
}

export function renderFieldList(fields: Array<[string, string | null | undefined]>) {
  const rows = fields
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) => `<tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border-top:1px solid #e6edf5;border-bottom:1px solid #e6edf5;">${rows}</table>`;
}
