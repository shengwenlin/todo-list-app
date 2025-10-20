"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://todolistapp-three-gamma.vercel.app/',
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8 border border-stone-100">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-stone-800 mb-2">Sign up</h2>
          <p className="text-stone-500 text-sm">
            Create a new account
          </p>
        </div>
        <form onSubmit={handleSignUp}>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-stone-700 text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-cyan-300 focus:border-transparent text-[15px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-stone-700 text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-cyan-300 focus:border-transparent text-[15px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repeat-password" className="text-stone-700 text-sm font-medium">Repeat Password</Label>
              <Input
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-cyan-300 focus:border-transparent text-[15px]"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-5 py-3.5 rounded-full bg-cyan-600 hover:bg-cyan-700 transition-all duration-200 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {isLoading ? "Creating an account..." : "Sign up"}
            </button>
          </div>
          <div className="mt-6 text-center text-sm text-stone-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-stone-700 underline-offset-4 hover:underline font-medium">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
