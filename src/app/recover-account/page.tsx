
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { recoverAccount } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function RecoverAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [phrase, setPhrase] = useState(Array(12).fill(""));
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const emailFromParams = searchParams.get('email');
    if (emailFromParams) {
      setEmail(decodeURIComponent(emailFromParams));
    } else {
      toast({
        title: "Error",
        description: "Email not provided. Please start the recovery process again.",
        variant: "destructive"
      });
      router.push('/forgot-password');
    }
    inputRefs.current[0]?.focus();
  }, [searchParams, router, toast]);

  const handleInputChange = (index: number, value: string) => {
    const newPhrase = [...phrase];
    const words = value.split(' ').filter(w => w);

    if (words.length > 1) {
      words.forEach((word, i) => {
        if (index + i < 12) {
          newPhrase[index + i] = word.toLowerCase();
        }
      });
      setPhrase(newPhrase);
      const nextFocusIndex = Math.min(index + words.length, 11);
      inputRefs.current[nextFocusIndex]?.focus();
      return;
    }

    newPhrase[index] = value.split(' ')[0].toLowerCase();
    setPhrase(newPhrase);

    if (value.endsWith(' ') && value.trim() !== '' && index < 11) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !phrase[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && !phrase.some(p => p === '')) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (phrase.some(p => p === '')) {
        toast({ title: "Error", description: "Please fill out all 12 words of the phrase.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    const enteredPhrase = phrase.join(" ").trim();
    const result = await recoverAccount(email, enteredPhrase);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Success!",
        description: "Account verified. You can now reset your password.",
      });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } else {
      toast({
        title: "Recovery Failed",
        description: result.message,
        variant: "destructive"
      });
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
          <Link href="/forgot-password">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        </div>
      </header>

      <div className="relative">
        <div className="relative h-auto w-[calc(100vw-4rem)] max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl text-white">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">Recover Your Account</h2>
            <p className="text-gray-300">Enter your 12-word security phrase to prove ownership.</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="relative">
                <Input
                  ref={el => {
                    if (el) inputRefs.current[index] = el;
                  }}
                  type="text"
                  value={phrase[index]}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-12 w-full border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm pl-8"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={isSubmitting}
                />
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{index + 1}.</span>
              </div>
            ))}
          </div>
          
          <Button
              variant="outline"
              size="lg"
              className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
              onClick={handleSubmit}
              disabled={isSubmitting || phrase.some(p => p === '')}
          >
              {isSubmitting ? "Verifying..." : <><Zap className="mr-2 h-5 w-5" />Solve</>}
          </Button>
        </div>
      </div>
    </main>
  );
}
