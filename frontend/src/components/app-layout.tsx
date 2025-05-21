'use client';

import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChatPanel } from "@/components/chat-panel";
import { MainContent } from "@/components/main-content";

export function AppLayout({ serverId, sessionId, userId }: any) {
  return (
    <div className="flex flex-col h-screen dashboard-section">
      {/* Background Effect */}
      <div className="nebula-builder-background"></div>

      {/* Main Content with resizable panels */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 w-full"
      >
        {/* Left Panel - Chat Interface */}
        <ResizablePanel defaultSize={40} minSize={30} maxSize={45}>
          <div className="h-full" style={{ borderRight: '1px solid var(--nebula-border)' }}>
            <ChatPanel  session_id={sessionId} server_id={serverId} user_id={userId} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Main View with Tabs */}
        <ResizablePanel defaultSize={75}>
          <MainContent session_id={sessionId} server_id={serverId} user_id={userId} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
