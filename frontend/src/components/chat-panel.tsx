'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { supabase } from "@/utils/supabase/supabase";
import { redirect } from "next/navigation";
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import CardContentChatPanel from './ChatPanel/CardContent';
import CardFooterChatPanel from './ChatPanel/CardFooter';

// Define interfaces directly in this file
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  author?: string;
  awaitingConfirmation?: boolean;
}

export interface CommandManager {
  category: string;
  tool: string;
  description: string;
}

export function ChatPanel({ session_id, server_id, user_id }: any) {


  const [user, setUser] = useState<any>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  

  const [activeCommand, setActiveCommand] = useState<CommandManager | null>(null);



  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // console.log('Session:', user);

      if (!user) {
        redirect("/login");
      }
      if (user) setUser(user);
      // console.log(user)
    }
    checkUser();
  }, []);


  console.log(activeCommand);

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full border-0 rounded-none" style={{ backgroundColor: 'var(--nebula-bg)' }}>
        {/* <CardHeader className="pb-2" style={{ borderBottom: '1px solid var(--nebula-border)' }}>
          <CardTitle className="text-lg" style={{ color: 'var(--nebula-primary-strong)' }}>Chat</CardTitle>
        </CardHeader> */}

        <CardContentChatPanel
          isLoading={isLoading}
          messages={messages}
          user={user}
        />

        <CardFooterChatPanel
          user={user}

          // common
          isLoading={isLoading}
          messages={messages}
          setMessages={setMessages}

          activeCommand={activeCommand}
          setActiveCommand={setActiveCommand}

          session_id={session_id}
          user_id={user_id}
          setIsLoading={setIsLoading}

        />
      </Card>
    </div>
  );
}
