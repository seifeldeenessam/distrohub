import Link from "next/link";
import { login } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Sign in</h1>
      <AuthForm action={login} mode="login" />
      <p className="mt-6 text-sm text-muted">
        New here? <Link href="/register" className="font-medium text-ink underline">Create a developer account</Link>
      </p>
    </>
  );
}
