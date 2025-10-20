"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function Page() {
  useEffect(() => {
    // 礼花动效 - 使用蓝色调
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 30, 
      spread: 360, 
      ticks: 60, 
      zIndex: 0,
      colors: ['#06b6d4', '#0891b2', '#0e7490', '#22d3ee', '#67e8f9'] // cyan 色系
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // 从左侧发射
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      
      // 从右侧发射
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          
          <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8 border border-stone-100">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-stone-800 mb-2">
                Thank you for signing up!
              </h2>
              <p className="text-stone-500 text-sm">
                Check your email to confirm
              </p>
            </div>
            
            <p className="text-stone-600 text-[15px] leading-relaxed">
              You&apos;ve successfully signed up. Please check your email to confirm your account before signing in.
            </p>
            
            <div className="mt-6 pt-6 border-t border-stone-100">
              <Link
                href="/auth/login"
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium hover:underline underline-offset-4"
              >
                Go to Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-stone-400">
          Vibe Coded by Shengwen with ❤️
        </p>
      </footer>
    </div>
  );
}
