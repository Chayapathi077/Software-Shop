
"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Ban, RefreshCcw, Flame, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { getLicensesForSoftware } from '@/lib/auth';
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
import { cn } from '@/lib/utils';

type License = {
    _id: string;
    buyerAddress: string;
    tokenId: number;
    mintDate: string;
    status: 'active' | 'revoked' | 'blocked';
    reason?: string;
};

type ActionType = 'revoke' | 'reactivate';

export default function ManageSoftwarePage({ params }: { params: { softwareId: string } }) {
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Store ID of license being processed
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const fetchLicenses = useCallback(async () => {
    setIsLoading(true);
    try {
        const licenseList = await getLicensesForSoftware(params.softwareId);
        setLicenses(licenseList);
    } catch (error) {
        console.error("Failed to fetch licenses:", error);
        toast({
            title: "Error",
            description: "Could not load the licenses for this software.",
            variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
  }, [params.softwareId, toast]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const openConfirmationModal = (license: License, action: ActionType) => {
    setSelectedLicense(license);
    setActionType(action);
  };
  
  const handleConfirmAction = async () => {
    if (!selectedLicense || !actionType) return;
    
    setIsProcessing(selectedLicense._id);
    
    const endpoint = `/api/license/${actionType}`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseId: selectedLicense._id }),
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            toast({
                title: `License ${actionType === 'revoke' ? 'Revoked' : 'Reactivated'}`,
                description: result.message,
            });
            fetchLicenses(); // Refresh the list
        } else {
             toast({
                title: "Action Failed",
                description: result.message || "An unexpected error occurred.",
                variant: "destructive"
            });
        }

    } catch (error) {
         toast({
            title: "API Error",
            description: `Could not connect to the ${actionType} endpoint.`,
            variant: "destructive"
        });
    } finally {
        setIsProcessing(null);
        setSelectedLicense(null);
        setActionType(null);
    }
  };


  return (
    <>
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-primary to-accent text-white">
      <header className="sticky top-0 flex h-16 items-center justify-between border-b border-white/20 bg-white/10 px-4 md:px-6 z-40 backdrop-blur-sm">
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
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Manage Licenses</h1>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
            <Table>
                <TableHeader>
                    <TableRow className="border-b-white/20 hover:bg-transparent">
                        <TableHead className="text-white">Buyer Wallet</TableHead>
                        <TableHead className="text-white">Token ID</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Reason</TableHead>
                        <TableHead className="text-right text-white">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow className="border-b-0 hover:bg-transparent">
                           <TableCell colSpan={5} className="text-center text-gray-300 py-12">
                               Loading licenses...
                           </TableCell>
                        </TableRow>
                    ) : licenses.length === 0 ? (
                        <TableRow className="border-b-0 hover:bg-transparent">
                            <TableCell colSpan={5} className="text-center text-gray-300 py-12">
                                No licenses have been sold for this software yet.
                            </TableCell>
                        </TableRow>
                    ) : (
                        licenses.map((license) => (
                             <TableRow key={license._id} className="border-b-white/20 hover:bg-white/10 last:border-b-0">
                                <TableCell className="font-mono text-xs text-white">
                                    {license.buyerAddress}
                                </TableCell>
                                <TableCell className="font-mono text-sm text-center text-white">
                                    {license.tokenId}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={license.status === 'active' ? 'default' : license.status === 'blocked' ? 'destructive' : 'secondary'}
                                    className={
                                        license.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 
                                        license.status === 'blocked' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                        'bg-red-500/20 text-red-300 border-red-500/30'
                                    }
                                    >
                                     <div className='flex items-center gap-2'>
                                        {license.status === 'active' && <ShieldCheck className="h-4 w-4"/>}
                                        {license.status !== 'active' && <Ban className="h-4 w-4"/>}
                                        <span className="capitalize">{license.status}</span>
                                     </div>
                                    </Badge>
                                </TableCell>
                                 <TableCell className="text-sm text-gray-400">
                                     {license.reason || 'N/A'}
                                 </TableCell>
                                <TableCell className="text-right">
                                    {license.status === 'blocked' && (
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="mr-2 border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20" 
                                            onClick={() => openConfirmationModal(license, 'reactivate')}
                                            disabled={isProcessing === license._id}
                                        >
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Reactivate
                                        </Button>
                                    )}
                                    {license.status !== 'revoked' && (
                                         <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20" 
                                            onClick={() => openConfirmationModal(license, 'revoke')}
                                            disabled={isProcessing === license._id}
                                        >
                                            <Flame className="mr-2 h-4 w-4" />
                                            Revoke
                                        </Button>
                                    )}
                                    {isProcessing === license._id && <span className="text-xs ml-2">Processing...</span>}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </main>
    </div>

    <AlertDialog open={!!selectedLicense} onOpenChange={(isOpen) => !isOpen && setSelectedLicense(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                {actionType === 'revoke'
                    ? "This will permanently revoke the license by burning the NFT. This action cannot be undone."
                    : "This will reactivate the license, allowing the user to access the software again. The block reason will be cleared."
                }
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedLicense(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleConfirmAction}
                className={actionType === 'revoke' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
               {actionType === 'revoke' ? 'Yes, Revoke License' : 'Yes, Reactivate'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
