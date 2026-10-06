"use client";

import { startTransition, useActionState, useState } from "react";
import type { App, ProductKind } from "@/generated/prisma/client";
import { KIND_LABEL, PRODUCT_KINDS } from "@/components/product-kind";
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
  const [kind, setKind] = useState<ProductKind>(app?.kind ?? "SOFTWARE");
  const [licenseKeys, setLicenseKeys] = useState(app?.licenseKeys ?? true);
  const software = kind === "SOFTWARE";

  return (
    <form
      // Submitting via onSubmit instead of `action` keeps the typed values when validation fails
      // (React resets forms after an action).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="max-w-xl space-y-5"
    >
      <Field label="Name" name="name" defaultValue={app?.name} required />
      <Field label="Tagline" name="tagline" defaultValue={app?.tagline} required hint="One line, shown in the catalog." />
      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" name="description" rows={7} required defaultValue={app?.description} className="input" />
        <p className="hint">Separate paragraphs with a blank line.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="kind" className="label">Type</label>
          <select
            id="kind"
            name="kind"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as ProductKind;
              setKind(next);
              // Only software checks a key; suggest turning keys off when switching away from it on a new product.
              if (!app) setLicenseKeys(next === "SOFTWARE");
            }}
            className="input"
          >
            {PRODUCT_KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k].one}</option>
            ))}
          </select>
        </div>
        {software && (
          <div>
            <label htmlFor="platform" className="label">Platform</label>
            <select id="platform" name="platform" defaultValue={app?.platform ?? "MACOS"} className="input">
              <option value="MACOS">macOS</option>
              <option value="WINDOWS">Windows</option>
              <option value="LINUX">Linux</option>
            </select>
          </div>
        )}
      </div>
      <Field
        label="Price (USD)"
        name="price"
        type="number"
        step="0.01"
        min="0"
        defaultValue={app ? (app.priceCents / 100).toFixed(2) : "5.00"}
        required
        hint="Enter 0 to give it away for free. Paid prices start at $0.50."
      />
      <fieldset className="space-y-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="licenseKeys"
            checked={licenseKeys}
            onChange={(e) => setLicenseKeys(e.target.checked)}
            className="mt-1 size-4 accent-accent"
          />
          <span>
            <span className="block font-medium">Send a license key with every order</span>
            <span className="hint mt-0.5 block">For software that asks for a key on launch. Leave off for ebooks, templates and other files.</span>
          </span>
        </label>
        {licenseKeys && (
          <Field
            label="Devices per key"
            name="maxActivations"
            type="number"
            min="1"
            max="100"
            defaultValue={String(app?.maxActivations ?? 3)}
            required
          />
        )}
      </fieldset>
      <Field label="Image URL" name="iconUrl" type="url" defaultValue={app?.iconUrl ?? ""} hint="Square image, 512×512 or larger. Optional." />
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
