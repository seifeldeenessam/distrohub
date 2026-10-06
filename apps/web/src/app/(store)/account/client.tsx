"use client";

import { useActionState, useTransition } from "react";
import { removeDevice, updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ name, label = "Save" }: { name: string; label?: string }) {
  const [state, action, pending] = useActionState(updateProfile, {} as ProfileState);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="name" className="label">Name</label>
        <div className="flex gap-2">
          <input id="name" name="name" required maxLength={80} defaultValue={name} autoComplete="name" className="input" />
          <button className="btn shrink-0" disabled={pending}>{label}</button>
        </div>
        <p className="hint">Shown with your reviews, and as the creator on products you sell.</p>
      </div>
      {state.error && <p role="alert" className="rounded-md bg-danger-wash p-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
    </form>
  );
}

export function RemoveDeviceButton({ activationId, deviceName }: { activationId: string; deviceName: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-sm"
      disabled={pending}
      onClick={() => confirm(`Sign ${deviceName} out of this license? The app asks for the key again there.`) && start(() => removeDevice(activationId))}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
