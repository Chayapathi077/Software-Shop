
"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Zap, ArrowLeft, Circle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { checkUserExists } from "@/lib/auth";
import { cn } from "@/lib/utils";

type ValidationStatus = "idle" | "checking" | "valid" | "invalid";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<ValidationStatus>("idle");
  const [emailStatus, setEmailStatus] = useState<ValidationStatus>("idle");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const checkAvailability = useCallback(async (field: "username" | "email", value: string) => {
    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }
    
    if (!value.trim()) {
        (field === 'username' ? setUsernameStatus : setEmailStatus)('idle');
        (field === 'username' ? setUsernameError : setEmailError)('');
        return;
    }

    (field === 'username' ? setUsernameStatus : setEmailStatus)('checking');

    debounceTimeout.current = setTimeout(async () => {
        const { userExists, message } = await checkUserExists({ [field]: value });
        if (userExists) {
            (field === 'username' ? setUsernameStatus : setEmailStatus)('invalid');
            (field === 'username' ? setUsernameError : setEmailError)(message);
        } else {
            (field === 'username' ? setUsernameStatus : setEmailStatus)('valid');
            (field === 'username' ? setUsernameError : setEmailError)('');
        }
    }, 500);
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '');
    setUsername(value);
    checkAvailability('username', value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    checkAvailability('email', value);
  };

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const passwordRules = useMemo(() => {
    const lengthMet = password.length >= 16;
    const uppercaseMet = /[A-Z]/.test(password);
    const lowercaseMet = /[a-z]/.test(password);
    const numberMet = /\d/.test(password);
    const specialCharMet = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const matchMet = password !== "" && password === confirmPassword;
    const allMet = lengthMet && uppercaseMet && lowercaseMet && numberMet && specialCharMet && matchMet;
    return { lengthMet, uppercaseMet, lowercaseMet, numberMet, specialCharMet, matchMet, allMet };
  }, [password, confirmPassword]);

  const handleContinue = async () => {
    if (!username || !email || !password || !confirmPassword) {
      toast({ title: "Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    if (!passwordRules.allMet) {
        toast({ title: "Error", description: "Please ensure all password requirements are met.", variant: "destructive" });
        return;
    }
     if (usernameStatus !== 'valid' || emailStatus !== 'valid') {
      toast({ title: "Error", description: "Please fix the errors before proceeding.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);

    try {
        sessionStorage.setItem('signup_username', username);
        sessionStorage.setItem('signup_email', email);
        sessionStorage.setItem('signup_password', password);
        router.push('/signup/details');
    } catch (error) {
        toast({ title: "Error", description: "Could not proceed to the next step. Please try again.", variant: "destructive" });
        setIsProcessing(false);
    }
  };


    const handleInitialKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextFieldRef?: React.RefObject<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldRef?.current) {
                nextFieldRef.current.focus();
            } else {
                handleContinue();
            }
        }
    };
    
    const Rule = ({ met, children }: { met: boolean; children: React.ReactNode }) => (
      <div className={cn("flex items-center justify-start gap-2 transition-colors", met ? 'text-green-400' : 'text-gray-400')}>
          <Circle className={cn("h-2.5 w-2.5 transition-colors", met ? 'fill-current' : '')} />
          <span className="text-left">{children}</span>
      </div>
    );
    
    const ValidationIcon = ({ status, ...props }: { status: ValidationStatus } & React.ComponentProps<typeof Circle>) => {
        if (status === 'idle' || status === 'checking') return null;
        const color = status === 'valid' ? 'text-green-400' : 'text-red-400';
        return <Circle className={cn("h-3 w-3 fill-current", color, props.className)} />;
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
        <div className="relative h-auto w-[calc(100vw-4rem)] max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <div className="w-full max-w-sm">
              <div className="text-center pb-6">
                <h2 className="mb-2 text-3xl font-bold">Create Account</h2>
                <p className="text-base text-gray-300">
                  Step 1: Your Account Credentials
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="relative grid w-full items-center gap-1.5">
                    <Input
                      ref={usernameRef}
                      type="text"
                      id="username"
                      placeholder="Username"
                      value={username}
                      onChange={handleUsernameChange}
                      className={cn("h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm", { "animate-shake": usernameStatus === 'invalid' })}
                      onKeyDown={(e) => handleInitialKeyDown(e, emailRef)}
                    />
                    <div className="absolute right-3"><ValidationIcon status={usernameStatus} /></div>
                  </div>
                  {usernameError && <p className="text-xs text-yellow-400 pl-1">{usernameError}</p>}
                </div>
                
                <div className="space-y-1">
                    <div className="relative grid w-full items-center gap-1.5">
                      <Input
                        ref={emailRef}
                        type="email"
                        id="email"
                        placeholder="Email address"
                        value={email}
                        onChange={handleEmailChange}
                        className={cn("h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm", { "animate-shake": emailStatus === 'invalid' })}
                        onKeyDown={(e) => handleInitialKeyDown(e, passwordRef)}
                      />
                       <div className="absolute right-3"><ValidationIcon status={emailStatus} /></div>
                    </div>
                    {emailError && <p className="text-xs text-yellow-400 pl-1">{emailError}</p>}
                </div>

                <div className="relative grid w-full items-center gap-1.5">
                  <Input
                    ref={passwordRef}
                    type={isPasswordVisible ? "text" : "password"}
                    id="password"
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
                    className="h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm pr-10"
                    onKeyDown={(e) => handleInitialKeyDown(e, confirmPasswordRef)}
                  />
                   <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white" onClick={() => setIsPasswordVisible(prev => !prev)}>
                        {isPasswordVisible ? <EyeOff /> : <Eye />}
                    </Button>
                </div>
                <div className="relative grid w-full items-center gap-1.5">
                  <Input
                    ref={confirmPasswordRef}
                    type={isConfirmPasswordVisible ? "text" : "password"}
                    id="confirm-password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ''))}
                    className="h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm pr-10"
                    onKeyDown={(e) => handleInitialKeyDown(e)}
                  />
                   <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white" onClick={() => setIsConfirmPasswordVisible(prev => !prev)}>
                        {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
                    </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 pt-1 text-xs">
                  <Rule met={passwordRules.lengthMet}>16+ characters</Rule>
                  <Rule met={passwordRules.uppercaseMet}>1 uppercase</Rule>
                  <Rule met={passwordRules.lowercaseMet}>1 lowercase</Rule>
                  <Rule met={passwordRules.numberMet}>1 number</Rule>
                  <Rule met={passwordRules.specialCharMet}>1 special</Rule>
                  <Rule met={passwordRules.matchMet}>Passwords match</Rule>
                </div>

                  <Button
                    id="sign-up-button"
                    variant="outline"
                    size="lg"
                    className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 disabled:bg-white/5 disabled:text-gray-400 disabled:cursor-not-allowed"
                    onClick={handleContinue}
                    disabled={
                        !email || !username || !passwordRules.allMet || isProcessing || 
                        usernameStatus !== 'valid' || emailStatus !== 'valid'
                    }
                  >
                    {isProcessing || usernameStatus === 'checking' || emailStatus === 'checking' ? "Validating..." : <><Zap className="mr-2 h-5 w-5" /> Start</>}
                  </Button>
                
                  <div className="text-center pt-2">
                    <Button asChild variant="link" className="text-xs text-gray-300 hover:text-white transition-colors">
                      <Link
                        href="/"
                      >
                        Already have an account? Sign In
                      </Link>
                    </Button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
