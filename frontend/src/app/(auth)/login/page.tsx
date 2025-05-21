"use client";
import React, { useEffect, useState } from 'react';
import SignInWithGoogleButton from './components/SigninWithGoogleButton';
import Image from 'next/image';
import { supabase } from '@/utils/supabase/supabase';
import { useRouter } from 'next/navigation';

// Custom animation component to enhance animation detection
const AnimatedElement: React.FC<{
    children: React.ReactNode;
    show: boolean;
    delay?: number;
    className?: string;
}> = ({ children, show, delay = 0, className = "" }) => {
    return (
        <div
            className={`transition-all duration-700 ${show
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const LoginPage = () => {
    const router = useRouter();
    // States to control elements that appear after page load
    const [loaded, setLoaded] = useState(false);
    
    // Check if the user is already authenticated
    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push('/dashboard');
            }
        }
        
        checkAuth();
    }, [router]);
    const [visible, setVisible] = useState({
        container: false,
        content: false,
        footer: false,
        gridLines: false
    });
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                // User is logged in, redirect to home page
                router.push('/dashboard');
            } else {
                // User is not logged in, show login page
                setCheckingAuth(false);
            }
        };
        
        checkUser();
    }, [router]);

    // Control animations that appear after page load - professional and subtle
    useEffect(() => {
        setLoaded(true);

        // Staggered reveal of elements for a professional appearance
        const timers = [
            setTimeout(() => setVisible(prev => ({ ...prev, container: true })), 300),
            setTimeout(() => setVisible(prev => ({ ...prev, content: true })), 800),
            setTimeout(() => setVisible(prev => ({ ...prev, gridLines: true })), 1000),
            setTimeout(() => setVisible(prev => ({ ...prev, footer: true })), 1200)
        ];

        return () => timers.forEach(timer => clearTimeout(timer));
    }, []);

    // Show loading state while checking authentication
    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950">
                <div className="p-4 flex flex-col items-center">
                    <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400">Checking authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-4 py-12 relative overflow-hidden">
            {/* Professional static star background - no animation */}
            <div className="absolute inset-0 bg-[url('/images/stars-bg.svg')] bg-cover opacity-60"></div>

            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/5 via-transparent to-slate-900/5"></div>

            {/* Professional subtle grid pattern - appears after load */}
            <div
                className={`absolute inset-0 opacity-0 transition-opacity duration-1000 ${visible.gridLines ? 'opacity-5' : ''}`}
                style={{
                    backgroundImage: 'linear-gradient(to right, rgba(99, 102, 241, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.3) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}
            ></div>

            {/* Vertical accent lines - subtle and professional */}
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent opacity-30"></div>
            <div className="absolute right-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent opacity-30"></div>

            {/* Login container with professional styling */}
            <div
                className={`w-full max-w-md p-8 bg-gray-900/80 rounded-lg shadow-xl border border-indigo-500/10 backdrop-blur-md z-10 relative transition-all duration-700 ${visible.container
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4'
                    }`}
            >
                {/* Subtle glow */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/5 via-indigo-500/10 to-indigo-500/5 -z-10 opacity-50"></div>

                {/* Professional logo area */}
                <div className={`text-center mb-8 relative transition-opacity duration-1000 ${visible.content ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="mb-6 flex justify-center">
                        <div className="w-full h-16  flex items-center justify-center">
                            <Image
                                src={'/logo-white.png'}
                                alt='mcp space logo'
                                width={500}
                                height={500}
                                className="w-full h-full object-contain "
                            />
                        </div>
                    </div>

                    <h1 className="text-2xl font-semibold text-gray-100 tracking-wide">Welcome Back</h1>

                    {/* Professional accent line */}
                    <div className={`h-px w-16 bg-indigo-500/30 mx-auto my-4 transition-all duration-1000 ${visible.content ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}></div>

                    <p className="text-gray-400 text-sm">
                        Sign in to access your account
                    </p>
                </div>

                {/* Login form area */}
                <AnimatedElement show={visible.content} delay={300}>
                    {/* Custom login button */}
                    <div className="mt-2 mb-6">
                        <SignInWithGoogleButton />
                    </div>

                    {/* Status indicator - professional and minimal */}
                    <div className="flex justify-center">
                        <div className="flex items-center space-x-1 px-3 py-1 bg-gray-800/50 rounded-full border border-gray-700/30">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            <span className="text-gray-400 text-xs">Secure Connection</span>
                        </div>
                    </div>

                    {/* Terms text - clean and professional */}
                    {/* <p className="text-gray-500 text-xs text-center mt-6">
                        By signing in, you agree to our <a href="#" className="text-indigo-400 hover:text-indigo-300 transition">Terms of Service</a> and <a href="#" className="text-indigo-400 hover:text-indigo-300 transition">Privacy Policy</a>
                    </p> */}
                </AnimatedElement>
            </div>

            {/* Professional footer - appears after load */}
            <div className={`mt-8 text-center transition-opacity duration-700 ${visible.footer ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-gray-500 text-xs">&copy; {new Date().getFullYear()} MCP Space. All rights reserved.</div>
            </div>
        </div>
    );
};

export default LoginPage;
