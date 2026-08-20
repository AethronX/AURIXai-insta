import { redirect } from "next/navigation";
import { requireUser } from "@/lib/security/auth";
import { brandExists } from "@/lib/brand/service";
import { completeOnboardingAction } from "@/lib/actions/brand-actions";
import { OnboardingForm } from "@/components/brand/onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await brandExists(user.organizationId)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Tell AURIX about your brand</h1>
        <p className="mt-1 text-sm text-muted">
          This becomes your Brand Brain — every piece of content the AI generates is grounded in
          what you enter here. You can always refine it later from Brand Brain in the sidebar.
        </p>
      </div>
      <OnboardingForm action={completeOnboardingAction} />
    </div>
  );
}
