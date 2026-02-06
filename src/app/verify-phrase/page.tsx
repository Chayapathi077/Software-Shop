
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, TriangleAlert, Zap } from "lucide-react";
import { createUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function VerifyPhrasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [phrase, setPhrase] = useState(Array(12).fill(""));
  const [correctPhrase, setCorrectPhrase] = useState('');
  const [hasVerificationFailed, setHasVerificationFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedPhrase = sessionStorage.getItem('security_phrase');
    if (storedPhrase) {
      setCorrectPhrase(storedPhrase);
    } else {
      toast({
        title: "Error",
        description: "Security phrase not found. Please start over.",
        variant: "destructive"
      });
      router.push('/signup');
    }
    inputRefs.current[0]?.focus();
  }, [router, toast]);

  const handleInputChange = (index: number, value: string) => {
    const newPhrase = [...phrase];
    setHasVerificationFailed(false);

    const words = value.split(' ').filter(w => w);
    if (words.length > 1) {
      // Handle pasting multiple words
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
     if (e.key === 'Enter') {
        e.preventDefault();
        if (hasVerificationFailed) {
            handleGoBackToPhrase();
        } else {
            handleSubmit();
        }
    }
  };

  const handleSubmit = async () => {
    const enteredPhrase = phrase.join(" ").trim();
    if (phrase.some(p => p === '')) {
        toast({ title: "Incomplete Phrase", description: "Please fill out all 12 words.", variant: "destructive" });
        return;
    }

    if (enteredPhrase !== correctPhrase) {
       toast({
        title: "Verification Failed",
        description: "The security phrase is incorrect. Please try again.",
        variant: "destructive"
      });
      setHasVerificationFailed(true);
      return;
    }

    setIsSubmitting(true);
    
    const username = sessionStorage.getItem('signup_username');
    const email = sessionStorage.getItem('signup_email');
    const password = sessionStorage.getItem('signup_password');
    const securityPhrase = sessionStorage.getItem('security_phrase');
    const panNumber = sessionStorage.getItem('signup_pan');
    const walletAddress = sessionStorage.getItem('signup_wallet');


    if (!username || !email || !password || !securityPhrase || !panNumber || !walletAddress) {
        toast({ title: "Error", description: "Incomplete sign-up data. Please start over.", variant: "destructive" });
        setIsSubmitting(false);
        router.push('/signup');
        return;
    }

    const result = await createUser({ username, email, password, securityPhrase, panNumber, walletAddress });
    
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Account Created!",
        description: "You have successfully created your account. Welcome!",
      });
      // Store username for the dashboard and clear temporary signup data
      sessionStorage.setItem('username', username);
      sessionStorage.removeItem('signup_username');
      sessionStorage.removeItem('signup_email');
      sessionStorage.removeItem('signup_password');
      sessionStorage.removeItem('security_phrase');
      sessionStorage.removeItem('signup_pan');
      sessionStorage.removeItem('signup_wallet');
      
      router.push('/dashboard');
    } else {
       toast({
        title: "Sign Up Failed",
        description: result.message,
        variant: "destructive"
      });
    }
  };

  const handleGoBackToPhrase = () => {
    router.push('/security-phrase');
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
          <Link href="/security-phrase">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        </div>
      </header>

      <div className="relative">
        <div className="relative h-auto w-[calc(100vw-4rem)] max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl text-white">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">Verify Your Phrase</h2>
            <p className="text-gray-300">Enter your 12-word security phrase in the correct order.</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="relative">
                <Input
                  ref={el => inputRefs.current[index] = el}
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
          
          <div className="flex flex-col sm:flex-row gap-4">
             {hasVerificationFailed && (
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-yellow-500/50 text-yellow-400 bg-yellow-500/10 backdrop-blur-sm hover:bg-yellow-500/20 hover:text-yellow-300"
                    onClick={handleGoBackToPhrase}
                >
                    <TriangleAlert className="mr-2 h-5 w-5"/>
                    Try Again
                </Button>
            )}
            <Button
                variant="outline"
                size="lg"
                className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onClick={handleSubmit}
                disabled={phrase.some(p => p === '') || hasVerificationFailed || isSubmitting}
            >
                {isSubmitting ? 'Creating Account...' : <><Zap className="mr-2 h-5 w-5" />Solidify</>}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
