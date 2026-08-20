import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/security/auth";
import { loginAction } from "@/lib/actions/auth-actions";
import { LoginForm } from "@/components/auth/auth-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-6 text-center text-xl font-semibold">Sign in to your workspace</h1>
      <LoginForm action={loginAction} />
    </div>
  );
}
