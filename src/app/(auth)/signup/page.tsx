import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next ? safeNextPath(searchParams.next) : undefined;

  return <AuthForm mode="signup" next={next} />;
}
