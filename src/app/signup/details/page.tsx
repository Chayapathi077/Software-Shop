
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BrowserProvider } from "ethers";
import { cn } from "@/lib/utils";

declare global {
    interface Window {
        ethereum?: any;
    }
}

const validatePan = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
};


export default function SignUpDetailsPage() {
    const [panNumber, setPanNumber] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    const panRef = useRef<HTMLInputElement>(null);
    
    const isPanValid = useMemo(() => panNumber.length === 0 || validatePan(panNumber), [panNumber]);

    useEffect(() => {
        // Check if essential signup data exists in session storage
        if (!sessionStorage.getItem('signup_email')) {
            toast({
                title: "Invalid Step",
                description: "Please start the sign-up process from the beginning.",
                variant: "destructive",
            });
            router.push('/signup');
        } else {
            panRef.current?.focus();
        }
    }, [router, toast]);

    const handleConnectMetaMask = async () => {
        if (!window.ethereum) {
            toast({
                title: "MetaMask Not Found",
                description: "Please install the MetaMask browser extension to use this feature.",
                variant: "destructive",
            });
            return;
        }

        setIsConnecting(true);
        try {
            const provider = new BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                toast({
                    title: "Wallet Connected",
                    description: `Successfully connected to address: ${accounts[0].substring(0, 6)}...${accounts[0].substring(accounts[0].length - 4)}`,
                });
            }
        } catch (error: any) {
            console.error("MetaMask connection error:", error);
            toast({
                title: "Connection Failed",
                description: error.message || "An error occurred while connecting to MetaMask.",
                variant: "destructive",
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleContinue = () => {
        if (!isPanValid) {
            toast({ title: "Error", description: "Please enter a valid PAN number.", variant: "destructive" });
            return;
        }
        if (!panNumber || !walletAddress) {
            toast({ title: "Error", description: "PAN number and wallet address are required.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        sessionStorage.setItem('signup_pan', panNumber);
        sessionStorage.setItem('signup_wallet', walletAddress);
        router.push('/security-phrase');
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
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
                        <Link href="/signup">
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
                                <h2 className="mb-2 text-3xl font-bold">Verification Details</h2>
                                <p className="text-base text-gray-300">
                                    Step 2: Add your verification info.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Input
                                        ref={panRef}
                                        type="text"
                                        id="pan"
                                        placeholder="PAN Number"
                                        value={panNumber}
                                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                                        className={cn("h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm", { "border-red-500/50": !isPanValid })}
                                        onKeyDown={handleKeyDown}
                                        maxLength={10}
                                    />
                                    {!isPanValid && (
                                        <p className="text-xs text-yellow-400 pl-1">Please enter a valid 10-character PAN.</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                     <Input
                                        type="text"
                                        id="wallet"
                                        placeholder="Wallet Address"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                        className="h-12 border-white/30 bg-white/10 text-white placeholder:text-gray-300 backdrop-blur-sm"
                                        onKeyDown={handleKeyDown}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-xs"
                                        onClick={handleConnectMetaMask}
                                        disabled={isConnecting}
                                    >
                                        {isConnecting ? "Connecting..." : "Connect MetaMask"}
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                                    onClick={handleContinue}
                                    disabled={!panNumber || !walletAddress || !isPanValid || isSubmitting}
                                >
                                    {isSubmitting ? "Saving..." : <><Zap className="mr-2 h-5 w-5" /> Submit</>}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
