import React, { useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, Loader2, Pencil, Plus, SendHorizontal, Slash, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

function ChatInterface(
    {
        setActiveCommand,
        activeCommand,
        addMessage,
        tools,
        isLoading,
        sendMessage
    }: any
) {

    const [showCommandPopover, setShowCommandPopover] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const [showToolsPopover, setShowToolsPopover] = useState(false);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);

    const [userInput, setUserInput] = useState('');


    const inputRef = useRef<HTMLTextAreaElement>(null);



    // Handle command category selection
    const handleCommandSelect = (category: string) => {
        setSelectedCategory(category);
        setActiveCommand({
            category: category,
            tool: activeCommand?.tool || '',
            description: activeCommand?.description || ''
        })
        setShowCommandPopover(false);
        if (category !== 'create') { setShowToolsPopover(true); setUserInput(''); }
    };


    // Handle backspace to remove the command tag
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        } else if (e.key === '/') {
            if (userInput === '' || userInput.endsWith(' ')) {
                setShowCommandPopover(true);
            }
        } else if (e.key === 'Backspace' && userInput === '' && activeCommand) {
            // Remove the command tag when pressing backspace with empty input
            setActiveCommand(null);
            setSelectedTool(null);
            e.preventDefault(); // Prevent any default backspace behavior
        }
    };


    const handleSendMessage = async () => {
        if (userInput.trim() || activeCommand) {
            // Create the message content, including command if present
            const messageContent = activeCommand
                ? `[${activeCommand.category}: ${activeCommand.tool}] ${userInput.trim()}`
                : userInput.trim();

            // Add user message
            addMessage({
                content: messageContent,
                role: 'user',
            });

            // Clear input and command
            setUserInput('');
            setActiveCommand(null);
            setSelectedTool(null);

            // Send the message with the command that was active at send time
            await sendMessage(messageContent);
        }
    };// Handle slash commands


    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setUserInput(value);
        if (activeCommand?.category && activeCommand.tool) {

            const toolToFind = activeCommand.tool;

            let mcpStateData = tools.find((tool: any) =>
                tool?.tool_name.toLowerCase() === toolToFind.toLowerCase()
            );

            console.log("FOUND: mcpStateData for toolName=", toolToFind, mcpStateData);      // If the tool name is changing, update the prevToolName state

            // Update the command description with the current input
            setActiveCommand({
                ...activeCommand,
                description: `
======================
Summary Specification 
======================
${mcpStateData?.specification_summary || ''}

======================
Additional Details
======================
${Object.entries(mcpStateData || {})
                        .filter(([key]) => key !== 'specification_summary')
                        .map(([key, value]) => `**${key}:** ${value}`)
                        .join('\n')}

Command: **${activeCommand.category}** the tool
Tool Name: **${activeCommand.tool.toLowerCase()}** - "${value}"
                `
            });



        }

        if (activeCommand?.category === "create") {
            setActiveCommand({
                ...activeCommand,
                description: `Command: **${activeCommand.category}** a tool for this query - '${value}'`
            });
        }

        // Check if the user just typed a "/" at the beginning of the input or as a new command
        if (value === '/' || (value.length > 0 && value.trim().endsWith(' /') && value.trim() !== ' /')) {
            setShowCommandPopover(true);
        } else {
            setShowCommandPopover(false);
        }

        if (value.length === 0) {
            setActiveCommand(null);
            setSelectedTool(null);
            setShowCommandPopover(false);
            setSelectedCategory(null);
            setShowToolsPopover(false);
            setSelectedTool(null);
        }
    };




    // Handle tool selection
    const handleToolSelect = (tool: string) => {
        setShowToolsPopover(false);
        setSelectedTool(tool);

        // Create description based on category and tool
        const description = `**${selectedCategory}** the '${tool.toLowerCase()}' tool`;

        // Create and store the active command
        setActiveCommand({
            category: selectedCategory || '',
            tool: tool,
            description: description
        });

        // Track the tool name change for state management

        // Clear the slash from input and set empty input
        // The command tag will be displayed separately
        if (userInput === '/' || userInput.trim().endsWith(' /')) {
            setUserInput('');
        }

        // Reset category state
        setSelectedCategory(null);

        // Focus the input field
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };


    // Function to determine available tools based on category
    const getToolsForCategory = (category: string | null): string[] => {
        let listAllToolsNames = tools.map((tool: any) => tool.tool_name);
        switch (category) {
            case 'update':
                return listAllToolsNames;
            case 'delete':
                return listAllToolsNames;
            default:
                return [];
        }
    };





    return (
        <div className='flex flex-col flex-grow justify-between w-full'>
            <div>
                <div className='flex-grow flex w-full'>
                    <div className="relative flex items-center flex-grow">
                        {/* Slash Command Button */}
                        <Popover open={showCommandPopover} onOpenChange={setShowCommandPopover}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-[50px] w-12 mr-2 mb-1 flex-shrink-0"
                                    onClick={(val: any) => {
                                        setShowCommandPopover(true);
                                        setUserInput('/');
                                        inputRef.current?.focus();
                                    }}
                                    style={{
                                        backgroundColor: 'var(--nebula-muted)',
                                        color: 'var(--nebula-primary)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--nebula-border)',
                                    }}
                                >
                                    <Slash className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-64"
                                style={{
                                    backgroundColor: 'var(--nebula-bg-lighter)',
                                    border: '1px solid var(--nebula-border)',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                                }}
                                sideOffset={10}
                                align="start"
                            >
                                <div className="flex flex-col space-y-1 p-1">
                                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--nebula-text-muted)' }}>Select a Command</p>
                                    <Button
                                        variant="ghost"
                                        className="flex items-center justify-start text-sm hover:bg-[color:var(--nebula-primary-opacity-10)]"
                                        onClick={() => handleCommandSelect('create')}
                                        style={{ color: 'var(--nebula-text)' }}
                                    >
                                        <Plus className="h-4 w-4 mr-2" style={{ color: 'var(--nebula-primary-strong)' }} /> Create
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="flex items-center justify-start text-sm hover:bg-[color:var(--nebula-primary-opacity-10)]"
                                        onClick={() => handleCommandSelect('update')}
                                        style={{ color: 'var(--nebula-text)' }}
                                    >
                                        <Pencil className="h-4 w-4 mr-2" style={{ color: 'var(--nebula-primary-strong)' }} /> Update
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="flex items-center justify-start text-sm hover:bg-[color:var(--nebula-primary-opacity-10)]"
                                        onClick={() => handleCommandSelect('delete')}
                                        style={{ color: 'var(--nebula-text)' }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" style={{ color: 'var(--nebula-primary-strong)' }} /> Delete
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Tools Popover - shows after category selection */}
                        <Popover
                            open={showToolsPopover}
                            onOpenChange={(open) => {
                                setShowToolsPopover(open);
                                // If the tools popover is closed and we had update/delete category selected,
                                // reset the active command and related states since these categories require tool selection
                                if (!open && (selectedCategory === 'update' || selectedCategory === 'delete')) {
                                    setActiveCommand(null);
                                    setSelectedCategory(null);
                                    setSelectedTool(null);
                                }
                            }}
                        >
                            <PopoverTrigger asChild>
                                <div style={{ display: 'none' }}>{/* Hidden trigger */}</div>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-fit ml-10"
                                style={{
                                    backgroundColor: 'var(--nebula-bg-lighter)',
                                    border: '1px solid var(--nebula-border)',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                                }}
                                sideOffset={530}
                                align="start"
                            >
                                <div className="flex flex-col space-y-1 p-1">
                                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--nebula-text-muted)' }}>
                                        {selectedCategory === 'update' && 'Update Existing Tools'}
                                        {selectedCategory === 'delete' && 'Delete Existing Tools'}
                                    </p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {getToolsForCategory(selectedCategory).map((tool) => (
                                            <Button
                                                key={tool}
                                                variant="ghost"
                                                className="flex items-center justify-start text-white hover:text-white hover:bg-[color:var(--nebula-primary-opacity-10)]"
                                                onClick={() => handleToolSelect(tool)}
                                            // style={{ color: 'var(--nebula-text)' }}
                                            >
                                                <Command className="h-4 w-4 mr-2" style={{ color: 'var(--nebula-primary)' }} /> {tool}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Input field */}
                        <div className="flex-grow relative">
                            {activeCommand && (
                                <div className="absolute left-2 top-2 z-10 flex items-center">
                                    <div
                                        className="px-2 py-1 rounded-md flex items-center mr-1 gap-1"
                                        style={{
                                            backgroundColor:
                                                activeCommand.category === 'update' ? 'rgba(245, 158, 11, 0.85)' :
                                                    activeCommand.category === 'create' ? 'rgba(16, 185, 151, 0.85)' :
                                                        activeCommand.category === 'delete' ? 'rgba(239, 68, 68, 0.85)' :
                                                            'rgba(16, 185, 151, 0.85)',
                                            color: 'white',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            border:
                                                activeCommand.category === 'update' ? '1px solid #F59E0B' :
                                                    activeCommand.category === 'create' ? '1px solid #10b981' :
                                                        activeCommand.category === 'delete' ? '1px solid #EF4444' :
                                                            '1px solid #10b981',
                                        }}
                                    >
                                        <span className="text-xs font-medium whitespace-nowrap">
                                            {activeCommand.category}
                                            {activeCommand.tool ? `: ${activeCommand.tool}` : ''}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <textarea
                                ref={inputRef}
                                value={userInput}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={activeCommand ? "Type your message..." : "Type / for commands or enter a message..."}
                                className="w-full resize-none rounded-md"
                                rows={Math.min(4, Math.max(1, userInput.split('\n').length))}
                                style={{
                                    backgroundColor: 'var(--nebula-muted)',
                                    color: 'var(--nebula-text)',
                                    border: '1px solid var(--nebula-border)',
                                    outline: 'none',
                                    minHeight: '48px',
                                    maxHeight: '120px',
                                    transition: 'height 0.2s ease',
                                    paddingTop: activeCommand ? '2.5rem' : '0.75rem',
                                    paddingRight: '0.75rem',
                                    paddingBottom: '0.75rem',
                                    paddingLeft: '0.75rem'
                                }}
                            />
                        </div>
                    </div>
                    <Button
                        size="icon"
                        className="h-12 w-12 ml-2 flex-shrink-0"
                        onClick={handleSendMessage}
                        disabled={!userInput.trim() || isLoading}
                        style={{
                            backgroundColor: userInput.trim() && !isLoading ? 'var(--nebula-primary-strong)' : 'var(--nebula-muted)',
                            color: userInput.trim() && !isLoading ? 'var(--nebula-bg)' : 'var(--nebula-text-muted)',
                            borderRadius: '0.5rem',
                            transition: 'all 0.3s ease',
                            border: 'none',
                            boxShadow: 'none'
                        }}
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <SendHorizontal className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            <div className="text-xs mx-auto text-right mt-1 opacity-70" style={{ color: 'var(--nebula-text-muted)' }}>
                Press Enter to send. Shift+Enter for new line.
            </div>
        </div>
    )
}

export default ChatInterface
