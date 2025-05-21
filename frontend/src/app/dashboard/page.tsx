"use client";

import { supabase } from "@/utils/supabase/supabase";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusCircle, Server, Search, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast, Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import axios from "axios";

// Client-side component for UI interactions
export default function DashboardClient() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [serverName, setServerName] = useState("");
    const [serverDescription, setServerDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [servers, setServers] = useState<any>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();



    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            console.log('Session:', user);

            if (!user) {
                // If not authenticated, redirect to login page
                redirect("/login");
            } else {
                // Load user's servers
                fetchServers(user.id);
            }
        }
        checkUser();
    }, []);

    const fetchServers = async (userId: any) => {
        try {
            const { data, error } = await supabase
            .from('mcp_server')
            .select('*')
            .eq('user_id', userId);

            if (error) {
            console.error('Error fetching servers:', error);
            toast.error('Failed to load servers');
            } else {
            // Map Supabase data to match the expected server format
            const formattedData = (data || []).map(server => ({
                id: server.server_id,
                name: server.server_name,
                description: server.server_description,
                created_at: server.created_at,
                session_id: server.session_id
            }));
            
            // Combine dummy servers with the actual data
            const combinedServers = [...formattedData];
            setServers(combinedServers);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateServer = async () => {
        if (!serverName.trim()) {
            toast.error("Server name is required");
            return;
        }

        try {
            setIsSaving(true);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                throw new Error("You must be logged in to create a server");
            }

            // Create server in database
            const { data: serverData, error: serverError } = await supabase
                .from('mcp_server')
                .insert({
                    server_name: serverName,
                    server_description: serverDescription,
                    user_id: user.id
                })
                .select('server_id')
                .single();

            if (serverError) throw new Error('Failed to create server');
            
            const createdServerId = serverData.server_id;

            // Create a session via API
            const sessionResponse = await axios.post(
                `http://localhost:8000/apps/manager/users/${user.id}/sessions`,
                {},
                {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (sessionResponse.status !== 200) throw new Error('Failed to create session');

            console.log(sessionResponse)
            
            const { id: sessionId } = sessionResponse.data;

            // if (!sessionResponse.ok) throw new Error('Failed to create session');
            

            // Update server with session ID
            await supabase
                .from('mcp_server')
                .update({ session_id: sessionId })
                .eq('server_id', createdServerId)
                .then(({ error }) => {
                    if (error) console.error('Error updating session ID:', error);
                });

            toast.success(`Server "${serverName}" created successfully`);
            setIsDialogOpen(false);
            setServerName("");
            setServerDescription("");
            
            // Redirect to builder
            router.push(`/builder/${createdServerId}&session_id=${sessionId}`);
            
        } catch (error) {
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-screen dashboard-section">
            {/* Add Navbar */}
            <Navbar />

            <section id="dashboard" className="flex-1 overflow-auto relative z-10">
                <div className="container mx-auto px-6 py-12">
                    {/* <div className="mb-4">
                        <p className="text-sm text-gray-400 font-light">
                            Welcome back, <span className="font-medium text-nebula-primary" style={{fontFamily: 'var(--font-mono)'}}>Username</span>! Ready to continue building?
                        </p>
                    </div> */}

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                        <h1 className="text-4xl font-bold tracking-tight nebula-gradient">My <span className="text-nebula-accent">Servers</span></h1>

                        <div className="flex w-full items-center text-center justify-center md:w-auto gap-4">
                            {/* Search bar */}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-nebula-text-muted" />
                                <Input
                                    placeholder="Search servers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-nebula-muted border-nebula-border"
                                />
                            </div>

                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="flex items-center gap-2 whitespace-nowrap btn-primary"
                            >
                                <PlusCircle size={18} />
                                Create Server
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 className="h-12 w-12 animate-spin text-nebula-primary mb-4" />
                            <p className="text-nebula-text-muted">Loading your servers...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {servers
                                    .filter((server:any) =>
                                        searchQuery === "" ||
                                        server.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((server: any) => (
                                        <Link href={`/builder/${server.id}&session_id=${server.session_id}`} key={server.id}>
                                            <Card className="card  transition-all duration-300 h-[200px] flex flex-col justify-between"
                                                style={{
                                                    background: "linear-gradient(145deg, var(--nebula-bg-lighter) 0%, var(--nebula-card-bg) 100%)",
                                                    borderColor: "var(--nebula-border)",
                                                    position: "relative",
                                                    overflow: "hidden"
                                                }}>
                                                <div className="flex flex-col h-full relative z-10">
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <div className="server-icon">
                                                            <Server className="h-5 w-5" />
                                                        </div>
                                                        <h2 className="text-xl font-semibold line-clamp-2 overflow-hidden">{server.name}</h2>
                                                    </div>
                                                    <div className="text-sm text-nebula-text-muted flex-grow overflow-hidden">
                                                        <p className="line-clamp-2">{server.description || "No description provided."}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-auto pt-2 text-nebula-text-muted text-sm relative z-10 border-t-[1px]"
                                                    style={{
                                                        borderColor: "var(--nebula-border)",
                                                    }}>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        <span suppressHydrationWarning={true}>
                                                            {new Date(server.created_at).toLocaleDateString('en-GB', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-nebula-primary">
                                                        <span>Open</span>
                                                        <ExternalLink className="h-3 w-3" />
                                                    </div>
                                                </div>
                                                <div className="absolute top-0 right-0 w-20 h-20 opacity-5 rounded-full blur-2xl bg-nebula-primary-strong"></div>
                                            </Card>
                                        </Link>
                                    ))}
                            </div>

                            {servers.length === 0 && (
                                <div className="text-center py-24 rounded-lg border border-dashed w-full flex flex-col justify-center" style={{
                                    backgroundColor: 'var(--nebula-card-bg)',
                                    borderColor: 'var(--nebula-card-border)'
                                }}>
                                    <div className="server-icon mx-auto mb-6 w-16 h-16 flex items-center justify-center">
                                        <Server className="h-8 w-8" />
                                    </div>
                                    <h2 className="text-2xl font-semibold mb-3">No servers found</h2>
                                    <p className="text-nebula-text-muted mb-8 max-w-md mx-auto">Create your first server to start building your API workflow</p>
                                    <Button onClick={() => setIsDialogOpen(true)} className="btn-primary w-fit justify-center mx-auto flex items-center gap-2">
                                        <PlusCircle size={18} />
                                        Create Server
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>            
            <Dialog open={isDialogOpen} onOpenChange={(open) => !isSaving && setIsDialogOpen(open)}>
                <DialogContent className="sm:max-w-[500px]" style={{
                    backgroundColor: 'var(--nebula-bg-lighter)',
                    borderColor: 'var(--nebula-card-border)',
                    border: '1px solid var(--nebula-card-border)',
                    borderRadius: '8px',
                    color: 'var(--nebula-text)'
                }}>
                    <DialogHeader className="pb-4" style={{
                        borderBottom: '1px solid var(--nebula-card-border)'
                    }}>
                        <DialogTitle className="text-xl" style={{
                            color: 'var(--nebula-primary-strong)',
                            fontFamily: 'var(--nebula-font)',
                            fontWeight: 600
                        }}>Create New Server</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" style={{ color: 'var(--nebula-text-muted)' }}>Server Name</Label>
                            <Input
                                id="name"
                                value={serverName}
                                onChange={(e) => setServerName(e.target.value)}
                                placeholder="Enter server name"
                                className="w-full"
                                disabled={isSaving}
                                style={{
                                    backgroundColor: 'var(--nebula-muted)',
                                    border: '1px solid var(--nebula-border)',
                                    color: 'var(--nebula-text)'
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" style={{ color: 'var(--nebula-text-muted)' }}>Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={serverDescription}
                                onChange={(e) => setServerDescription(e.target.value)}
                                placeholder="Describe your server"
                                rows={3}
                                className="w-full"
                                disabled={isSaving}
                                style={{
                                    backgroundColor: 'var(--nebula-muted)',
                                    border: '1px solid var(--nebula-border)',
                                    color: 'var(--nebula-text)'
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isSaving}
                            style={{
                                backgroundColor: 'transparent',
                                border: '1px solid var(--nebula-border)',
                                color: 'var(--nebula-text)'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateServer}
                            className="btn-primary"
                            disabled={isSaving}
                            style={{
                                backgroundColor: 'var(--nebula-primary-strong)',
                                color: 'var(--nebula-bg)',
                                fontWeight: 600
                            }}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Server'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Toaster component for sonner toast notifications */}
            <Toaster position="top-center" />
        </div>
    );
}
