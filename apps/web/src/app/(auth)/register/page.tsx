import Link from "next/link";
import { register } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Start selling</h1>
      <p className="mt-2 mb-6 text-muted">Upload a file, set a price or make it free, and publish.</p>
      <AuthForm action={register} mode="register" />
      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-ink underline">Sign in</Link>
      </p>
    </>
  );
}
