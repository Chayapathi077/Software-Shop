
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { verifyRecoveryOtp, sendRecoveryOtp } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function VerifyRecoveryOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const emailFromParams = searchParams.get('email');

    if (emailFromParams) {
      setEmail(decodeURIComponent(emailFromParams));
    } else {
      toast({
        title: "Error",
        description: "Invalid recovery link. Please start over.",
        variant: "destructive"
      });
      router.push('/forgot-password');
    }
    
    inputRef.current?.focus();

  }, [searchParams, router, toast]);
  
  const handleVerifyOtp = async (currentOtp: string) => {
    if (currentOtp.length !== 6) return;

    setIsVerifying(true);
    const result = await verifyRecoveryOtp(email, currentOtp);
    setIsVerifying(false);

    if (result.success) {
      toast({
        title: "Success",
        description: "Verification successful. You can now recover your account.",
      });
      router.push(`/recover-account?email=${encodeURIComponent(email)}`);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
      setOtp(""); // Clear OTP on failure
    }
  };
  
  const handleResendOtp = async () => {
    if (!email) return;
    setIsResending(true);
    const result = await sendRecoveryOtp(email);
    setIsResending(false);

    if (result.success) {
      toast({
        title: "OTP Sent",
        description: `A new recovery code has been sent to ${email}`,
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };
  
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-accent p-4">
       <header className="absolute top-0 left-0 right-0 h-16 px-4 flex items-center justify-between">
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
          <Link href="/forgot-password">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        </div>
      </header>
      
      <div className="relative">
        <div className="relative h-auto w-[calc(100vw-4rem)] max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl text-white">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">Verify It's You</h2>
            <p className="text-gray-300">A recovery code was sent to your email. Enter it below.</p>
          </div>
          
            <div className="space-y-6">
                <div className="grid w-full items-center justify-center gap-1.5">
                    <InputOTP 
                      ref={inputRef}
                      maxLength={6} 
                      value={otp} 
                      onChange={setOtp} 
                      onComplete={handleVerifyOtp}
                      disabled={isVerifying || isResending}
                    >
                        <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                 <div className="text-center">
                    <Button
                        variant="link"
                        onClick={handleResendOtp}
                        className="text-xs text-gray-300 hover:text-white transition-colors disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled={isResending || isVerifying}
                    >
                        {isResending ? "Sending..." : "Send OTP again"}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
