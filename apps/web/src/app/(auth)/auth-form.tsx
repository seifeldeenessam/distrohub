'use client';

import { useActionState } from 'react';
import { authenticate, type AuthState } from './actions';

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
	const [state, formAction, pending] = useActionState(authenticate, { step: 'email' } as AuthState);
	const hidden = (
		<>
			<input type="hidden" name="mode" value={mode} />
			{next && <input type="hidden" name="next" value={next} />}
		</>
	);
	const error = state.error && (
		<p role="alert" className="bg-danger-wash text-danger rounded-md p-2 text-sm">
			{state.error}
		</p>
	);

	if (state.step === 'code') {
		return (
			<form action={formAction} className="space-y-4">
				{hidden}
				<input type="hidden" name="email" value={state.email ?? ''} />
				{state.name !== undefined && <input type="hidden" name="name" value={state.name} />}
				<p className="text-muted">
					We sent a 6-digit code to <span className="text-ink font-medium">{state.email}</span>. It expires in 10 minutes.
				</p>
				<div>
					<label htmlFor="code" className="label">
						Code
					</label>
					<input id="code" name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="123456" className="input font-mono text-lg tracking-[0.3em]" />
				</div>
				{error}
				{state.notice && !state.error && (
					<p role="status" className="bg-accent-wash text-accent-ink rounded-md p-2 text-sm">
						{state.notice}
					</p>
				)}
				<button name="intent" value="verify" className="btn btn-primary w-full" disabled={pending}>
					{mode === 'register' ? 'Create account' : 'Sign in'}
				</button>
				<div className="flex justify-between text-sm">
					<button name="intent" value="send" formNoValidate className="text-muted hover:text-ink underline" disabled={pending}>
						Send a new code
					</button>
					<button name="intent" value="change-email" formNoValidate className="text-muted hover:text-ink underline" disabled={pending}>
						Use a different email
					</button>
				</div>
			</form>
		);
	}

	return (
		<form action={formAction} className="space-y-4">
			{hidden}
			<input type="hidden" name="intent" value="send" />
			{mode === 'register' && (
				<div>
					<label htmlFor="name" className="label">
						Name
					</label>
					<input id="name" name="name" required defaultValue={state.name} className="input" autoComplete="name" />
					<p className="hint">Shown on your product pages as the creator.</p>
				</div>
			)}
			<div>
				<label htmlFor="email" className="label">
					Email
				</label>
				<input id="email" name="email" type="email" required defaultValue={state.email} className="input" autoComplete="email" />
				<p className="hint">We&apos;ll email you a sign-in code. No password needed.</p>
			</div>
			{error}
			<button className="btn btn-primary w-full" disabled={pending}>
				Email me a code
			</button>
		</form>
	);
}
