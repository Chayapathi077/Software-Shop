
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, User, CheckCircle, Gem, Rocket, Heart, Star, Cloud, Anchor, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, updateUserProfile } from '@/lib/auth';
import { cn } from '@/lib/utils';

const iconOptions = [
  { name: 'Gem', Component: Gem },
  { name: 'Rocket', Component: Rocket },
  { name: 'Heart', Component: Heart },
  { name: 'Star', Component: Star },
  { name: 'Cloud', Component: Cloud },
  { name: 'Anchor', Component: Anchor },
];

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      const fetchProfile = async () => {
        const profile = await getUserProfile(storedUsername);
        if (profile?.profileIcon) {
          setSelectedIcon(profile.profileIcon);
        } else {
          // Fallback to session storage if DB is not updated yet or fails
          const sessionProfileIcon = sessionStorage.getItem('profileIcon');
          if (sessionProfileIcon) {
            setSelectedIcon(sessionProfileIcon);
          }
        }
      };
      fetchProfile();
    } else {
      router.push('/');
    }
  }, [router]);
  
  const handleSaveChanges = async () => {
    if (!username) return;
    setIsSaving(true);
    
    const result = await updateUserProfile(username, { profileIcon: selectedIcon });

    if (result.success) {
      if (selectedIcon) {
        sessionStorage.setItem('profileIcon', selectedIcon);
      } else {
        sessionStorage.removeItem('profileIcon');
      }
      toast({
        title: "Profile Updated",
        description: "Your profile icon has been saved.",
      });
      router.push('/dashboard');
    } else {
       toast({
        title: "Error Saving Profile",
        description: result.message,
        variant: 'destructive'
      });
    }
    setIsSaving(false);
  };

  const handleRemoveIcon = () => {
    setSelectedIcon(null);
  }
  
  const SelectedIconComponent = selectedIcon ? iconOptions.find(opt => opt.name === selectedIcon)?.Component : null;

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-accent p-4 text-white">
       <header className="absolute top-0 left-0 right-0 h-16 px-4 flex items-center justify-between">
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
       
      <div className="relative">
        <div className="relative h-auto w-[calc(100vw-4rem)] max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">Edit Profile</h2>
            <p className="text-gray-300">Choose your icon</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center overflow-hidden">
                  {SelectedIconComponent ? (
                     <SelectedIconComponent className="w-16 h-16 text-white" />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
              </div>
              <div className="text-center">
                <p className="font-bold text-xl">{username}</p>
                <p className="text-sm text-gray-300">Username</p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {iconOptions.map(({name, Component}) => (
                    <button
                      key={name}
                      onClick={() => setSelectedIcon(name)}
                      className={cn(
                        "relative rounded-full aspect-square overflow-hidden border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary cursor-pointer",
                        selectedIcon === name ? "border-white bg-white/20" : "border-transparent hover:border-white bg-white/10"
                      )}
                    >
                      <Component className="w-8 h-8 text-white" />
                      {selectedIcon === name && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </button>
                ))}
            </div>

             <div className="flex gap-4">
                 <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                    onClick={handleRemoveIcon}
                >
                  Remove Icon
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
