import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50">
      <SignUp routing="path" path="/sign-up" />
    </main>
  );
}
