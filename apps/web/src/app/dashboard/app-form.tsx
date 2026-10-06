"use client";

import { useActionState } from "react";
import type { App } from "@/generated/prisma/client";
import type { FormState } from "./actions";

export function AppForm({
  action,
  app,
  submitLabel,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  app?: App;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <Field label="Name" name="name" defaultValue={app?.name} required />
      <Field label="Tagline" name="tagline" defaultValue={app?.tagline} required hint="One line, shown in the catalog." />
      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" name="description" rows={7} required defaultValue={app?.description} className="input" />
        <p className="hint">Separate paragraphs with a blank line.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Price (USD)"
          name="price"
          type="number"
          step="0.01"
          min="0.5"
          defaultValue={app ? (app.priceCents / 100).toFixed(2) : "5.00"}
          required
        />
        <div>
          <label htmlFor="platform" className="label">Platform</label>
          <select id="platform" name="platform" defaultValue={app?.platform ?? "MACOS"} className="input">
            <option value="MACOS">macOS</option>
            <option value="WINDOWS">Windows</option>
            <option value="LINUX">Linux</option>
          </select>
        </div>
        <Field label="Devices per key" name="maxActivations" type="number" min="1" max="100" defaultValue={String(app?.maxActivations ?? 3)} required />
      </div>
      <Field label="Icon URL" name="iconUrl" type="url" defaultValue={app?.iconUrl ?? ""} hint="Square PNG, 512×512 or larger. Optional." />
      <Field label="Website" name="websiteUrl" type="url" defaultValue={app?.websiteUrl ?? ""} hint="Optional." />
      {state.error && <p role="alert" className="rounded-md bg-danger-wash p-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-md bg-accent-wash p-2 text-sm text-accent-ink">{state.ok}</p>}
      <button className="btn btn-primary" disabled={pending}>{submitLabel}</button>
    </form>
  );
}

function Field({ label, name, hint, ...props }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="input" {...props} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
