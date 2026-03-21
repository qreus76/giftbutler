import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/onboarding");

  return <HomeClient />;
}
