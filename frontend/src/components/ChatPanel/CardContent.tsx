'use client';

import React, { useEffect, useRef } from 'react'
import { CardContent } from '../ui/card'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Message } from '../chat-panel';

function CardContentChatPanel({ isLoading, messages, user }: any) {

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    return (
        <CardContent className="flex-grow overflow-auto pb-0">
            <div className="space-y-4">
                {isLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" style={{ color: 'var(--nebula-primary)' }} />
                        <p style={{ color: 'var(--nebula-text-muted)' }}>Loading chat history...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                        <p style={{ color: 'var(--nebula-text-muted)' }}>No messages yet. Start a conversation!</p>
                    </div>
                ) : (
                    messages.map((message: Message) => (
                        <div
                            key={message.id}
                            className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar circle */}
                            <div
                                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center overflow-hidden`}
                                style={{
                                    background: message.role === 'user'
                                        ? 'linear-gradient(135deg, var(--nebula-primary) 0%, var(--nebula-primary-strong) 100%)'
                                        : 'linear-gradient(135deg, var(--nebula-bg-lighter) 0%, var(--nebula-muted) 100%)',
                                    border: message.role === 'user'
                                        ? '1px solid var(--nebula-primary-strong)'
                                        : '1px solid var(--nebula-border)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            >
                                {message.role === 'user' ? (
                                    <div className="w-full h-full overflow-hidden" style={{ color: 'var(--nebula-primary)' }} >
                                        <Image
                                            src={user?.user_metadata.avatar_url}
                                            alt='mcp-logo chat'
                                            width={500}
                                            height={500}
                                            loading='lazy'
                                            className='object-cover w-full h-full'
                                        />
                                    </div>
                                ) : (
                                    <div className="h-4 w-4" style={{ color: 'var(--nebula-primary)' }} >
                                        <Image
                                            src={'/mcp-logo.png'}
                                            alt='mcp-logo chat'
                                            width={100}
                                            height={100}
                                            loading='lazy'
                                            className='object-contain w-full h-full'
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Message content */}
                            <div
                                className={`p-3 rounded-lg ${message.role === 'user'
                                    ? 'ml-auto max-w-[80%]'
                                    : 'max-w-[80%]'
                                    }`}
                                style={{
                                    backgroundColor: message.role === 'user'
                                        ? 'rgba(124, 236, 76, 0.08)'
                                        : 'var(--nebula-muted)',
                                    color: 'var(--nebula-text)',
                                    overflowWrap: 'break-word',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word'
                                }}
                            >
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: message.content
                                                // Convert h1 headers with theme color
                                                .replace(/^# (.*?)$/gm, '<h1 class="text-xl font-bold" style="color: var(--nebula-primary);">$1</h1>')
                                                // Convert h2 headers with theme color at 50% opacity
                                                .replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold" style="color: var(--nebula-primary);">$1</h2>')
                                                // Convert h3 headers with theme color
                                                .replace(/^### (.*?)$/gm, '<h3 class="text-md font-bold" style="color: var(--nebula-primary-strong);">$1</h3>')
                                                // Convert numbered lists with colored numbers
                                                .replace(/^(\d+)\. (.*?)$/gm, '<ol class="list-decimal ml-4"><li><span style="color: var(--nebula-primary-muted)">$1.</span> $2</li></ol>')
                                                // Convert bold text with primary color
                                                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold" style="color: var(--nebula-primary-strong)">$1</strong>')
                                                // Convert italic text
                                                .replace(/\*(.*?)\*/g, '<em class="italic" style="color: var(--nebula-text-emphasis)">$1</em>')
                                                // Basic code block conversion with better styling
                                                .replace(/```([\s\S]*?)```/g, '<pre class="overflow-auto rounded p-2" style="background-color: var(--nebula-code-bg); border: 1px solid var(--nebula-border); white-space: pre-wrap;">$1</pre>')
                                                // Basic inline code conversion
                                                .replace(/`([^`]+)`/g, '<code class="rounded px-1 py-0.5" style="background-color: var(--nebula-code-bg); color: var(--nebula-primary);">$1</code>')
                                                // Highlight important text with background color
                                                .replace(/==(.*?)==/g, '<span style="background-color: var(--nebula-highlight-bg); color: var(--nebula-highlight-text);">$1</span>')
                                                // Horizontal rule with themed color
                                                .replace(/^---$/gm, '<hr style="border-color: var(--nebula-border); margin: 1rem 0;" />')
                                                // Links with themed color
                                                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="underline" style="color: var(--nebula-primary);">$1</a>')
                                                // Convert newlines to <br> tags
                                                .replace(/\n/g, '<br />')
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="p-3 rounded-lg max-w-[80%] flex items-center space-x-2" style={{
                        backgroundColor: 'var(--nebula-muted)',
                        color: 'var(--nebula-text-muted)'
                    }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm">Thinking...</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </CardContent>
    )
}

export default CardContentChatPanel
