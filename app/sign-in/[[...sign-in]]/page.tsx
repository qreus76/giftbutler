import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EAEAE0]">
      <SignIn
        routing="path"
        path="/sign-in"
        forceRedirectUrl="/home"
        appearance={{
          elements: {
            formFieldInput: { style: { padding: "12px 16px", minHeight: "48px" } },
            formButtonPrimary: { style: { padding: "14px 24px", minHeight: "52px" } },
            socialButtonsBlockButton: { style: { padding: "14px 16px", minHeight: "52px", backgroundColor: "#F5F5F0", border: "1px solid #E0E0D8", color: "#111111" } },
          },
        }}
      />
    </main>
  );
}
