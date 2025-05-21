import React, { useEffect, useRef } from 'react'
import { CardFooter } from '../ui/card';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { Message } from '../chat-panel';
import { supabase } from '@/utils/supabase/supabase';
import AwaitingConfirmation from './AwaitingConfirmation';
import ChatInterface from './ChatInterface';
import { RootState } from '@/lib/store';
import {
    summarySpecificationSlice,
    ToolSpecification,
    set as setToolSpec,
} from '@/lib/features/mcp_space_state/mcpSpaceStateSlice';

function CardFooterChatPanel({ setIsLoading, isLoading, messages, setMessages, user, activeCommand, setActiveCommand, session_id, user_id }: any) {


    const isRemovedFromSessionTable = useRef(false);

    const dispatch = useAppDispatch()
    const { tools } = useAppSelector((state: RootState) => state.summarySpecification);

    const prevToolsRef = useRef<ToolSpecification[]>([]);

    // Load chat history on mount
    useEffect(() => {
        const loadChatHistory = async () => {
            try {
                const response = await fetch(`/api/chat-history?session_id=${session_id}&user_id=${user_id}`);
                if (!response.ok) throw new Error(`Error fetching chat history: ${response.status}`);
                const data = await response.json();

                const { data: sessionData, error: sessionError } = await supabase
                    .from("mcp_server")
                    .select("*")
                    .eq("session_id", session_id);

                if (sessionError || !sessionData) {
                    console.error("Error fetching session data:", sessionError);
                    return;
                }

                if (sessionData.length > 0) {

                    // console.log("Calling update redux state from loadchathistory")
                    // console.log("sessionData[0].state: ", sessionData[0].state)
                    updateTheReduxState(sessionData[0].state);
                }

                // Use the same logic as parseCode to process chat history messages
                const chatMessages = data.map((event: any) => {
                    let parsedContent;
                    try {
                        parsedContent = typeof event.content === 'string'
                            ? JSON.parse(event.content)
                            : event.content;
                    } catch (e) {
                        console.error('Error parsing message content:', e);
                        return null;
                    }

                    if (parsedContent?.parts?.length > 0) {
                        const messageId = event.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                        const messageText = parsedContent.parts[0].text?.trim();

                        if (!messageText) return null;

                        // Check for TypeScript or JSON code blocks
                        const tsCodeBlock = messageText.match(/```(?:typescript|ts)\s*([\s\S]*?)```/i);
                        const jsonCodeBlock = messageText.match(/```json\s*([\s\S]*?)```/i);

                        // Check for tools code JSON structure
                        try {
                            const toolsJsonMatch = messageText.match(/({\s*"tools"\s*:\s*\[\s*{[\s\S]*?"code"\s*:\s*["'`])/i);
                            if (toolsJsonMatch) {
                                return {
                                    id: `${messageId}_tools_code`,
                                    timestamp: event.timestamp || Date.now(),
                                    content: "**tools code created**",
                                    role: 'assistant',
                                    author: event.app_name,
                                    awaitingConfirmation: false
                                };
                            }
                        } catch (e) {
                            // If regex fails, just continue
                        }

                        if (tsCodeBlock || jsonCodeBlock) {
                            if (tsCodeBlock) {
                                return {
                                    id: `${messageId}_ts`,
                                    timestamp: event.timestamp || Date.now(),
                                    content: "**index.ts** file created",
                                    role: 'assistant',
                                    author: event.app_name,
                                    awaitingConfirmation: false
                                };
                            }
                            if (jsonCodeBlock) {
                                const jsonContent = jsonCodeBlock[1].trim();
                                let fileMessage = "";
                                if (/^\s*{\s*"\$schema"\s*:/.test(jsonContent)) {
                                    fileMessage = "**wrangler.jsonc** file created";
                                } else {
                                    fileMessage = "**package.json** file created";
                                }
                                return {
                                    id: `${messageId}_json`,
                                    timestamp: event.timestamp || Date.now(),
                                    content: fileMessage,
                                    role: 'assistant',
                                    author: event.app_name,
                                    awaitingConfirmation: false
                                };
                            }
                        }

                        const isCollectorAgent =
                            event.app_name === "information_collector_agent" ||
                            (typeof event.app_name === 'string' &&
                                event.app_name.toLowerCase().includes('collector'));

                        const containsSpecification = /\b(?:specification|spec)s?\b.*?\b(?:summary|overview)\b/i.test(messageText);
                        const containsInputOutput = /\binputs?\b/i.test(messageText) || /\boutputs?\b/i.test(messageText);
                        const containsEnvironment = /\benvironment\s*(?:key|var|variable|setting)s?\b/i.test(messageText);
                        const containsLogic = /\b(?:logic|implementation|process|workflow|algorithm)\b/i.test(messageText);
                        const containsConfirmation = /(?:\bcan\s+I\s+proceed\b|\bproceed\b|\bcontinue\b|\bgenerate\b).*?\b(?:code|specification)?\b.*?(?:\(\s*yes\s*\/\s*no\s*\)|\byes\b|\bno\b|\by\/n\b|\byes\/no\b)/i.test(messageText);
                        const hasSpecificationContent = containsSpecification && (containsInputOutput || containsEnvironment || containsLogic);
                        const awaitingConfirmation = isCollectorAgent && hasSpecificationContent && containsConfirmation;

                        return {
                            id: messageId,
                            content: messageText,
                            role: parsedContent?.role === 'model' ? 'assistant' : 'user',
                            timestamp: event.timestamp || Date.now(),
                            author: event.app_name,
                            awaitingConfirmation: awaitingConfirmation
                        };
                    }
                    return null;
                }).filter(Boolean);

                chatMessages.sort((a: any, b: any) => a.timestamp - b.timestamp);
                if (chatMessages.length > 0) {
                    setMessages(chatMessages);
                } else {
                    setMessages([{
                        id: '1',
                        content: 'Welcome to the Nebula MCP Space Builder. How can I help you today?',
                        role: 'assistant',
                        timestamp: Date.now(),
                    }]);
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
                setMessages([{
                    id: '1',
                    content: 'Welcome to the Nebula MCP Space Builder. How can I help you today?',
                    role: 'assistant',
                    timestamp: Date.now(),
                }]);
            } finally {
                setIsLoading(false);
            }
        };

        loadChatHistory();
    }, [session_id, user_id]);

    // Listen for real-time updates
    useEffect(() => {
        const channel = supabase.channel("sessions realtime").on('postgres_changes', {
            event: "*",
            schema: "public",
            table: "sessions",
        }, (payload) => {
            let data = payload?.new;
            if (data && 'state' in data && data.state?.specification_json && !activeCommand) {
                console.log("Realtime update -> updating Redux state: ", data.state);
                updateTheReduxState(data.state);
            }
        }).subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
        setMessages((prev: any) => [
            ...prev,
            {
                id: Date.now().toString(),
                timestamp: Date.now(),
                ...message
            }
        ]);
    };

    const updateToStateInMCPServerTable = async (state: any) => {
        try {
            const { data, error } = await supabase
                .from("mcp_server")
                .update({ state: state })
                .eq("session_id", session_id);
            if (error) {
                console.error("Error updating state in mcp_server:", error);
            } else {
                console.log("Successfully updated state in mcp_server");
            }
        } catch (err) {
            console.error("Exception when updating state:", err);
        }
    };

    const storeStateInSessionTable = async (state: any) => {
        try {
            const { data, error } = await supabase
                .from("sessions")
                .update({ state: state })
                .eq("id", session_id)
                .eq("user_id", user_id);
            if (error) {
                console.error("Error storing state in session:", error);
            } else {
                console.log("Successfully stored state in session");
            }
        } catch (err) {
            console.error("Exception when storing state:", err);
        }
    };

    const removeStateFromSessionTable = async () => {
        try {
            const { data, error } = await supabase
                .from("sessions")
                .update({ state: {} })
                .eq("id", session_id)
                .eq("user_id", user_id);
            if (error) {
                console.error("Error removing state from session:", error);
            } else {
                console.log("Successfully removed state from session");
            }
        } catch (err) {
            console.error("Exception when removing state:", err);
        }
    };

    const sendMessage = async (messageText: string) => {
        setIsLoading(true);
        console.log("Sending message:", activeCommand ? activeCommand.description : messageText);

        if (activeCommand && activeCommand.category && activeCommand.tool) {
            const toolSpec = tools.find((tool: ToolSpecification) => tool.tool_name === activeCommand.tool);
            if (!toolSpec) {
                console.error("Tool specification not found for the active command.");
                return;
            }
            dispatch(summarySpecificationSlice.actions.remove(activeCommand.tool));
            storeStateInSessionTable(toolSpec);
            isRemovedFromSessionTable.current = true;
            console.log("Removed the tool: ", activeCommand.tool)
        }

        try {
            const response: any = await fetch('http://localhost:8000/run_sse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
                body: JSON.stringify({
                    app_name: "manager",
                    user_id: user_id,
                    session_id: session_id,
                    new_message: {
                        role: "user",
                        parts: [{ text: activeCommand ? activeCommand.description : messageText }]
                    },
                    streaming: false
                })
            });

            if (!response.ok) throw new Error(`Error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                lines.forEach(line => {
                    try {
                        const data = line.substring(6);
                        const parsedData = JSON.parse(data);

                        parseCode(parsedData);

                    } catch (error) {
                        console.error('Error parsing SSE data:', error, line);
                    }
                });
            }
        } catch (error) {
            console.error('Error calling SSE API:', error);
            addMessage({
                content: 'Sorry, there was an error processing your request. Please try again.',
                role: 'assistant',
            });
        } finally {
            setIsLoading(false);
        }
    };


    const parseCode = (parsedData : any) => {
        if (parsedData.content?.parts?.length > 0) {
            const messageId = parsedData.id || `msg_${Date.now().toString()}`;
            const messageText = parsedData.content.parts[0].text?.trim();

            console.log("Parsed message text:", messageText);

            if (messageText) {
                // Check for TypeScript or JSON code blocks
                const tsCodeBlock = messageText.match(/```(?:typescript|ts)\s*([\s\S]*?)```/i);
                const jsonCodeBlock = messageText.match(/```json\s*([\s\S]*?)```/i);

                console.log("TypeScript code block:", tsCodeBlock);

                // Check for tools code JSON structure
                // Detect tools code JSON structure (more robust than a fixed string)
                try {
                    const toolsJsonMatch = messageText.match(/({\s*"tools"\s*:\s*\[\s*{[\s\S]*?"code"\s*:\s*["'`])/i);
                    if (toolsJsonMatch) {
                        setMessages((prevMessages: any) => [
                            ...prevMessages,
                            {
                                id: `${messageId}_tools_code`,
                                timestamp: Date.now(),
                                content: "**tools code created**",
                                role: 'assistant',
                                author: parsedData.author,
                                awaitingConfirmation: false
                            }
                        ]);
                        // Skip the original messageText
                        return;
                    }
                } catch (e) {
                    // If regex fails, just continue
                }

                if (tsCodeBlock || jsonCodeBlock) {
                    // Show a message about file creation and display the code block(s)
                    if (tsCodeBlock) {
                        setMessages((prevMessages: any) => [
                            ...prevMessages,
                            {
                                id: `${messageId}_ts`,
                                timestamp: Date.now(),
                                content: "**index.ts** file created",
                                role: 'assistant',
                                author: parsedData.author,
                                awaitingConfirmation: false
                            }
                        ]);
                    }
                    if (jsonCodeBlock) {
                        const jsonContent = jsonCodeBlock[1].trim();
                        let fileMessage = "";
                        if (/^\s*{\s*"\$schema"\s*:/.test(jsonContent)) {
                            fileMessage = "**wrangler.jsonc** file created";
                        } else {
                            fileMessage = "**package.json** file created";
                        }
                        setMessages((prevMessages: any) => [
                            ...prevMessages,
                            {
                                id: `${messageId}_json`,
                                timestamp: Date.now(),
                                content: fileMessage,
                                role: 'assistant',
                                author: parsedData.author,
                                awaitingConfirmation: false
                            }
                        ]);
                    }
                    // Skip the original messageText
                    return;
                }

                const isCollectorAgent =
                    parsedData.author === "information_collector_agent" ||
                    (typeof parsedData.author === 'string' &&
                        parsedData.author.toLowerCase().includes('collector'));

                const containsSpecification = /\b(?:specification|spec)s?\b.*?\b(?:summary|overview)\b/i.test(messageText);
                const containsInputOutput = /\binputs?\b/i.test(messageText) || /\boutputs?\b/i.test(messageText);
                const containsEnvironment = /\benvironment\s*(?:key|var|variable|setting)s?\b/i.test(messageText);
                const containsLogic = /\b(?:logic|implementation|process|workflow|algorithm)\b/i.test(messageText);
                const containsConfirmation = /(?:\bcan\s+I\s+proceed\b|\bproceed\b|\bcontinue\b|\bgenerate\b).*?\b(?:code|specification)?\b.*?(?:\(\s*yes\s*\/\s*no\s*\)|\byes\b|\bno\b|\by\/n\b|\byes\/no\b)/i.test(messageText);
                const hasSpecificationContent = containsSpecification && (containsInputOutput || containsEnvironment || containsLogic);
                const awaitingConfirmation = isCollectorAgent && hasSpecificationContent && containsConfirmation;

                setMessages((prevMessages: any) => {
                    const isDuplicate = prevMessages.some((msg: any) => {
                        if (msg.id === messageId) return true;
                        if (msg.content === messageText) return true;
                        const shorterLength = Math.min(msg.content.length, messageText.length);
                        const longerLength = Math.max(msg.content.length, messageText.length);
                        if (shorterLength / longerLength > 0.8) {
                            const normalizedMsg = msg.content.toLowerCase().replace(/\s+/g, ' ');
                            const normalizedNew = messageText.toLowerCase().replace(/\s+/g, ' ');
                            return normalizedMsg.includes(normalizedNew) || normalizedNew.includes(normalizedMsg);
                        }
                        return false;
                    });
                    if (isDuplicate) return prevMessages;
                    return [
                        ...prevMessages,
                        {
                            id: messageId,
                            timestamp: Date.now(),
                            content: messageText,
                            role: 'assistant',
                            author: parsedData.author,
                            awaitingConfirmation: awaitingConfirmation
                        }
                    ];
                });
            }
        }
    }


    const updateTheReduxState = (state: any) => {
        if (!state) return;

        // console.log(Array.isArray(state));
        if (Array.isArray(state)) {
            // console.log("Processing array of tools:", state.length);
            state.forEach((doc: any) => {
                dispatch(setToolSpec(doc));
            });
            return;
        }

        console.log("Processing single tool:", state);
        // const toolSpec = updateToolSpecification(state);
        // if (!toolSpec) return;

        dispatch(summarySpecificationSlice.actions.set(state));

        // dispatch(setToolSpec(toolSpec));
        console.log(`Dispatched tool ${state.tool_name} to Redux store.`);
    };

    // Log updated tools after Redux state changes
    useEffect(() => {
        const currentTools = tools;
        const prevTools = prevToolsRef.current;

        // Only proceed if tools have actually changed
        if (JSON.stringify(currentTools) !== JSON.stringify(prevTools)) {
            // console.log("Redux tools after update:", currentTools);
            if (currentTools.length > 0) {
                if (!isRemovedFromSessionTable.current) {
                    updateToStateInMCPServerTable(currentTools);
                    isRemovedFromSessionTable.current = false;
                }
                // storeStateInSessionTable(currentTools[0]);
            }

            // Update ref to latest value
            prevToolsRef.current = currentTools;
        }
    }, [tools]);

    return (
        <CardFooter className="pt-4">
            <div className="flex w-full items-center space-x-2">
                {messages.length > 0 && messages[messages.length - 1].awaitingConfirmation ? (
                    <AwaitingConfirmation
                        isLoading={isLoading}
                        addMessage={addMessage}
                        sendMessage={sendMessage}
                    />
                ) : (
                    <ChatInterface
                        setActiveCommand={setActiveCommand}
                        activeCommand={activeCommand}
                        addMessage={addMessage}
                        tools={tools}
                        isLoading={isLoading}
                        sendMessage={sendMessage}
                    />
                )}
            </div>
        </CardFooter>
    )
}

export default CardFooterChatPanel



