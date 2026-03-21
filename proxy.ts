import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/home(.*)",
  "/my-people(.*)",
  "/profile(.*)",
  "/onboarding(.*)",
  "/circles(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const { userId } = await auth();
    if (!userId || !ADMIN_IDS.includes(userId)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
