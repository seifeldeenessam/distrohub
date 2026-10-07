import { safeNext } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next, "");
  return (
    <>
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 mb-6 text-muted">See your orders and license keys, review what you bought, or manage your products.</p>
      <AuthForm mode="login" next={next || undefined} />
      <p className="mt-6 text-sm text-muted">No account yet? Enter your email above and one is created when you sign in.</p>
    </>
  );
}
