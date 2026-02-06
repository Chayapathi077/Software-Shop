
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UploadCloud, File, X, Wallet, Fingerprint, Globe, KeyRound, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

function generateSecureKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}


export default function UploadPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [version, setVersion] = useState("");
    const [category, setCategory] = useState("");
    const [licenseType, setLicenseType] = useState("");
    const [licenseTerms, setLicenseTerms] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [decryptionKey, setDecryptionKey] = useState("");

    // Licensing rules state
    const [ipLock, setIpLock] = useState(false);
    const [fingerprintLock, setFingerprintLock] = useState(true); // Default to true
    
    // Upload process state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setDecryptionKey(generateSecureKey());
        }
    };
    
    const startProgressSimulation = () => {
        setUploadProgress(0);
        progressIntervalRef.current = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return 90;
                }
                return prev + 5;
            });
        }, 100);
    };

    const handleSubmit = async () => {
        const username = sessionStorage.getItem('username');
        if (!file || !username || !title || !price || !version || !licenseType || !category || !licenseTerms || !decryptionKey) {
            toast({ title: "Missing Information", description: "Please fill out all fields before submitting.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        startProgressSimulation();

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('price', price);
            formData.append('version', version);
            formData.append('category', category);
            formData.append('licenseType', licenseType);
            formData.append('licenseTerms', licenseTerms);
            formData.append('seller', username);
            formData.append('ipLock', String(ipLock));
            formData.append('fingerprintLock', String(fingerprintLock));
            formData.append('decryptionKey', decryptionKey);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            const result = await response.json();
            
            if (response.ok && result.success) {
                setUploadProgress(100);
                toast({
                    title: "Upload Complete!",
                    description: "Your software has been successfully encrypted and listed.",
                });
                setTimeout(() => router.push('/dashboard'), 1000);
            } else {
                 toast({
                    title: "Upload Error",
                    description: result.message || 'An unexpected error occurred.',
                    variant: "destructive",
                    duration: 9000,
                });
                setIsUploading(false);
                setUploadProgress(0);
            }
        } catch (error) {
             if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
             console.error("Upload failed:", error);
             toast({
                title: "Upload Error",
                description: "An unexpected error occurred during upload. Check the console for details.",
                variant: "destructive",
            });
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const isFormReady = !!file && !!title && !!price && !!version && !!licenseType && !!category && !!licenseTerms && !!decryptionKey;

    return (
        <main className="flex w-full flex-col items-center justify-center bg-gradient-to-br from-primary to-accent p-4 text-white min-h-screen">
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
                        <Link href="/dashboard">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="relative w-full max-w-4xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl mt-16 flex flex-col">
                <div className="text-center mb-4">
                    <h2 className="text-3xl font-bold mb-2">Upload New Software</h2>
                    <p className="text-gray-300">Your file will be automatically encrypted before being listed.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 flex-grow">
                    <div className="flex flex-col space-y-3">
                         <div className="space-y-1">
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Software Title" className="h-11 border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm" disabled={isUploading}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (POL)" className="h-11 border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm" disabled={isUploading}/>
                            </div>
                            <div className="space-y-1">
                                <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Version" className="h-11 border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm" disabled={isUploading}/>
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                 <Select onValueChange={setCategory} value={category} disabled={isUploading}>
                                    <SelectTrigger className="h-11 border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="productivity">Productivity</SelectItem>
                                        <SelectItem value="design">Design</SelectItem>
                                        <SelectItem value="development">Development</SelectItem>
                                        <SelectItem value="gaming">Gaming</SelectItem>
                                        <SelectItem value="utility">Utility</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-1">
                                <Select onValueChange={setLicenseType} value={licenseType} disabled={isUploading}>
                                    <SelectTrigger className="h-11 border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm">
                                        <SelectValue placeholder="License Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single-use">Single-use</SelectItem>
                                        <SelectItem value="lifetime">Lifetime</SelectItem>
                                        <SelectItem value="subscription">Subscription</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                         </div>
                          <div className="space-y-2 flex-grow flex flex-col">
                            {!file ? (
                                <label htmlFor="file-upload" className="relative flex flex-col items-center justify-center w-full border-2 border-white/30 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors flex-grow min-h-[160px]">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                                        <p className="mb-1 text-sm text-gray-300"><span className="font-semibold">Upload Software File</span></p>
                                        <p className="text-xs text-gray-400">Any file type accepted</p>
                                    </div>
                                    <Input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} disabled={isUploading}/>
                                </label>
                            ) : (
                                <div className="relative flex items-center justify-between w-full p-3 border border-white/30 rounded-lg bg-white/10 flex-grow min-h-[160px]">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <File className="w-6 h-6 text-white flex-shrink-0"/>
                                        <span className="font-medium text-sm truncate" title={file.name}>{file.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-7 w-7 flex-shrink-0" onClick={() => {setFile(null); setDecryptionKey("");}} disabled={isUploading}>
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input id="decryption-key" value={decryptionKey} placeholder="Decryption Key (auto-generated on file select)" className="h-11 border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm pl-10" readOnly={true}/>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-3">
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Software Description..." className="border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm flex-grow" disabled={isUploading}/>
                        <Textarea id="licenseTerms" value={licenseTerms} onChange={(e) => setLicenseTerms(e.target.value)} placeholder="License Terms..." className="border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm flex-grow" disabled={isUploading}/>
                        <div className="space-y-1">
                             <h3 className="text-lg font-semibold text-center md:text-left">Licensing Rules</h3>
                             <div className="space-y-1">
                                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Wallet className="w-5 h-5 text-green-400"/>
                                        <div>
                                           <Label htmlFor="wallet-lock" className="font-medium">Wallet Address Lock</Label>
                                           <p className="text-xs text-gray-400">License is tied to the buyer's wallet.</p>
                                        </div>
                                    </div>
                                    <Switch id="wallet-lock" checked={true} disabled={true} />
                                </div>
                                 <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Fingerprint className="w-5 h-5"/>
                                        <div>
                                           <Label htmlFor="fingerprint-lock" className="font-medium">Device Fingerprint Lock</Label>
                                            <p className="text-xs text-gray-400">Buyer can only use from their first device.</p>
                                        </div>
                                    </div>
                                    <Switch id="fingerprint-lock" checked={fingerprintLock} onCheckedChange={setFingerprintLock} disabled={isUploading}/>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
                 <div className="h-8 pt-2">
                    {isUploading && (
                        <div className="space-y-1 text-center">
                            <Progress value={uploadProgress} className="h-2 bg-white/10 border border-white/20 backdrop-blur-sm" />
                            <p className="text-xs text-gray-300">{uploadProgress === 100 ? "Complete!" : `Encrypting & Uploading... ${Math.round(uploadProgress)}%`}</p>
                        </div>
                    )}
                 </div>
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-white/30 bg-white/20 backdrop-blur-sm hover:bg-white/30 disabled:opacity-50 h-12 mt-2"
                    onClick={handleSubmit}
                    disabled={isUploading || !isFormReady}
                >
                   {isUploading ? 'Processing...' : 'Encrypt & Submit'}
                </Button>
            </div>
        </main>
    );
}
