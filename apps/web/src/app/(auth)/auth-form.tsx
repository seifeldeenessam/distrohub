"use client";

import { useActionState } from "react";
import type { AuthState } from "./actions";

export function AuthForm({
  action,
  mode,
}: {
  action: (prev: AuthState, data: FormData) => Promise<AuthState>;
  mode: "login" | "register";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {mode === "register" && (
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" required defaultValue={state.name} className="input" autoComplete="name" />
          <p className="hint">Shown on your product pages as the creator.</p>
        </div>
      )}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required defaultValue={state.email} className="input" autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 10 : undefined}
          className="input"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>
      {state.error && <p role="alert" className="rounded-md bg-danger-wash p-2 text-sm text-danger">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {mode === "register" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
