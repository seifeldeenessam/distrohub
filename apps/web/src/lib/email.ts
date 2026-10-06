import "server-only";

type Email = { to: string; subject: string; html: string; text: string };

/** Sends through Resend when RESEND_API_KEY is set; otherwise logs to the console. */
export async function sendEmail(email: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`\n[email] to=${email.to} subject="${email.subject}"\n${email.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "DistroHub <licenses@example.com>",
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function licenseEmail(input: { appName: string; licenseKey: string; downloadUrl: string; maxActivations: number }) {
  const { appName, licenseKey, downloadUrl, maxActivations } = input;
  const text = [
    `Thanks for buying ${appName}.`,
    ``,
    `Your license key: ${licenseKey}`,
    ``,
    `Download: ${downloadUrl}`,
    ``,
    `Open ${appName}, paste the key when asked, and the app unlocks.`,
    `The key works on up to ${maxActivations} devices. Keep this email; the download link keeps working.`,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#eef0ec;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18212b">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
  <p style="font-size:15px;margin:0 0 24px">Thanks for buying <strong>${escape(appName)}</strong>.</p>
  <div style="background:#fff;border:1px solid #d3d8d1;border-radius:12px;padding:24px">
    <p style="font-size:13px;color:#5b6672;margin:0 0 8px">Your license key</p>
    <p style="font-family:SFMono-Regular,Menlo,Consolas,monospace;font-size:20px;letter-spacing:1px;margin:0 0 24px;word-break:break-all">${escape(licenseKey)}</p>
    <a href="${escape(downloadUrl)}" style="display:inline-block;background:#0e6e55;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Download ${escape(appName)}</a>
  </div>
  <p style="font-size:14px;line-height:1.6;color:#5b6672;margin:24px 0 0">Open ${escape(appName)}, paste the key when asked, and the app unlocks. The key works on up to ${maxActivations} devices. Keep this email; the download link keeps working.</p>
</div></body></html>`;

  return { subject: `Your ${appName} license key`, text, html };
}
