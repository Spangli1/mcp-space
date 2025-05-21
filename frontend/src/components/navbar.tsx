'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { LogOut } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabase';
import { Badge } from './ui/badge';

export function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);
        };

        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_OUT') {
                    router.push('/login');
                }
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-50 w-full nebula-navbar">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-3 w-[11rem]">
                        <Image
                            src="/logo-white.png"
                            alt="Nebula Logo"
                            width={500}
                            height={100}
                            className='w-full h-full object-contain'
                        />
                    </Link>
                    <Badge variant="destructive" className="bg-[#7ece4c] text-white hover:bg-[#6cb43d] cursor-none">Beta</Badge>
                </div>

                <div className="flex items-center gap-3">                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="nav-button"
                        style={{ 
                            color: 'var(--nebula-text-muted)', 
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <LogOut size={16} className="mr-2" />
                        Sign out
                    </Button>

                    {user && (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-[#7ece4c]/20 flex items-center justify-center text-[#7ece4c] font-medium">
                                {user.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}