
"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ShieldCheck, ExternalLink, Fingerprint, Ban, Rocket, Zap, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getLicensesForBuyer, bindDeviceToLicense, getSoftwareFileUrl } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BrowserProvider } from 'ethers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type License = {
    _id: string;
    softwareTitle: string;
    softwareId: string;
    tokenId: number;
    mintDate: string;
    transactionHash: string;
    buyerIp: string;
    status: 'active' | 'revoked' | 'blocked' | 'deleted_by_user';
    deviceId?: string;
};

const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
};

export default function BuyerDashboardPage() {
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);

  const fetchLicenses = useCallback(async (address: string) => {
    setIsLoading(true);
    try {
        const licenseList = await getLicensesForBuyer(address);
        setLicenses(licenseList);
    } catch (error) {
        console.error("Failed to fetch licenses:", error);
        toast({
            title: "Error",
            description: "Could not load your licenses.",
            variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  const connectAndFetch = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
        toast({ title: "MetaMask not found", description: "Please install MetaMask to view your licenses.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        
        if (accounts && accounts.length > 0) {
            const address = accounts[0];
            setWalletAddress(address);
            await fetchLicenses(address);
        } else {
            toast({ title: "Connection Required", description: "Please connect a wallet to view your licenses." });
            setIsLoading(false);
        }
    } catch (error) {
        console.error("Could not connect to wallet:", error);
        toast({ title: "Wallet Error", description: "Failed to connect to wallet. Please try again.", variant: "destructive"});
        setIsLoading(false);
    }
}, [fetchLicenses, toast]);


  useEffect(() => {
    connectAndFetch();
  }, [connectAndFetch]);

  const handleDownloadLicenseFile = async (license: License) => {
    if (!walletAddress) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet.", variant: "destructive" });
      return;
    }
    setIsProcessing(license._id);

    try {
        const bindResult = await bindDeviceToLicense(license._id, getDeviceId());
        if (!bindResult.success) {
            throw new Error(bindResult.message);
        }

        const urlResult = await getSoftwareFileUrl(license.softwareId);
        if (!urlResult.success || !urlResult.fileUrl) {
           throw new Error(urlResult.message || "Failed to get software details.");
        }

      const licenseFileData = {
        licenseId: license._id,
        softwareId: license.softwareId,
        encryptedFileUrl: urlResult.fileUrl,
      };

      const blob = new Blob([JSON.stringify(licenseFileData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${license.softwareTitle.replace(/\s+/g, '_')}.license.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "License File Downloaded",
        description: "Load this file in the 'Access & Download' page to use your software.",
        duration: 9000,
      });

    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Could not generate license file.",
        variant: "destructive",
        duration: 9000
      });
    } finally {
      setIsProcessing(null);
      if (walletAddress) {
        fetchLicenses(walletAddress); // Refresh license list to show updated device status
      }
    }
  };

   const handleDeleteLicense = async () => {
    if (!licenseToDelete || !walletAddress) return;
    setIsProcessing(licenseToDelete._id);
    
    try {
      const response = await fetch('/api/license/delete-by-buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId: licenseToDelete._id, walletAddress }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "License Removed",
          description: `The license for "${licenseToDelete.softwareTitle}" has been removed from your list.`,
        });
        fetchLicenses(walletAddress);
      } else {
        toast({
          title: "Error",
          description: result.message || "Could not remove the license.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "API Error",
        description: "Could not connect to the server.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(null);
      setLicenseToDelete(null);
    }
  };

  return (
    <>
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-primary to-accent text-white">
      <header className="sticky top-0 flex h-16 items-center justify-between px-4 md:px-6 z-40">
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

        <div className="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="outline" className="text-white hover:bg-white/20 hover:text-white rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                            <Link href="/run">
                                <Rocket className="mr-2 h-4 w-4" />
                                Access & Download
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Go to the Access page to load your downloaded license file.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/dashboard">
                    <ArrowLeft className="h-6 w-6" />
                    <span className="sr-only">Back to Dashboard</span>
                </Link>
            </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Software Licenses</h1>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
            <Table>
                <TableHeader>
                    <TableRow className="border-b-white/20 hover:bg-transparent">
                        <TableHead className="text-white">Software</TableHead>
                        <TableHead className="text-white text-center">License Status</TableHead>
                        <TableHead className="text-white text-center">Device Status</TableHead>
                        <TableHead className="text-white text-center">Purchase Date</TableHead>
                        <TableHead className="text-white text-center">Transaction</TableHead>
                        <TableHead className="text-right text-white">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow className="border-b-0 hover:bg-transparent">
                           <TableCell colSpan={6} className="text-center text-gray-300 py-12">
                               Loading your licenses...
                           </TableCell>
                        </TableRow>
                    ) : !walletAddress ? (
                         <TableRow className="border-b-0 hover:bg-transparent">
                            <TableCell colSpan={6} className="text-center text-gray-300 py-12">
                                Please connect your wallet to see your licenses.
                                <Button onClick={connectAndFetch} variant="link" className="text-white underline ml-2">Connect Now</Button>
                            </TableCell>
                        </TableRow>
                    ) : licenses.length === 0 ? (
                        <TableRow className="border-b-0 hover:bg-transparent">
                            <TableCell colSpan={6} className="text-center text-gray-300 py-12">
                                You have not purchased any software licenses yet.
                            </TableCell>
                        </TableRow>
                    ) : (
                        licenses.map((license) => (
                             <TableRow key={license._id} className="border-b-white/20 hover:bg-white/10 last:border-b-0">
                                <TableCell className="font-medium text-white">
                                    {license.softwareTitle}
                                </TableCell>
                                <TableCell className="text-center">
                                     <div className='flex items-center justify-center gap-2 text-sm'>
                                        {license.status === 'active' && <ShieldCheck className="h-5 w-5 text-green-400"/>}
                                        {license.status !== 'active' && <Ban className="h-5 w-5 text-red-500"/>}
                                        <span className="capitalize">{license.status.replace(/_/g, ' ')}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className='flex items-center justify-center gap-2 text-sm text-gray-300'>
                                        {license.deviceId ? (
                                            <>
                                                <Fingerprint className="h-4 w-4 text-green-400" />
                                                <span className="font-mono text-xs" title={license.deviceId}>
                                                    {`Bound to ...${license.deviceId.slice(-8)}`}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Fingerprint className="h-4 w-4 text-yellow-400" />
                                                <span>Not Bound</span>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-white">{new Date(license.mintDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-center">
                                    <a 
                                        href={`https://amoy.polygonscan.com/tx/${license.transactionHash}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-white hover:text-green-400 transition-colors inline-block"
                                    >
                                        <ExternalLink className="h-5 w-5" />
                                    </a>
                                </TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="border-red-500/30 bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 disabled:opacity-50 h-8 w-8" 
                                                    onClick={() => setLicenseToDelete(license)} 
                                                    disabled={isProcessing === license._id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Remove this license from your list</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 disabled:opacity-50 h-8 w-8" 
                                                    onClick={() => handleDownloadLicenseFile(license)} 
                                                    disabled={license.status !== 'active' || isProcessing === license._id}
                                                >
                                                    {isProcessing === license._id && license._id !== licenseToDelete?._id ? (
                                                        <span className="text-xs">...</span>
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{license.status !== 'active' ? `License is ${license.status}` : 'Download License File'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </main>
    </div>
     <AlertDialog open={!!licenseToDelete} onOpenChange={(isOpen) => !isOpen && setLicenseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Remove License?</AlertDialogTitle>
            <AlertDialogDescription>
                This will remove the license for "{licenseToDelete?.softwareTitle}" from your list and make it unusable. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isProcessing} onClick={() => setLicenseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDeleteLicense}
                disabled={!!isProcessing && isProcessing === licenseToDelete?._id}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                {isProcessing === licenseToDelete?._id ? "Removing..." : "Yes, Remove License"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    