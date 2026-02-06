
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendRecoveryOtp } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleContinue = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter the email address for your account.",
        variant: "destructive",
      });
      return;
    }
    setIsSending(true);
    const result = await sendRecoveryOtp(email);
    setIsSending(false);

    if (result.success) {
      toast({
        title: "OTP Sent",
        description: `A recovery code has been sent to ${email}`,
      });
      router.push(`/verify-recovery-otp?email=${encodeURIComponent(email)}`);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && email) {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-accent p-4">
      <header className="absolute top-0 left-0 right-0 flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
            <div
                className={cn(
                "relative flex items-center justify-center h-10 w-10"
                )}
            >
                <div
                className={cn(
                    "relative flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-all duration-1000 ease-in-out rounded-lg",
                    "h-10 w-10 p-2" 
                )}
                >
                <div className="flex items-center justify-center w-full h-full">
                    <Zap
                    className={cn(
                        "text-white transition-all duration-1000 ease-in-out absolute",
                        "h-5 w-5 -translate-x-1" 
                    )}
                    />
                    <Zap
                    className={cn(
                        "text-white transition-all duration-1000 ease-in-out absolute",
                        "h-5 w-5 translate-x-1" 
                    )}
                    />
                </div>
                </div>
            </div>
        </div>
        <div className="flex items-center">
        <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
          <Link href="/">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        </div>
      </header>
      
      <div className="relative">
        <div className="relative h-auto w-[calc(100vw-4rem)] max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl text-white">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">Forgot Password</h2>
            <p className="text-gray-300">Enter your email to recover your account.</p>
          </div>
          
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
                <Input
                ref={emailRef}
                type="email"
                id="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm"
                disabled={isSending}
                />
            </div>

            <Button
                variant="outline"
                size="lg"
                className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onClick={handleContinue}
                disabled={isSending || !email}
            >
              {isSending ? "Sending..." : (
                <>
                  <Zap className="mr-2 h-5 w-5"/>
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
