import "server-only";
import { env } from "./env";

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
      from: process.env.EMAIL_FROM ?? "Distrohub <licenses@example.com>",
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

/** Receipt for an order or a manually issued key. The license block only appears when there is a key. */
export function orderEmail(input: {
  productName: string;
  downloadUrl: string;
  free: boolean;
  license?: { key: string; maxActivations: number } | null;
}) {
  const { productName, downloadUrl, free, license } = input;
  const verb = free ? "Thanks for getting" : "Thanks for buying";
  const usage = license
    ? `Open ${productName}, paste the key when asked, and it unlocks. The key works on up to ${license.maxActivations} devices. Keep this email; the download link keeps working.`
    : `Keep this email; the download link keeps working and always has the newest version.`;
  const text = [
    `${verb} ${productName}.`,
    ``,
    ...(license ? [`Your license key: ${license.key}`, ``] : []),
    `Download: ${downloadUrl}`,
    ``,
    usage,
  ].join("\n");

  const brand = "linear-gradient(135deg,#f37335,#fdc830)";
  const keyBlock = license
    ? `<p style="font-size:13px;color:#6b635c;margin:0 0 8px">Your license key</p>
      <p style="font-family:SFMono-Regular,Menlo,Consolas,monospace;font-size:20px;letter-spacing:1px;margin:0 0 24px;word-break:break-all">${escape(license.key)}</p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f8f7f5;font-family:'Plus Jakarta Sans',-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1e1914">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px"><tr>
    <td><img src="${escape(env.appUrl)}/brand/mark-128.png" width="32" height="32" alt="" style="display:block;border-radius:8px"></td>
    <td style="padding-left:10px;font-size:18px;font-weight:700;letter-spacing:-0.3px">Distrohub</td>
  </tr></table>
  <p style="font-size:15px;margin:0 0 24px">${verb} <strong>${escape(productName)}</strong>.</p>
  <div style="background:#fff;border:1px solid #e6e1db;border-radius:12px;overflow:hidden">
    <div style="height:6px;background:#f9a034;background-image:${brand}"></div>
    <div style="padding:24px">
      ${keyBlock}
      <a href="${escape(downloadUrl)}" style="display:inline-block;background:#f9a034;background-image:${brand};color:#2a1405;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Download ${escape(productName)}</a>
    </div>
  </div>
  <p style="font-size:14px;line-height:1.6;color:#6b635c;margin:24px 0 0">${escape(usage)}</p>
</div></body></html>`;

  return { subject: license ? `Your ${productName} license key` : `Your ${productName} download`, text, html };
}
