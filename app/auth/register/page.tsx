import { redirect } from "next/navigation";

// The old registration form has been replaced by the full onboarding flow at /onboarding
export default function RegisterPage() {
  redirect("/onboarding");
}
