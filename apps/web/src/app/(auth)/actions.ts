"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; email?: string; name?: string };

const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name or studio name.").max(80),
  email: z.email("Enter a valid email address.").transform((e) => e.toLowerCase()),
  password: z.string().min(10, "Use at least 10 characters for your password.").max(200),
});

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: raw.email, name: raw.name };
  if (!rateLimit(`register:${clientIp(await headers())}`, 5, 60 * 60_000)) {
    return { error: "Too many sign-ups from this network. Try again later.", ...parsed.data };
  }
  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "An account with this email already exists. Sign in instead.", email: raw.email, name: raw.name };

  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password) },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!rateLimit(`login:${clientIp(await headers())}`, 10, 15 * 60_000)) {
    return { error: "Too many sign-in attempts. Wait 15 minutes and try again.", email };
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match an account.", email };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
