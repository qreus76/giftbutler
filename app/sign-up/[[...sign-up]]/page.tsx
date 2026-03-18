import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50">
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
    </main>
  );
}
