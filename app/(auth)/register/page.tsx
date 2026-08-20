import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/security/auth";
import { registerAction } from "@/lib/actions/auth-actions";
import { RegisterForm } from "@/components/auth/auth-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-6 text-center text-xl font-semibold">Set up your AURIX workspace</h1>
      <RegisterForm action={registerAction} />
    </div>
  );
}
