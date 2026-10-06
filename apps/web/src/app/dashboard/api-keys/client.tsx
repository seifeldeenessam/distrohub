"use client";

import { useActionState, useTransition } from "react";
import { createApiKey, revokeApiKey, type ApiKeyState } from "../actions";
import { CopyButton } from "@/components/copy-button";

export function CreateKeyForm() {
  const [state, action, pending] = useActionState<ApiKeyState, FormData>(createApiKey, {});
  return (
    <>
      <form action={action} className="mt-6 flex gap-2">
        <input name="name" placeholder="Key name, e.g. GitHub Actions" aria-label="Key name" className="input" />
        <button className="btn btn-primary shrink-0" disabled={pending}>Create key</button>
      </form>
      {state.key && (
        <div className="mt-4 rounded-lg border border-ledger bg-ledger-wash p-4">
          <p className="text-sm font-semibold text-ledger-ink">Copy this key now. It won&apos;t be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-sm">{state.key}</code>
            <CopyButton value={state.key} />
          </div>
        </div>
      )}
    </>
  );
}

export function RevokeKeyButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-sm btn-danger"
      disabled={pending}
      onClick={() => confirm("Revoke this key? Anything using it stops working immediately.") && start(() => revokeApiKey(id))}
    >
      Revoke
    </button>
  );
}
