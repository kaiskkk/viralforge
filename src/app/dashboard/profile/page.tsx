import type { Metadata } from "next";

import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata: Metadata = { title: "Profil créateur" };

export default function Page() {
  return <ProfileForm />;
}
