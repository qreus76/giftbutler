import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4">
      <SignUp
        routing="path"
        path="/sign-up"
        appearance={{
          elements: {
            formFieldInput: { style: { padding: "12px 16px", minHeight: "48px" } },
            formButtonPrimary: { style: { padding: "14px 24px", minHeight: "52px" } },
            socialButtonsBlockButton: { style: { padding: "14px 16px", minHeight: "52px" } },
          },
        }}
      />
      <p className="text-xs text-stone-400 mt-4 text-center max-w-xs">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline hover:text-stone-600">Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline hover:text-stone-600">Privacy Policy</Link>.
      </p>
    </main>
  );
}
