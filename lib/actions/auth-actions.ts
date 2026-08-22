"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, destroySession, logAuthEvent } from "@/lib/security/auth";

const registerSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Which step of a multi-step form the error belongs to, for forms that need to jump back to it. */
  step?: number;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `org-${Date.now()}`
  );
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    organizationName: formData.get("organizationName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const { organizationName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);
  let slug = slugify(organizationName);
  const slugTaken = await prisma.organization.findUnique({ where: { slug } });
  if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const user = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: organizationName, slug },
    });
    const createdUser = await tx.user.create({
      data: { email, passwordHash, name },
    });
    await tx.membership.create({
      data: { userId: createdUser.id, organizationId: organization.id, role: "OWNER" },
    });
    return createdUser;
  });

  await createSession(user.id);
  await logAuthEvent("register", { userId: user.id });
  redirect("/onboarding");
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await logAuthEvent("login_failed", { email: parsed.data.email });
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  await logAuthEvent("login", { userId: user.id });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  await logAuthEvent("logout");
  redirect("/login");
}
