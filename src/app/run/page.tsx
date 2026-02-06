
"use client";

import { useState, useCallback, ChangeEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UploadCloud, File, X, Rocket, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDecryptionKey } from '@/lib/auth';
import { BrowserProvider } from 'ethers';
import { cn } from '@/lib/utils';
import CryptoJS from 'crypto-js';

// Simple function to generate a persistent device ID
const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
};

// Use crypto-js for robust decryption
function decryptData(encryptedBase64: string, key: string): string {
    try {
        const keyHex = CryptoJS.enc.Hex.parse(key);
        // The IV should ideally be part of the encrypted payload and extracted,
        // but for this example, we assume a zero-filled IV if not present.
        const iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000'); 

        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, keyHex, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        // Convert the decrypted WordArray to a UTF-8 string.
        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedText) {
            // This can happen if the key is wrong or the data is corrupted,
            // resulting in a WordArray that can't be converted to valid UTF-8.
            throw new Error("Decryption resulted in an empty string. The key may be incorrect or the ciphertext corrupted.");
        }

        return decryptedText;
    } catch (error) {
        console.error("Decryption failed:", error);
        // Provide a more specific error message if possible.
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during decryption.";
        throw new Error(`Failed to decrypt the file content. Reason: ${errorMessage}`);
    }
}


export default function RunSoftwarePage() {
    const { toast } = useToast();
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [softwareContent, setSoftwareContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState("");

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.name.endsWith('.license.json')) {
                setLicenseFile(file);
                setSoftwareContent(null); // Reset previous content
                handleLoadSoftware(file); // Automatically trigger load on file select
            } else {
                toast({ title: "Invalid File", description: "Please upload a valid .license.json file.", variant: "destructive" });
                e.target.value = ''; // Reset the input
                setLicenseFile(null);
            }
        }
    };
    
    const handleLoadSoftware = async (fileToLoad: File) => {
        if (!fileToLoad) {
            toast({ title: "No File", description: "Please select a license file to load.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setSoftwareContent(null);
        setFileName("");

        try {
            // 1. Check for wallet
            if (!window.ethereum) throw new Error("MetaMask is not installed.");
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();
            
            // 2. Read license file content to get URLs and IDs
            const licenseFileText = await fileToLoad.text();
            const licenseData = JSON.parse(licenseFileText);
            const { licenseId, softwareId, encryptedFileUrl } = licenseData;
            if (!licenseId || !encryptedFileUrl || !softwareId) throw new Error("Invalid license file format.");
            
            // 3. Get decryption key from server (performs all security checks)
            const deviceId = getDeviceId();
            const keyResult = await getDecryptionKey(licenseId, deviceId, walletAddress);
            if (!keyResult.success || !keyResult.key) {
                throw new Error(keyResult.message || "Failed to validate license.");
            }
            const decryptionKey = keyResult.key;

            // 4. Fetch the ENCRYPTED software file from the URL provided in the license
            toast({ title: "Fetching Software...", description: "Downloading encrypted content from the cloud."});
            const response = await fetch(encryptedFileUrl);
            if (!response.ok) {
                 throw new Error(`Failed to download the encrypted software file. Status: ${response.status}`);
            }
            const encryptedDataAsBase64 = await response.text();
             
            // Extract the original filename from the URL, removing the .enc extension
            const fullFileName = encryptedFileUrl.substring(encryptedFileUrl.lastIndexOf('/') + 1);
            setFileName(fullFileName.replace('.enc', ''));

            // 5. Decrypt the fetched file content in the browser
            toast({ title: "Decrypting...", description: "Unlocking file content locally in your browser." });
            const decryptedContent = decryptData(encryptedDataAsBase64, decryptionKey);

            setSoftwareContent(decryptedContent);
            toast({ title: "Success", description: "Software loaded and decrypted successfully." });

        } catch (error: any) {
            console.error("Failed to load software:", error);
            toast({ title: "Error Loading Software", description: error.message, variant: "destructive", duration: 9000 });
            setSoftwareContent(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-primary to-accent text-white">
            <header className="sticky top-0 flex h-16 items-center justify-between px-4 md:px-6 z-40">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base">
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
                </Link>
                <div className="flex items-center">
                <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                    <Link href="/buyer">
                        <ArrowLeft className="h-6 w-6" />
                        <span className="sr-only">Back to My Licenses</span>
                    </Link>
                </Button>
                </div>
            </header>
            <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
                <div className="w-full max-w-2xl rounded-xl border border-white/20 bg-white/10 p-8 shadow-lg backdrop-blur-xl space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">Run Licensed Software</h1>
                        <p className="text-gray-300">Upload your `.license.json` file to securely load and run your software.</p>
                    </div>

                    <div className="space-y-4">
                        <label htmlFor="license-upload" className={cn("relative flex w-full h-32 border-2 border-white/30 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors", { "items-center justify-center": !licenseFile })}>
                           { !licenseFile ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                                    <p className="mb-1 text-sm text-gray-300"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                                    <p className="text-xs text-gray-400">Your `.license.json` file</p>
                                </div>
                           ) : (
                               <div className="relative flex items-center justify-between w-full p-3 h-full">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <File className="w-6 h-6 text-white flex-shrink-0"/>
                                        <span className="font-medium text-sm truncate" title={licenseFile.name}>{licenseFile.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-7 w-7 flex-shrink-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLicenseFile(null); setSoftwareContent(null); const input = document.getElementById('license-upload') as HTMLInputElement; if(input) input.value = ''; }}>
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                           )}
                           <input id="license-upload" type="file" accept=".json,.license.json" className="sr-only" onChange={handleFileChange} />
                        </label>
                        
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full h-12 border-white/30 bg-white/20 backdrop-blur-sm hover:bg-white/30 disabled:opacity-50"
                            onClick={() => licenseFile && handleLoadSoftware(licenseFile)}
                            disabled={!licenseFile || isLoading}
                        >
                            <Rocket className="mr-2 h-5 w-5" />
                            {isLoading ? 'Validating and Loading...' : 'Load and Run Software'}
                        </Button>
                    </div>
                </div>

                {softwareContent && (
                    <div className="w-full max-w-2xl rounded-xl border border-white/20 bg-black/20 p-8 shadow-lg backdrop-blur-xl mt-8">
                         <h2 className="text-xl font-bold mb-4">Loaded Software: {fileName}</h2>
                         <pre className="text-sm whitespace-pre-wrap bg-black/30 p-4 rounded-md font-mono text-left max-h-[50vh] overflow-auto">
                            <code>{softwareContent}</code>
                         </pre>
                    </div>
                )}
            </main>
        </div>
    );
}
