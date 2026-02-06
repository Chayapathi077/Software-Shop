
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailPassword } from "@/lib/auth";

export default function Home() {
  const [isTransitioned, setIsTransitioned] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const transitionTimeout = setTimeout(() => {
      setIsTransitioned(true);
      firstInputRef.current?.focus();
    }, 1700);

    return () => {
      clearTimeout(transitionTimeout);
    };
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        title: "Login Failed",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSigningIn(true);
    const result = await signInWithEmailPassword(email, password);
    setIsSigningIn(false);

    if (result.success && result.user) {
      toast({
        title: "Sign In Successful",
        description: `Welcome back, ${result.user.username}!`,
      });
      sessionStorage.setItem('username', result.user.username);
      if (result.user.profileIcon) {
        sessionStorage.setItem('profileIcon', result.user.profileIcon);
      } else {
        sessionStorage.removeItem('profileIcon');
      }
      if (result.user.walletAddress) {
        sessionStorage.setItem('walletAddress', result.user.walletAddress);
      } else {
         sessionStorage.removeItem('walletAddress');
      }
      router.push('/dashboard');
    } else {
      toast({
        title: "Sign In Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-accent p-4">
      {/* Animated Header */}
      <div
        className={cn(
          "absolute z-20 flex items-center gap-4 transition-all duration-1000 ease-in-out",
          isTransitioned
            ? "top-4 left-4"
            : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
      >
        <div
          className={cn(
            "relative flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-all duration-1000 ease-in-out rounded-lg",
             isTransitioned ? "h-10 w-10 p-2" : "h-32 w-32 p-4"
          )}
        >
          <div className="flex items-center justify-center w-full h-full">
            <Zap
              className={cn(
                "text-white transition-all duration-1000 ease-in-out absolute",
                isTransitioned ? "h-5 w-5 -translate-x-1" : "h-12 w-12 -translate-x-2"
              )}
            />
             <Zap
              className={cn(
                "text-white transition-all duration-1000 ease-in-out absolute",
                isTransitioned ? "h-5 w-5 translate-x-1" : "h-12 w-12 translate-x-2"
              )}
            />
          </div>
        </div>

        <div
          className={cn(
            "transition-opacity duration-500 ease-in-out",
            isTransitioned ? "opacity-100" : "absolute opacity-0"
          )}
        >
          <div className="text-2xl font-bold text-white">Software Shop</div>
        </div>
      </div>


      {/* Main Content Area */}
      <div
        className={cn(
          "relative transition-opacity duration-700 ease-out",
          isTransitioned ? "opacity-100 delay-1000" : "opacity-0"
        )}
      >
        {/* Glassmorphic Container */}
        <div className="relative h-auto max-h-[600px] w-[calc(100vw-4rem)] max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex h-full w-full items-center justify-between gap-16">
            {/* Left Side */}
            <div className="w-1/2 text-white">
              <h1 className="text-3xl font-bold leading-tight">
                Your 1-Stop Solution to Sell & Shop Software.
              </h1>
            </div>

            {/* Right Side */}
            <div className="flex h-full w-1/2 flex-col items-center justify-center text-white">
              <div className="w-full max-w-sm">
                <div className="text-center pb-4">
                  <h2 className="mb-2 text-3xl font-bold">Welcome Back</h2>
                  <p className="text-base text-gray-300">
                    Sign in with your credentials
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Input
                      ref={firstInputRef}
                      type="email"
                      id="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm"
                      onKeyDown={handleKeyDown}
                      disabled={isSigningIn}
                    />
                  </div>
                   <div className="grid w-full items-center gap-1.5">
                    <Input
                      type="password"
                      id="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm"
                      onKeyDown={handleKeyDown}
                      disabled={isSigningIn}
                    />
                  </div>
                  <div className="text-right -mt-2">
                      <Button asChild variant="link" className="text-xs text-gray-300 hover:text-white transition-colors">
                        <Link
                          href="/forgot-password"
                        >
                          Forgot account?
                        </Link>
                      </Button>
                    </div>
                  <div className="flex items-center gap-4">
                    <Button
                      id="sign-in-button"
                      variant="outline"
                      size="lg"
                      className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                      onClick={handleSignIn}
                      disabled={isSigningIn}
                    >
                      {isSigningIn ? "Signing In..." : <><Zap className="mr-2 h-5 w-5" />Sign In</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                      asChild
                    >
                      <Link href="/signup">
                        <Zap className="mr-2 h-5 w-5" />Sign Up
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
