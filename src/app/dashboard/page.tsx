
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, Trash2, ShoppingCart, Gem, Rocket, Heart, Star, Cloud, Anchor, Upload, BookUser, Zap, ClipboardList } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { getMySoftware, deleteUserAccount } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { BrowserProvider } from 'ethers';
import { MetaMaskIcon } from '@/components/ui/metamask-icon';


const iconComponents: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  Gem,
  Rocket,
  Heart,
  Star,
  Cloud,
  Anchor,
};

type Software = {
    _id: string;
    title: string;
    price: number;
    createdAt: string;
    totalLicenses: number;
    activeLicenses: number;
    blockedLicenses: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [username, setUsername] = useState<string | null>(null);
  const [profileIcon, setProfileIcon] = useState<string | null>(null);
  const [mySoftware, setMySoftware] = useState<Software[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [softwareToDelete, setSoftwareToDelete] = useState<Software | null>(null);
  const [isDeletingSoftware, setIsDeletingSoftware] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);


  const fetchSoftware = useCallback(async () => {
    const user = sessionStorage.getItem('username');
    if (user) {
        setIsLoading(true);
        try {
            const softwareList = await getMySoftware(user);
            setMySoftware(softwareList);
        } catch (error) {
            console.error("Failed to fetch software:", error);
            toast({
                title: "Error",
                description: "Could not load your software.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }
  }, [toast]);

  // Check for an active wallet connection on page load
  useEffect(() => {
    const checkConnection = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    const address = accounts[0];
                    setWalletAddress(address);
                    sessionStorage.setItem('walletAddress', address);
                } else {
                    // No accounts connected in MetaMask, clear session storage
                    setWalletAddress(null);
                    sessionStorage.removeItem('walletAddress');
                }
            } catch (error) {
                 console.error("Could not check wallet connection:", error);
                 setWalletAddress(null);
                 sessionStorage.removeItem('walletAddress');
            }
        }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      const sessionProfileIcon = sessionStorage.getItem('profileIcon');
      setProfileIcon(sessionProfileIcon || null);
    } else {
      router.push('/');
    }
  }, [router]);
  
  useEffect(() => {
    fetchSoftware();
  }, [fetchSoftware]);

  const handleConnectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast({ title: "MetaMask not found", description: "Please install the MetaMask extension.", variant: "destructive" });
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        sessionStorage.setItem('walletAddress', address);
        toast({ title: "Wallet Connected", description: `Address: ${address}` });
      } else {
         toast({ title: "Connection Failed", description: "No accounts were selected. Please try again.", variant: "destructive" });
      }

    } catch (error) {
      console.error("Wallet connection error:", error);
      toast({ title: "Connection Failed", description: "Could not connect to MetaMask. Please try again.", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };


  const handleSignOut = () => {
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('profileIcon');
    sessionStorage.removeItem('walletAddress');
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (!username) return;
    setIsDeleting(true);
    const result = await deleteUserAccount(username);
    setIsDeleting(false);

    if (result.success) {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      handleSignOut();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    }
  };

  const confirmDeleteSoftware = (software: Software) => {
    setSoftwareToDelete(software);
  };
  
  const handleDeleteSoftware = async () => {
    if (!softwareToDelete) return;
    setIsDeletingSoftware(true);
    
    try {
      const response = await fetch('/api/software/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ softwareId: softwareToDelete._id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Software Deleted",
          description: `"${softwareToDelete.title}" has been successfully deleted.`,
        });
        fetchSoftware(); // Refresh the list
      } else {
        toast({
          title: "Deletion Failed",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
    } catch (error) {
       toast({
        title: "API Error",
        description: "Could not connect to the delete endpoint.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingSoftware(false);
      setSoftwareToDelete(null);
    }
  };
  
  const Icon = profileIcon ? iconComponents[profileIcon] : null;

  if (!username) {
    return null; 
  }

  return (
    <>
      <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-primary to-accent text-white">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-4 md:px-6">
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
              <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 rounded-lg"
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  aria-label="Connect to MetaMask"
              >
                  <MetaMaskIcon className={cn("h-5 w-5", walletAddress ? "text-green-400" : "text-white")} />
              </Button>
              <Button asChild variant="ghost" size="icon" className="text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 rounded-lg">
                  <Link href="/buyer">
                    <ClipboardList className="h-5 w-5" />
                    <span className="sr-only">My Licenses</span>
                  </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 rounded-lg">
                <Link href="/marketplace">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="sr-only">Go to Marketplace</span>
                  </Link>
                </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md">
                    {Icon ? <Icon className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white/10 backdrop-blur-sm text-white border-white/20">
                  <DropdownMenuLabel>My Account ({username})</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/20"/>
                  <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                    <Link href="/dashboard/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20"/>
                  <DropdownMenuItem 
                    onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }}
                    className="text-yellow-400 focus:text-yellow-400 focus:bg-yellow-400/10 cursor-pointer">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="focus:bg-white/10 focus:text-white cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">My Software</h1>
                <Button asChild variant="outline" size="icon" className="border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20">
                  <Link href="/dashboard/upload">
                      <Upload className="h-4 w-4" />
                      <span className="sr-only">Upload Software</span>
                  </Link>
                </Button>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-white/20 hover:bg-transparent">
                            <TableHead className="text-white">Software</TableHead>
                            <TableHead className="text-white text-center">Price</TableHead>
                            <TableHead className="text-white text-center">Licenses Sold</TableHead>
                            <TableHead className="text-white text-center">Active</TableHead>
                            <TableHead className="text-white text-center">Blocked</TableHead>
                            <TableHead className="text-right text-white">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow className="border-b-0 hover:bg-transparent">
                              <TableCell colSpan={6} className="text-center text-gray-300 py-12">
                                  Loading your software stats...
                              </TableCell>
                            </TableRow>
                        ): mySoftware.length === 0 ? (
                            <TableRow className="border-b-0 hover:bg-transparent">
                                <TableCell colSpan={6} className="text-center text-gray-300 py-12">
                                    You have not uploaded any software yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            mySoftware.map((software) => (
                                <TableRow key={software._id} className="border-b-white/20 hover:bg-white/10 last:border-b-0">
                                    <TableCell className="font-medium text-white">{software.title}</TableCell>
                                    <TableCell className="text-center text-white">{software.price > 0 ? `${software.price} POL` : 'Free'}</TableCell>
                                    <TableCell className="text-center text-white">{software.totalLicenses}</TableCell>
                                    <TableCell className="text-center text-green-400">{software.activeLicenses}</TableCell>
                                    <TableCell className="text-center text-yellow-400">{software.blockedLicenses}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <Button asChild variant="outline" size="icon" className="border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 h-8 w-8">
                                            <Link href={`/dashboard/manage/${software._id}`}>
                                                <Settings className="h-4 w-4" />
                                                <span className="sr-only">Manage Software</span>
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="icon" className="border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-red-400 hover:text-red-500 h-8 w-8" onClick={() => confirmDeleteSoftware(software)}>
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete Software</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
          </main>
        </div>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isDeleting ? "Deleting..." : "Yes, delete account"}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog open={!!softwareToDelete} onOpenChange={(isOpen) => !isOpen && setSoftwareToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Delete "{softwareToDelete?.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the software and all its associated licenses. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingSoftware} onClick={() => setSoftwareToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteSoftware}
                    disabled={isDeletingSoftware}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isDeletingSoftware ? "Deleting..." : "Yes, Delete Software"}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
}

