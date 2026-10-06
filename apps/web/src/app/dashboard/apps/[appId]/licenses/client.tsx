"use client";

import { useActionState, useState, useTransition } from "react";
import { issueLicense, resendLicense, resetActivations, setLicenseStatus } from "../../../actions";

export function LicenseActions({ licenseId, status, hasDevices }: { licenseId: string; status: "ACTIVE" | "REVOKED"; hasDevices: boolean }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-sm" disabled={pending || sent} onClick={() => start(async () => { await resendLicense(licenseId); setSent(true); })}>
        {sent ? "Email sent" : "Resend email"}
      </button>
      {hasDevices && (
        <button
          className="btn btn-sm"
          disabled={pending}
          onClick={() => confirm("Sign this key out of every device?") && start(() => resetActivations(licenseId))}
        >
          Reset devices
        </button>
      )}
      {status === "ACTIVE" ? (
        <button
          className="btn btn-sm btn-danger"
          disabled={pending}
          onClick={() => confirm("Revoke this key? The app locks on its next license check.") && start(() => setLicenseStatus(licenseId, "REVOKED"))}
        >
          Revoke
        </button>
      ) : (
        <button className="btn btn-sm" disabled={pending} onClick={() => start(() => setLicenseStatus(licenseId, "ACTIVE"))}>
          Restore
        </button>
      )}
    </div>
  );
}

export function IssueLicenseForm({ appId }: { appId: string }) {
  const [state, action, pending] = useActionState(issueLicense.bind(null, appId), {});
  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required className="input" />
      </div>
      <div>
        <label htmlFor="note" className="label">Note</label>
        <input id="note" name="note" className="input" placeholder="Press review" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="send" defaultChecked /> Email the key and download link
      </label>
      {state.error && <p role="alert" className="rounded-md bg-danger-wash p-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-md bg-ledger-wash p-2 font-mono text-sm text-ledger-ink">{state.ok}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>Issue key</button>
    </form>
  );
}
