import { SignUpForm } from "@/components/sign-up-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <SignUpForm />
      </div>
      <footer className="py-12 text-center mt-auto">
        <p className="text-xs text-stone-400">
          Vibe Coded by Shengwen with ❤️
        </p>
      </footer>
    </div>
  );
}
