'use client';

import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/utils/supabase/supabase";
import React, { useEffect } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";


export default function BuilderPage({ params }: any) {
  // Unwrap the params object with React.use()
  const query_dict: any = React.use(params);

  const [userId, setUserId] = React.useState<string | null>(null);

  const decoded = decodeURIComponent(query_dict.serverId);

  const query = `server_id=${decoded}`;

  // Use URLSearchParams to parse
  const updatedParams = new URLSearchParams(query);

  const serverId = updatedParams.get('server_id');
  const sessionId = updatedParams.get('session_id');



  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      } else {
        redirect('/login');
      }
    }
    checkUser();
  }, [serverId]);

  return (
    <React.Fragment>
      <Navbar />
      <AppLayout serverId={serverId} sessionId={sessionId} userId={userId} />
    </React.Fragment>

  );
}
