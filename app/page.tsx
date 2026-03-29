import { redirect } from "next/navigation";

export default function Home() {
  // TODO: Check auth state and redirect accordingly (Step 3)
  // For now, redirect to auth/login since no auth is set up yet
  redirect("/auth/login");
}
