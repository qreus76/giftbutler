import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function ExplorePage() {
  const { userId } = await auth();
  redirect(userId ? "/my-people" : "/");
}
