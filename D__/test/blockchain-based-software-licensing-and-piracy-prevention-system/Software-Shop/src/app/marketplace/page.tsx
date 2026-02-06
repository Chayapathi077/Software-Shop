
"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, User, Tag, Wallet, Zap, Gem, Rocket, Heart, Star, Cloud, Anchor, Search, Fingerprint, CircleDollarSign, X } from 'lucide-react';
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
import { getAllSoftware, recordLicensePurchase } from '@/lib/auth';
import { useToast } from "@/hooks/use-toast";
import { BrowserProvider, Contract, ethers, Interface } from 'ethers';
import { SOFTWARE_LICENSE_ABI } from '@/lib/abi';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';


const SOFTWARE_LICENSE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SOFTWARE_LICENSE_CONTRACT_ADDRESS || '0xa3BBFe67BA745F4A2b566fc31Cc0724Ead830938';

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
    description: string;
    price: number;
    sellerUsername: string;
    sellerWalletAddress: string; 
    sellerProfileIcon?: string;
    fileUrl: string;
    createdAt: string;
    category: string;
    licenseType: string;
    licensingRules: {
      ipLock: boolean;
      fingerprintLock: boolean;
    }
};

const SoftwareCard = ({ software, onBuy, isBuying, onSelect }: { software: Software, onBuy: (software: Software) => void, isBuying: boolean, onSelect: (software: Software) => void }) => {
  const isFree = software.price <= 0;
  const SellerIcon = software.sellerProfileIcon ? iconComponents[software.sellerProfileIcon] || User : User;

  return (
     <motion.div
        layoutId={`card-container-${software._id}`}
        onClick={() => onSelect(software)}
        className="relative flex flex-col justify-between rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition-all hover:bg-white/20 hover:shadow-2xl h-full cursor-pointer"
    >
      <div>
        <motion.h3 layoutId={`card-title-${software._id}`} className="text-lg font-bold mb-2 text-white truncate">{software.title}</motion.h3>
         <motion.div layoutId={`card-seller-${software._id}`} className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <SellerIcon className="h-4 w-4" />
            <span>{software.sellerUsername}</span>
         </motion.div>
        <motion.p layoutId={`card-description-${software._id}`} className="text-sm text-gray-300 mb-3 h-12 overflow-hidden text-ellipsis">{software.description}</motion.p>
      </div>
       <div className="flex flex-col gap-3">
         <motion.div layoutId={`card-rules-${software._id}`} className="flex items-center gap-3 py-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Wallet className="h-5 w-5 text-gray-300" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Wallet-Bound License</p>
                </TooltipContent>
              </Tooltip>
              {software.licensingRules.fingerprintLock && (
                <Tooltip>
                  <TooltipTrigger>
                    <Fingerprint className="h-5 w-5 text-gray-300" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Device-Locked License</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
        </motion.div>
         <div className="flex items-center justify-between">
            <motion.div layoutId={`card-price-${software._id}`} className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-green-400"/>
                <span className="text-lg font-bold text-white">{isFree ? 'Free' : `${software.price} POL`}</span>
            </motion.div>
            <motion.div layoutId={`card-buy-${software._id}`}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-yellow-400 hover:text-yellow-300 bg-black/10 hover:bg-yellow-400/10 backdrop-blur-sm rounded-full border border-yellow-400/20" 
                    onClick={(e) => { e.stopPropagation(); onBuy(software); }} 
                    disabled={isBuying && selectedSoftwareForPurchase?._id === software._id}
                >
                    <CircleDollarSign className="h-6 w-6" />
                </Button>
            </motion.div>
        </div>
       </div>
    </motion.div>
  );
};


export default function MarketplacePage() {
  const [allSoftware, setAllSoftware] = useState<Software[]>([]);
  const [filteredSoftware, setFilteredSoftware] = useState<Software[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  
  const [selectedSoftwareForPurchase, setSelectedSoftwareForPurchase] = useState<Software | null>(null);
  
  const [selectedSoftwareForView, setSelectedSoftwareForView] = useState<Software | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchAllSoftware = useCallback(async () => {
    setIsLoading(true);
    try {
        const softwareList = await getAllSoftware();
        setAllSoftware(softwareList);
        setFilteredSoftware(softwareList);
    } catch (error) {
        console.error("Failed to fetch software:", error);
        toast({
            title: "Error Loading Marketplace",
            description: "Could not load software. Please try again later.",
            variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllSoftware();
  }, [fetchAllSoftware]);

  const handleFilter = useCallback(() => {
    let filtered = allSoftware;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSoftware(filtered);
  }, [allSoftware, selectedCategory, searchTerm]);

  useEffect(() => {
    handleFilter();
  }, [selectedCategory, searchTerm, allSoftware, handleFilter]);
  
  const handleBuyClick = (software: Software) => {
    if (!software.sellerWalletAddress || !ethers.isAddress(software.sellerWalletAddress)) {
        toast({ title: "Purchase Not Available", description: `This software cannot be purchased because the seller has not configured a valid wallet address.`, variant: "destructive", duration: 9000 });
        return;
    }
    setSelectedSoftwareForPurchase(software);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedSoftwareForPurchase) {
      toast({ title: "Error", description: "No software selected for purchase.", variant: "destructive" });
      return;
    }
    
    const finalSoftware = selectedSoftwareForPurchase;
    setIsBuying(true);
    
    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask not found. Please install MetaMask to purchase a license.");
        }
        
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (!accounts || accounts.length === 0) {
            throw new Error("Wallet connection was cancelled or failed.");
        }
        const currentBuyerAddress = ethers.getAddress(accounts[0]);
        const sellerChecksumAddress = ethers.getAddress(finalSoftware.sellerWalletAddress);
        const isSelfPurchase = currentBuyerAddress.toLowerCase() === sellerChecksumAddress.toLowerCase();

        const amoyChainId = '0x13882'; // 80002
        const network = await provider.getNetwork();
        if (network.chainId.toString() !== BigInt(amoyChainId).toString()) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: amoyChainId }],
            });
        }
        
        const finalProvider = new BrowserProvider(window.ethereum);
        const signer = await finalProvider.getSigner();

        let buyerIp = '';
        if (finalSoftware.licensingRules.ipLock) {
            try {
              const ipResponse = await fetch('https://api.ipify.org?format=json');
              if (ipResponse.ok) buyerIp = (await ipResponse.json()).ip;
            } catch (ipError) {
              console.warn("Could not fetch IP address, proceeding without it.", ipError);
            }
        }
        
        const priceInWei = finalSoftware.price > 0 && !isSelfPurchase ? ethers.parseEther(String(finalSoftware.price)) : BigInt(0);

        if (priceInWei > 0) {
            toast({ title: "Processing Payment...", description: "Please confirm the transaction in MetaMask." });
        } else if (isSelfPurchase) {
            toast({ title: "Self-Purchase Detected", description: "Minting license directly without payment." });
        } else {
            toast({ title: "Free Software", description: "Minting license directly without payment." });
        }

        const metadata = {
            name: `Software License: ${finalSoftware.title}`,
            description: `This NFT represents a unique, verifiable license for ${finalSoftware.title}. ${finalSoftware.description}`,
            image: "https://bafybeifqi5yrkg7r3scz5g4spu2z5i7nd3rlol74y2k72i4h5qjcaa2gxy.ipfs.nftstorage.link/ss-logo-blue.png",
            attributes: [
                { trait_type: "Software Title", value: finalSoftware.title },
                { trait_type: "Seller", value: finalSoftware.sellerUsername },
                { trait_type: "Purchase Date", value: new Date().toISOString() },
                { trait_type: "IP Locked", value: String(finalSoftware.licensingRules.ipLock) },
                { trait_type: "Device Locked", value: String(finalSoftware.licensingRules.fingerprintLock) },
            ],
            software_file_url: finalSoftware.fileUrl
        };
        
        const metadataResponse = await fetch('/api/metadata/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metadata)
        });

        if (!metadataResponse.ok) {
            throw new Error((await metadataResponse.json()).message || "Failed to upload license metadata.");
        }
        const { metadataUrl } = await metadataResponse.json();
        
        const contract = new Contract(SOFTWARE_LICENSE_CONTRACT_ADDRESS, SOFTWARE_LICENSE_ABI, signer);
        
        toast({ title: "Confirm Transaction", description: "Please confirm the transaction in MetaMask to mint your license." });
        
        const mintTx = await contract.mintLicense(currentBuyerAddress, metadataUrl, buyerIp, { value: priceInWei });
        
        const mintReceipt = await mintTx.wait();
        
        if (!mintReceipt.logs || mintReceipt.logs.length === 0) {
          throw new Error("Mint transaction failed to return the expected logs. Please check the transaction on a block explorer.");
        }

        const contractInterface = new Interface(SOFTWARE_LICENSE_ABI);
        const transferEvents = mintReceipt.logs
            .map((log: any) => {
                try {
                    return contractInterface.parseLog({ data: log.data, topics: [...log.topics] });
                } catch (e) {
                    return null;
                }
            })
            .filter((log: any) => log && log.name === 'Transfer' && log.args.to.toLowerCase() === currentBuyerAddress.toLowerCase());

        if (!transferEvents || transferEvents.length === 0) {
            throw new Error("Mint transaction succeeded but the Transfer event to your wallet was not found. Please contact support.");
        }

        const tokenId = Number(transferEvents[0].args.tokenId);
        
        const recordResult = await recordLicensePurchase({
            softwareId: finalSoftware._id,
            buyerAddress: currentBuyerAddress,
            tokenId: tokenId,
            transactionHash: mintTx.hash,
            buyerIp: buyerIp
        });
        
        if (recordResult.success) {
            toast({ 
                title: "Purchase Complete!", 
                description: `Your license for "${finalSoftware.title}" (Token ID: ${tokenId}) has been minted.`,
                duration: 9000
            });
        } else {
             throw new Error(recordResult.message || "On-chain mint was successful, but failed to record purchase in our database. Please contact support.");
        }

    } catch (error: any) {
       console.error("Purchase failed:", error);
       let errorMessage = "An unexpected error occurred.";
       if (error.code === 4001) {
           errorMessage = "Transaction was rejected in MetaMask.";
       } else if (error.reason) { 
           errorMessage = `Transaction failed: ${error.reason}`;
       } else if (error.message) {
           errorMessage = error.message;
       } else if (error.info?.error?.message) {
           errorMessage = error.info.error.message;
       }
       toast({ title: "Purchase Failed", description: errorMessage, variant: "destructive", duration: 9000 });
    } finally {
      setIsBuying(false);
      setSelectedSoftwareForPurchase(null);
    }
  };
  
  const SelectedIcon = selectedSoftwareForView?.sellerProfileIcon && iconComponents[selectedSoftwareForView.sellerProfileIcon]
    ? iconComponents[selectedSoftwareForView.sellerProfileIcon] 
    : User;


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
        <div className="flex items-center">
          <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
            <Link href="/dashboard">
              <ArrowLeft className="h-6 w-6" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white">Marketplace</h1>
                <p className="text-gray-300">Discover and purchase software licenses</p>
            </div>
            <div className="flex items-center gap-2">
                 <Input 
                   type="text" 
                   placeholder="Search by title..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="h-11 w-[200px] border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm"
                 />
                 <Select onValueChange={setSelectedCategory} defaultValue="all">
                    <SelectTrigger className="h-11 w-[180px] border-white/30 bg-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="productivity">Productivity</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="gaming">Gaming</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        {isLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-64 rounded-2xl bg-white/10 animate-pulse"></div>
                ))}
            </div>
        ) : filteredSoftware.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredSoftware.map((software) => (
                    <SoftwareCard key={software._id} software={software} onBuy={handleBuyClick} isBuying={isBuying && selectedSoftwareForPurchase?._id === software._id} onSelect={setSelectedSoftwareForView}/>
                ))}
            </div>
        ) : (
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl text-center text-gray-300 py-24">
                <p className="text-lg">No Software Found</p>
                <p className="text-sm text-gray-400 mt-2">There is no software matching your filter criteria.</p>
            </div>
        )}
      </main>

       <AnimatePresence>
        {selectedSoftwareForView && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setSelectedSoftwareForView(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                layoutId={`card-container-${selectedSoftwareForView._id}`}
                className="relative flex flex-col justify-between rounded-2xl border border-white/20 bg-primary/80 p-6 shadow-lg w-full max-w-lg"
              >
                <div className="relative">
                   <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 text-white hover:bg-white/20" onClick={() => setSelectedSoftwareForView(null)}><X className="h-5 w-5"/></Button>
                   <motion.h3 layoutId={`card-title-${selectedSoftwareForView._id}`} className="text-2xl font-bold mb-2 text-white">{selectedSoftwareForView.title}</motion.h3>
                   <motion.div layoutId={`card-seller-${selectedSoftwareForView._id}`} className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                      <SelectedIcon className="h-4 w-4" />
                      <span>{selectedSoftwareForView.sellerUsername}</span>
                   </motion.div>
                   
                   <motion.p layoutId={`card-description-${selectedSoftwareForView._id}`} className="text-sm text-gray-200 mb-4">{selectedSoftwareForView.description}</motion.p>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline" className="border-white/20 bg-white/10 text-white text-xs capitalize">{selectedSoftwareForView.category}</Badge>
                        <Badge variant="outline" className="border-white/20 bg-white/10 text-white text-xs capitalize">{selectedSoftwareForView.licenseType}</Badge>
                    </div>

                    <div className="space-y-2 mb-6">
                        <h4 className="font-semibold text-white">License Rules</h4>
                         <motion.div layoutId={`card-rules-${selectedSoftwareForView._id}`} className="flex flex-col gap-2 text-gray-300">
                             <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-green-400" /> <span>Wallet-Bound License (Always included)</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <Fingerprint className={cn("h-5 w-5", selectedSoftwareForView.licensingRules.fingerprintLock ? "text-green-400" : "text-gray-500")} /> <span>Device-Locked License {selectedSoftwareForView.licensingRules.fingerprintLock ? "(Enabled)" : "(Disabled)"}</span>
                             </div>
                         </motion.div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <motion.div layoutId={`card-price-${selectedSoftwareForView._id}`} className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-green-400"/>
                            <span className="text-2xl font-bold text-white">{selectedSoftwareForView.price <= 0 ? 'Free' : `${selectedSoftwareForView.price} POL`}</span>
                        </motion.div>
                        <motion.div layoutId={`card-buy-${selectedSoftwareForView._id}`}>
                             <Button 
                                variant="outline" 
                                className="text-yellow-400 hover:text-yellow-300 bg-black/10 hover:bg-yellow-400/10 backdrop-blur-sm rounded-lg border border-yellow-400/20 text-lg px-6 py-5" 
                                onClick={(e) => { e.stopPropagation(); handleBuyClick(selectedSoftwareForView); setSelectedSoftwareForView(null); }} 
                                disabled={isBuying && selectedSoftwareForPurchase?._id === selectedSoftwareForView._id}
                            >
                                <CircleDollarSign className="mr-2 h-6 w-6" />
                                {isBuying && selectedSoftwareForPurchase?._id === selectedSoftwareForView._id ? 'Processing...' : 'Buy License'}
                            </Button>
                        </motion.div>
                    </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

     <AlertDialog open={!!selectedSoftwareForPurchase} onOpenChange={(isOpen) => { if(!isOpen) { setSelectedSoftwareForPurchase(null); }}}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription>
                You are about to purchase a license for <span className="font-bold text-white">{selectedSoftwareForPurchase?.title}</span>. This will send payment to the seller and mint the license NFT to your connected wallet.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span className="font-bold text-white">{selectedSoftwareForPurchase?.price && selectedSoftwareForPurchase.price > 0 ? `${selectedSoftwareForPurchase?.price} POL` : 'Free'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Seller:</span>
                    <div className="flex items-center gap-2">
                         <span className="font-mono text-xs">{selectedSoftwareForPurchase?.sellerUsername}</span>
                    </div>
                </div>
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isBuying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleConfirmPurchase}
                disabled={isBuying}
            >
                {isBuying ? "Processing..." : "Confirm & Purchase"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
    </>
  );
}

    