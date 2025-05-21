'use client';

import { supabase } from '@/utils/supabase/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold text-center">Welcome to MCP Space</h1>
        <p className="text-lg text-center">Build and deploy your MCP servers with ease.</p>
        <div className="flex gap-4 mt-6">
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          ) : user ? (
            <>
              <Button asChild size="lg">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button size="lg" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
