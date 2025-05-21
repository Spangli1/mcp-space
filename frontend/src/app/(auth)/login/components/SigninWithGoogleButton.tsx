"use client";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth-actions";
import React, { useState, useEffect } from "react";

const SignInWithGoogleButton = () => {
  // State to control animation after page load and loading state
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set loaded state after a small delay for a professional appearance
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full relative overflow-hidden border border-indigo-500/30 bg-gray-800/50 text-gray-100 hover:bg-gray-700/60 hover:text-white transition-all duration-300 group ${loaded ? 'opacity-100' : 'opacity-0'
        }`} onClick={async () => {
          setLoading(true);
          // The server action will redirect, so we don't need to handle the promise resolution
          // If the server action fails, it will redirect to the error page directly
          signInWithGoogle();

          // Set a timeout to reset loading state if redirect doesn't happen quickly
          // This ensures the button doesn't stay in loading state if there's a network delay
          setTimeout(() => {
            setLoading(false);
          }, 4000);
        }}
      disabled={loading}
      style={{ transition: "opacity 0.5s ease, transform 0.5s ease, background-color 0.3s ease" }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent group-hover:from-transparent group-hover:via-indigo-500/20 group-hover:to-transparent" />
      {/* Google logo */}
      <div className="absolute left-3 flex items-center justify-center">
        <svg className={`w-5 h-5 mr-2 ${loading ? 'animate-pulse' : ''}`} viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      </div>
      {/* Button text with loading indicator */}
      <span className="relative z-10 flex items-center justify-center font-medium">
        {loading ? (
          <>
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          </>
        ) : (
          <>
            <span className={`inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2 transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}></span>
            Sign in with Google
          </>
        )}
      </span>

      {/* Subtle professional indicator */}
      <div className="absolute right-3 w-5 h-5 rounded-full border border-indigo-400/20 flex items-center justify-center">
        {loading ? (
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
        ) : (
          <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
        )}
      </div>
      {/* Loading animation overlay */}
      {loading && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 animate-pulse"></div>
          <div className="absolute top-0 left-0 h-0.5 bg-indigo-400 animate-[width_1.5s_ease-in-out_infinite_alternate]"
            style={{
              animation: "loading-bar 1.5s ease-in-out infinite",
              background: "linear-gradient(to right, #6366f1, #a855f7)"
            }}
          ></div>
          <style jsx>{`
            @keyframes loading-bar {
              0% { width: 0%; left: 0; }
              50% { width: 100%; left: 0; }
              100% { width: 0%; left: 100%; }
            }
          `}</style>
        </>
      )}
    </Button>
  );
};

export default SignInWithGoogleButton;
