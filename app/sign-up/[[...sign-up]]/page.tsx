import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#EAEAE0] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-6">
        <Image src="/logo.png" alt="GiftButler" width={56} height={56} className="rounded-2xl" />
      </div>
      <SignUp />
    </main>
  );
}
