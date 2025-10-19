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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Redirect to home page after successful login
      router.push("/");
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
          <h2 className="text-2xl font-semibold text-stone-800 mb-2">Login</h2>
          <p className="text-stone-500 text-sm">
            Enter your email below to login to your account
          </p>
        </div>
        <form onSubmit={handleLogin}>
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
              <div className="flex items-center">
                <Label htmlFor="password" className="text-stone-700 text-sm font-medium">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="ml-auto inline-block text-xs text-stone-500 hover:text-stone-700 underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-cyan-300 focus:border-transparent text-[15px]"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-5 py-3.5 rounded-full bg-cyan-600 hover:bg-cyan-700 transition-all duration-200 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </div>
          <div className="mt-6 text-center text-sm text-stone-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="text-stone-700 underline-offset-4 hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
