"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, safeNext } from "@/lib/auth";
import { LOGIN_CODE_LENGTH, normalizeEmail, sendLoginCode, verifyLoginCode } from "@/lib/login-codes";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type AuthState = {
  step: "email" | "code";
  email?: string;
  name?: string;
  error?: string;
  notice?: string;
};

const emailSchema = z.email("Enter a valid email address.").transform(normalizeEmail);
const nameSchema = z.string().trim().min(1, "Enter your name or studio name.").max(80);

/**
 * Passwordless sign-in and sign-up in one form: the email step sends a code, the code step checks it.
 * An unknown email gets an account once its code is verified, so the form never reveals which
 * addresses have accounts.
 */
export async function authenticate(prev: AuthState, formData: FormData): Promise<AuthState> {
  const intent = String(formData.get("intent") ?? "send");
  const mode = formData.get("mode") === "register" ? "register" : "login";
  const rawEmail = String(formData.get("email") ?? "");
  const rawName = formData.has("name") ? String(formData.get("name")) : undefined;
  const echo = { email: rawEmail, name: rawName };

  if (intent === "change-email") return { step: "email", ...echo };

  const email = emailSchema.safeParse(rawEmail.trim());
  if (!email.success) return { step: "email", ...echo, error: email.error.issues[0].message };
  const name = mode === "register" ? nameSchema.safeParse(rawName ?? "") : undefined;
  if (name && !name.success) return { step: "email", ...echo, error: name.error.issues[0].message };

  const ip = clientIp(await headers());

  if (intent === "send") {
    if (!rateLimit(`login-code:ip:${ip}`, 10, 15 * 60_000) || !rateLimit(`login-code:email:${email.data}`, 5, 15 * 60_000)) {
      return { step: prev.step, ...echo, error: "Too many codes requested. Wait 15 minutes and try again." };
    }
    try {
      await sendLoginCode(email.data);
    } catch (err) {
      console.error("[auth] sign-in code email failed", err);
      return { step: "email", ...echo, error: "We couldn't send the code. Check the address and try again." };
    }
    return { step: "code", ...echo, notice: prev.step === "code" ? "We sent a new code." : undefined };
  }

  // intent === "verify"
  if (!rateLimit(`login-verify:${ip}`, 30, 15 * 60_000)) {
    return { step: "code", ...echo, error: "Too many attempts. Wait 15 minutes and try again." };
  }
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== LOGIN_CODE_LENGTH) {
    return { step: "code", ...echo, error: `Enter the ${LOGIN_CODE_LENGTH}-digit code from the email.` };
  }
  const result = await verifyLoginCode(email.data, code);
  if (result === "invalid") return { step: "code", ...echo, error: "That code isn't right. Check the email and try again." };
  if (result === "expired") return { step: "code", ...echo, error: "That code has expired or was used too many times. Send a new one." };

  const newName = name?.success ? name.data : undefined;
  let user = await db.user.upsert({
    where: { email: email.data },
    create: { email: email.data, name: newName ?? "" },
    update: {},
  });
  // Signing up with an email that already bought something: keep the account, fill in the missing name.
  if (!user.name && newName) user = await db.user.update({ where: { id: user.id }, data: { name: newName } });

  await createSession(user.id);
  redirect(safeNext(formData.get("next"), mode === "register" ? "/dashboard" : "/account"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
