'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Files, Cloud, Github, Code, FileJson, Info } from "lucide-react";
import { supabase } from "@/utils/supabase/supabase";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";

interface ServerData {
  name: string;
  description: string;
}

interface Parameter {
  input_name: string;
  input_type: string;
  is_required: boolean;
  input_description: string;
}

interface EnvironmentVariable {
  env_name: string;
  is_required: boolean;
  env_description: string;
}

interface DeploymentHistory {
  deployment_id: string;
  deployment_url: string;
  deployment_state: 'success' | 'error' | 'in_progress';
  deployed_at: string;
  error_message?: string;
  tempdir?: any;
  log?: any;
}

interface McpTool {
  name: string;
  description: string;
  implementation: string;
  details: {
    version: string;
    parameters: Parameter[];
    environmentVars: EnvironmentVariable[];
  };
}

export function MainContent({ session_id, server_id, user_id }: any) {
  const [activeTab, setActiveTab] = useState<'tools' | 'files' | 'deployment'>('tools');
  const [serverData, setServerData] = useState<ServerData>({
    name: "Loading...",
    description: "Fetching server information..."
  });
  const [expandedToolCode, setExpandedToolCode] = useState<number | null>(null);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'creating' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentMessage, setDeploymentMessage] = useState<string>('');
  const [deploymentUrl, setDeploymentUrl] = useState<string>('');
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistory[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({
    "index.ts": "",
    "package.json": "",
    "wrangler.jsonc": ""
  });
  const [envValues, setEnvValues] = useState<Record<string, Record<string, string>>>({});
  const [envShowStates, setEnvShowStates] = useState<Record<string, boolean[]>>({});

  // Generate unique ID for this deployment
  const deploymentId = `deploy-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  // Validate if all required environment variables are set
  const validateEnvironmentVars = () => {
    let missingVars: { toolName: string, envName: string }[] = [];

    mcpTools.forEach(tool => {
      tool.details.environmentVars.forEach(env => {
        if (env.is_required && (!envValues[tool.name] || !envValues[tool.name][env.env_name])) {
          missingVars.push({ toolName: tool.name, envName: env.env_name });
        }
      });
    });

    if (missingVars.length > 0) {
      const message = `Missing required environment variables: ${missingVars.map(v => `${v.toolName}.${v.envName}`).join(", ")}`;
      toast.error(message);
      return false;
    }

    return true;
  };

  // Helper function to generate MCP server configuration based on the tool name
  const generateMcpConfig = (toolName: string) => {
    // Convert the tool name to lowercase and replace spaces with hyphens
    const formattedName = serverData.name.toLowerCase().replace(/\s+/g, '-');

    return `{
  "mcpServers": {
    "${formattedName}": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "${deploymentHistory[0]?.deployment_url}/sse"
      ]
    }
  }
}`;
  };
  // Listen for real-time updates
  useEffect(() => {
    const serverChannel = supabase.channel("mcp_server realtime").on('postgres_changes', {
      event: "*",
      schema: "public",
      table: "mcp_server",
    }, (payload) => {
      let data = payload?.new;
      console.log('Server change received!', payload);
      if (data) {
        if ('state' in data) {
          displayTools(data);
          setFileContents({
            "index.ts": data.state[0]?.index_ts_content?.replace("```typescript", '').replace("```", '') || '',
            "package.json": data.state[0]?.package_json_content?.replace("```json", '').replace("```", '') || '',
            "wrangler.jsonc": data.state[0]?.wrangler_json_content?.replace("```json", '').replace("```", '') || ''
          });
        }

        // Update environment variables if they've changed
        if ('env_json' in data && data.env_json) {
          setEnvValues(data.env_json);
        }
      }

    }).subscribe();

    // Listen for deployment_status real-time updates
    const deploymentChannel = supabase.channel("deployment_status realtime").on('postgres_changes', {
      event: "*",
      schema: "public",
      table: "deployment_status",
      filter: `server_id=eq.${server_id}`
    }, (payload) => {
      console.log('Deployment status change received!', payload);
      // When a deployment status change is detected, refresh the deployment history
      fetchDeploymentHistory();
    }).subscribe();

    return () => {
      supabase.removeChannel(serverChannel);
      supabase.removeChannel(deploymentChannel);
    };
  }, [supabase, server_id]);
  // Define fetchDeploymentHistory function at component level
  const fetchDeploymentHistory = async () => {
    try {
      if (!server_id) return;

      // First try to get data from the new deployment_status table
      const { data: statusData, error: statusError } = await supabase
        .from('deployment_status')
        .select('*')
        .eq('server_id', server_id)
        .order('createdat ', { ascending: false });

      if (statusError) {
        console.error('Error fetching from deployment_status table:', statusError);
      }

      if (statusData && statusData.length > 0) {
        // Transform data to match DeploymentHistory interface
        const historyData: DeploymentHistory[] = statusData.map(item => ({
          deployment_id: item.id,
          deployment_url: item.url,
          deployment_state: item.status === 'complete' ? 'success' : (item.status === 'error' ? 'error' : 'in_progress'),
          deployed_at: item.createdat,
          error_message: item.error,
          tempdir: item.tempdir,
          log: item.log
        }));

        setDeploymentHistory(historyData);
        console.log('Deployment history loaded from deployment_status:', historyData);

        return;
      }

    } catch (err) {
      console.error('Error in fetchDeploymentHistory:', err);
    }
  };

  // Fetch deployment history when component mounts
  useEffect(() => {
    if (server_id) {
      fetchDeploymentHistory();
    }
  }, [server_id]);

  useEffect(() => {
    if (deploymentStatus === 'success' && deploymentUrl) {
      console.log('Successful deployment:', {
        url: deploymentUrl,
        timestamp: new Date().toISOString(),
      });
      // Store deployment status and URL
      const updateDeploymentStatus = async () => {
        try {
          const deploymentTime = new Date().toISOString();
          // const deploymentId = `deploy-${Date.now()}`;

          // Save to both tables for backward compatibility
          // 1. Insert into the new deployment_status table
          const { data: statusData, error: statusError } = await supabase
            .from('deployment_status')
            .upsert({
              id: deploymentId,
              status: 'complete',
              url: deploymentUrl,
              message: 'Deployment successful',
              createdat: deploymentTime,
              server_id: server_id
            })
            .select();

          if (statusError) {
            console.error('Error inserting into deployment_status:', statusError);
          } else {
            console.log('Deployment saved to deployment_status table:', statusData);
          }

        } catch (err) {
          console.error('Error in updateDeploymentStatus:', err);
        }
      };

      updateDeploymentStatus();
    }
  }, [deploymentStatus, deploymentUrl, session_id, server_id, supabase]);

  useEffect(() => {
    const checkUserAndFetchServer = async () => {
      try {
        // Fetch server data from the mcp_server table based on user_id
        const { data: serverData, error } = await supabase
          .from('mcp_server')
          .select('server_name, server_description, state, env_json')
          .eq('session_id', session_id)
          .eq('server_id', server_id)

        if (error) {
          console.error('Error fetching server data:', error);
          return;
        }

        console.log('Server data:', serverData);

        if (serverData && serverData.length > 0) {
          const server = serverData[0];
          setServerData({
            name: server.server_name,
            description: server.server_description
          });

          // Load environment variables if available
          if (server.env_json) {
            setEnvValues(server.env_json);
          }

          if (server.state) {
            displayTools(server);
          }
        }
      } catch (error) {
        console.error('Error in checkUserAndFetchServer:', error);
      }
    };
    checkUserAndFetchServer();
  }, []);

  const displayTools = (server: any) => {
    try {
      const stateData = server.state;

      if (Array.isArray(stateData) && stateData.length > 0) {
        const toolData = stateData.map((item: any) => {
          // Check if it's a tool by looking for tool_name
          if (item.tool_name) {
            // Process parameters and environment variables properly
            const parameters = item.specification_json?.input_parameters || [];
            const environmentVars = item.specification_json?.environment_variables || [];

            return {
              name: item.tool_name,
              description: item.tool_description || 'No description available',
              implementation: item.tool_implementation?.tools[0]?.code || '',
              details: {
                version: item.specification_json?.version || '1.0',
                parameters: parameters,
                environmentVars: environmentVars,
              }
            };
          }
          return null;
        }).filter((tool): tool is McpTool => tool !== null);

        setMcpTools(toolData);
        console.log('Processed tool data:', toolData);
      }
    } catch (e) {
      console.error('Error parsing server state JSON:', e);
    }
  }

  // Helper function to determine language for Monaco Editor
  const getLanguageForFile = (filename: string): string => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.json') || filename.endsWith('.jsonc')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    return 'plaintext';
  };

  // Function to update wrangler.jsonc with environment variables
  const updateWranglerWithEnvVars = (wranglerContent: string, envVars: Record<string, Record<string, string>>) => {
    try {
      // Parse the wrangler.jsonc content
      const wranglerJson = JSON.parse(wranglerContent);

      // Create a flattened structure of all environment variables from all tools
      const flattenedVars: Record<string, string> = {};

      // Iterate through all tools and their environment variables
      Object.entries(envVars).forEach(([toolName, vars]) => {
        Object.entries(vars).forEach(([varName, varValue]) => {
          // Use the environment variable name as the key
          flattenedVars[varName] = varValue;
        });
      });

      // Update the vars section in wrangler.jsonc
      wranglerJson.vars = flattenedVars;

      // Convert back to JSON string with proper formatting
      return JSON.stringify(wranglerJson, null, 2);
    } catch (error) {
      console.error('Error updating wrangler.jsonc with env vars:', error);
      return wranglerContent; // Return original content if there was an error
    }
  };

  // Handle environment variable change
  const handleEnvChange = async (toolName: string, envName: string, value: string) => {
    // Update the local state
    setEnvValues(prev => ({
      ...prev,
      [toolName]: {
        ...(prev[toolName] || {}),
        [envName]: value
      }
    }));

    try {
      // Prepare the data for storage
      const envJson = {
        ...envValues,
        [toolName]: {
          ...(envValues[toolName] || {}),
          [envName]: value
        }
      };

      // Save to database
      const { error } = await supabase
        .from('mcp_server')
        .update({ env_json: envJson })
        .eq('server_id', server_id)
        .eq('session_id', session_id);

      if (error) {
        console.error('Error saving environment variables:', error);
        toast.error('Failed to save environment variable');
      } else {
        console.log('Environment variables saved successfully');
        toast.success('Environment variable saved');
      }
    } catch (err) {
      console.error('Error in handleEnvChange:', err);
      toast.error('An error occurred while saving');
    }
  };
  const handleDeploy = async () => {
    // Validate environment variables before deployment
    if (!validateEnvironmentVars()) {
      return;
    }

    try {
      setIsDeploying(true);
      setDeploymentStatus('creating');
      setDeploymentMessage('Preparing deployment...');
      console.log("before sending to direct-deploy - DeploymentID: ", deploymentId);

      // Update wrangler.jsonc with environment variables
      let updatedWranglerContent = fileContents["wrangler.jsonc"];
      try {
        // Parse the wrangler.jsonc content
        const wranglerJson = JSON.parse(updatedWranglerContent);

        // Create a flattened structure of all environment variables from all tools
        const flattenedVars: Record<string, string> = {};

        // Iterate through all tools and their environment variables
        Object.entries(envValues).forEach(([toolName, vars]) => {
          Object.entries(vars).forEach(([varName, varValue]) => {
            // Use the environment variable name as the key
            flattenedVars[varName] = varValue;
          });
        });

        // Update the vars section in wrangler.jsonc
        wranglerJson.vars = flattenedVars;

        // Convert back to JSON string with proper formatting
        updatedWranglerContent = JSON.stringify(wranglerJson, null, 2);
        console.log('Updated wrangler.jsonc with environment variables');
      } catch (error) {
        console.error('Error updating wrangler.jsonc with env vars:', error);
        // Continue with original content if there was an error
      }

      console.log({
        'index.ts': fileContents["index.ts"],
        'package.json': fileContents["package.json"],
        'wrangler.jsonc': updatedWranglerContent
          .replace('"main": "index.ts"', '"main": "src/index.ts"')
      })

      const deployResponse = await fetch('/api/deployment/direct-deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }, body: JSON.stringify({
          files: {
            'index.ts': fileContents["index.ts"],
            'package.json': fileContents["package.json"],
            'wrangler.jsonc': updatedWranglerContent
              .replace('"main": "index.ts"', '"main": "src/index.ts"')
          },
          server_id: server_id,
          deploymentId: deploymentId,
          environmentVariables: envValues
        }),
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json();
        throw new Error(`Deployment request failed: ${errorData.error || 'Unknown error'}`);
      }

      setDeploymentStatus('deploying');
      setDeploymentMessage('Deploying to Cloudflare...');

      // const deploymentId = (await deployResponse.json()).deploymentId;

      console.log("DeploymentID: ", deploymentId)

      const pollDeployment = async () => {
        try {
          const statusResponse = await fetch(`/api/deployment/status/${deploymentId}`);
          if (!statusResponse.ok) {
            throw new Error('Failed to retrieve deployment status');
          }

          const statusData = await statusResponse.json();

          console.log("Status Data: ", statusData)

          if (statusData.status === 'complete') {
            setDeploymentStatus('success');
            setDeploymentMessage('Deployment successful!');
            setDeploymentUrl(statusData.url || '');
            setIsDeploying(false);
            return;
          } else if (statusData.status === 'error') {
            setDeploymentStatus('error');
            setDeploymentMessage(`Deployment failed: ${statusData.error || 'Unknown error'}`);
            setIsDeploying(false);
            return;
          } else {
            setDeploymentMessage(statusData.message || 'Deployment in progress...');
            setTimeout(pollDeployment, 3000);
          }
        } catch (error) {
          console.error('Error polling deployment status:', error);
          setDeploymentStatus('error');
          const errorMessage = `Failed to get deployment status: ${error instanceof Error ? error.message : String(error)}`;
          setDeploymentMessage(errorMessage);
          setIsDeploying(false);
        }
      };

      setTimeout(pollDeployment, 3000);
    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentStatus('error');
      const errorMessage = `An error occurred during deployment: ${error instanceof Error ? error.message : String(error)}`;
      setDeploymentMessage(errorMessage);
      setIsDeploying(false);
    }
  };

  return (
    <div className="h-full p-4">
      <Card className="h-full card">
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--nebula-primary-strong)' }}>{serverData.name}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--nebula-text-muted)' }}>{serverData.description}</p>
          </div>
          <button
            className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            style={{
              backgroundColor: 'var(--nebula-primary-strong)',
              color: 'white',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              setActiveTab('deployment');
              setTimeout(() => handleDeploy(), 100);
            }}
          >
            <Cloud className="h-4 w-4" />
            <span>Deploy</span>
          </button>
        </div>

        <Tabs
          defaultValue="tools"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'tools' | 'files' | 'deployment')}
          className="h-full flex flex-col"
        >
          <div className="px-4 pt-4" style={{ borderBottom: '1px solid var(--nebula-border)' }}>
            <TabsList className="grid w-[400px] grid-cols-3" style={{ backgroundColor: 'var(--nebula-muted)' }}>
              <TabsTrigger value="tools" className="flex items-center gap-2 data-[state=active]:bg-[var(--nebula-card-bg)] data-[state=active]:text-[var(--nebula-primary-strong)]" style={{
                color: 'var(--nebula-text)'
              }}>
                <Settings className="h-4 w-4" />
                <span>Tools</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2 data-[state=active]:bg-[var(--nebula-card-bg)] data-[state=active]:text-[var(--nebula-primary-strong)]" style={{
                color: 'var(--nebula-text)'
              }}>
                <Files className="h-4 w-4" />
                <span>Files</span>
              </TabsTrigger>
              <TabsTrigger value="deployment" className="flex items-center gap-2 data-[state=active]:bg-[var(--nebula-card-bg)] data-[state=active]:text-[var(--nebula-primary-strong)]" style={{
                color: 'var(--nebula-text)'
              }}>
                <Cloud className="h-4 w-4" />
                <span>Deployment</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="flex-grow overflow-auto p-6">
            <TabsContent value="tools" className="h-full mt-0 border-0 p-0">
              <div className="h-full rounded-md p-4" style={{
                border: '1px solid var(--nebula-border)',
                backgroundColor: 'var(--nebula-card-bg)'
              }}>

                <div className="mt-4 space-y-6">
                  <section>
                    <div className="grid grid-cols-1 gap-6">
                      {mcpTools.length > 0 ? mcpTools.map((tool, index) => {
                        // Initialize show/hide state for this tool if not already set
                        if (!envShowStates[tool.name] || envShowStates[tool.name].length !== tool.details.environmentVars.length) {
                          setEnvShowStates(prev => ({
                            ...prev,
                            [tool.name]: tool.details.environmentVars.map(() => false)
                          }));
                        }
                        return (
                          <div key={index} className="rounded-md overflow-hidden" style={{
                            border: '1px solid var(--nebula-card-border)',
                            backgroundColor: 'var(--nebula-bg-lighter)'
                          }}>
                            <div className="flex flex-col">
                              <div className="flex justify-between items-start p-4">
                                <div className="flex-1">
                                  <h5 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-primary-strong)' }}>
                                    <Info className="h-4 w-4" />
                                    {tool.name}
                                  </h5>
                                  <p className="mt-1 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                                    {tool.description}
                                  </p>
                                </div>
                                <button
                                  className="px-3 py-1 text-xs rounded flex items-center gap-1"
                                  style={{
                                    backgroundColor: expandedToolCode === index ? 'var(--nebula-primary-strong)' : 'var(--nebula-bg)',
                                    color: expandedToolCode === index ? 'white' : 'var(--nebula-text-muted)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onClick={() => setExpandedToolCode(expandedToolCode === index ? null : index)}
                                >
                                  <Code className="h-3 w-3" />
                                  {expandedToolCode === index ? 'Hide Code' : 'View Code'}
                                </button>
                              </div>
                              {expandedToolCode === index && (
                                <div className="p-4 max-h-64 overflow-auto bg-gray-900 text-gray-100 text-xs"
                                  style={{ transition: 'all 0.3s ease' }}>
                                  <pre className="font-mono">{tool.implementation}</pre>
                                </div>
                              )}
                              <div className="p-4 border-t border-gray-200">
                                <div className="mb-3">
                                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--nebula-text)' }}>Parameters</div>
                                  <div className="flex flex-wrap gap-1">
                                    {tool.details.parameters.map((param, idx) => (
                                      <div key={idx} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--nebula-bg)', color: 'var(--nebula-text-muted)' }}>
                                        {param.input_name} ({param.input_type})
                                        {param.is_required && <span className="ml-1 font-bold text-red-400">*</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-medium" style={{ color: 'var(--nebula-text)' }}>Environment Variables</div>
                                    <div className="text-xs italic" style={{ color: 'var(--nebula-text-muted)' }}>
                                      Saved to wrangler.jsonc vars
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {tool.details.environmentVars.length > 0 ? (
                                      tool.details.environmentVars.map((env, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <div className="flex-shrink-0 text-xs font-medium" style={{ color: 'var(--nebula-text-muted)' }}>
                                            {env.env_name}
                                            {env.is_required && <span className="ml-1 font-bold text-red-400">*</span>}:
                                          </div>
                                          <input
                                            type={envShowStates[tool.name]?.[idx] ? "text" : "password"}
                                            className="flex-grow px-2 py-1 rounded text-xs"
                                            style={{
                                              backgroundColor: 'var(--nebula-bg)',
                                              color: 'var(--nebula-text)',
                                              border: '1px solid var(--nebula-border)'
                                            }}
                                            placeholder={env.env_description || `Enter value for ${env.env_name}`}
                                            value={envValues[tool.name]?.[env.env_name] || ''}
                                            onChange={(e) => handleEnvChange(tool.name, env.env_name, e.target.value)}
                                          />
                                          <button
                                            type="button"
                                            className="ml-1 p-1 rounded hover:bg-[var(--nebula-muted)]"
                                            style={{ color: 'var(--nebula-text-muted)' }}
                                            tabIndex={-1}
                                            onClick={() => {
                                              setEnvShowStates(prev => {
                                                const arr = prev[tool.name] ? [...prev[tool.name]] : tool.details.environmentVars.map(() => false);
                                                arr[idx] = !arr[idx];
                                                return { ...prev, [tool.name]: arr };
                                              });
                                            }}
                                          >
                                            {envShowStates[tool.name]?.[idx] ? (
                                              // Eye-off icon
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575M6.343 6.343A7.963 7.963 0 004 12c0 4.418 3.582 8 8 8 1.657 0 3.22-.403 4.575-1.125M17.657 17.657A7.963 7.963 0 0020 12c0-4.418-3.582-8-8-8-1.657 0-3.22.403-4.575 1.125M3 3l18 18" /></svg>
                                            ) : (
                                              // Eye icon
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                          </button>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-xs italic" style={{ color: 'var(--nebula-text-muted)' }}>
                                        No environment variables defined for this tool
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="rounded-md p-4 text-center" style={{
                          border: '1px dashed var(--nebula-card-border)',
                          backgroundColor: 'var(--nebula-bg)',
                          color: 'var(--nebula-text-muted)'
                        }}>
                          <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No MCP tools found. Add a tool to get started.</p>
                          <button className="mt-3 px-3 py-1 rounded-md text-xs" style={{
                            backgroundColor: 'var(--nebula-primary-strong)',
                            color: 'white'
                          }}>Add Tool</button>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="files" className="h-full mt-0 border-0 p-0">
              <div className="h-full rounded-md p-4" style={{
                border: '1px solid var(--nebula-border)',
                backgroundColor: 'var(--nebula-card-bg)'
              }}>
                <h3 className="text-lg font-medium" style={{ color: 'var(--nebula-primary-strong)' }}>Files Panel</h3>
                <p className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                  Manage your project files here.
                </p>

                <div className="mt-4 h-[calc(100%-80px)] flex">
                  <div className="w-1/3 pr-4 border-r border-gray-200 overflow-y-auto" style={{
                    borderColor: 'var(--nebula-border)'
                  }}>
                    <div
                      className={`rounded-md p-2 mb-2 flex items-center cursor-pointer ${selectedFile === 'index.ts' ? 'bg-blue-50' : ''}`}
                      style={{
                        border: '1px solid var(--nebula-card-border)',
                        backgroundColor: selectedFile === 'index.tx'
                          ? 'var(--nebula-primary-soft)'
                          : 'var(--nebula-bg-lighter)',
                        color: 'var(--nebula-text)'
                      }}
                      onClick={() => setSelectedFile('index.ts')}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      <span className="text-sm">index.ts</span>
                    </div>

                    <div
                      className={`rounded-md p-2 mb-2 flex items-center cursor-pointer ${selectedFile === 'package.json' ? 'bg-blue-50' : ''}`}
                      style={{
                        border: '1px solid var(--nebula-card-border)',
                        backgroundColor: selectedFile === 'package.json'
                          ? 'var(--nebula-primary-soft)'
                          : 'var(--nebula-bg-lighter)',
                        color: 'var(--nebula-text)'
                      }}
                      onClick={() => setSelectedFile('package.json')}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      <span className="text-sm">package.json</span>
                    </div>

                    <div
                      className={`rounded-md p-2 mb-2 flex items-center cursor-pointer ${selectedFile === 'wrangler.jsonc' ? 'bg-blue-50' : ''}`}
                      style={{
                        border: '1px solid var(--nebula-card-border)',
                        backgroundColor: selectedFile === 'wrangler.jsonc'
                          ? 'var(--nebula-primary-soft)'
                          : 'var(--nebula-bg-lighter)',
                        color: 'var(--nebula-text)'
                      }}
                      onClick={() => setSelectedFile('wrangler.jsonc')}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      <span className="text-sm">wrangler.jsonc</span>
                    </div>
                  </div>

                  <div className="w-2/3 pl-4 h-full overflow-hidden">
                    {selectedFile ? (
                      <div className="h-full flex flex-col">
                        <div className="p-2 mb-2 bg-gray-100 rounded-t-md flex items-center" style={{
                          backgroundColor: 'var(--nebula-bg)',
                          borderBottom: '1px solid var(--nebula-border)',
                        }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--nebula-text)' }}>{selectedFile}</span>
                        </div>
                        <div
                          className="flex-1 rounded-b-md overflow-hidden"
                          style={{
                            border: '1px solid var(--nebula-border)',
                            color: 'var(--nebula-text)',
                            height: 'calc(100% - 32px)'
                          }}
                        >
                          <Editor
                            height="100%"
                            language={getLanguageForFile(selectedFile)}
                            value={fileContents[selectedFile as keyof typeof fileContents] || ''}
                            options={{
                              readOnly: true,
                              minimap: { enabled: true },
                              scrollBeyondLastLine: false,
                              lineNumbers: 'on',
                              lineNumbersMinChars: 3,
                              scrollbar: {
                                verticalScrollbarSize: 10,
                                horizontalScrollbarSize: 10
                              },
                              fontSize: 12
                            }}
                            theme="vs-dark"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center" style={{
                        backgroundColor: 'var(--nebula-bg-lighter)',
                        border: '1px solid var(--nebula-border)',
                        borderRadius: '0.375rem',
                        color: 'var(--nebula-text-muted)'
                      }}>
                        <p>Select a file to view its content</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="deployment" className="h-auto mt-0 border-0 p-0 mb-5">
              <div className="h-auto rounded-md p-4 mb-5" style={{
                border: '1px solid var(--nebula-border)',
                backgroundColor: 'var(--nebula-card-bg)'
              }}>
                <h3 className="text-lg font-medium" style={{ color: 'var(--nebula-primary-strong)' }}>Deployment Panel</h3>
                <p className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                  Deploy and manage your MCP services.
                </p>
                <div className="mt-4">
                  <div className="rounded-md p-4 mb-4" style={{
                    border: '1px solid var(--nebula-card-border)',
                    backgroundColor: 'var(--nebula-bg-lighter)'
                  }}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium" style={{ color: 'var(--nebula-primary-strong)' }}>Deploy to Cloudflare</h4>
                        <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                          Deploy your MCP server to Cloudflare Workers for global distribution
                        </p>
                      </div>
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${isDeploying ? 'opacity-70 cursor-not-allowed' : ''}`}
                        style={{
                          backgroundColor: isDeploying ? 'var(--nebula-muted)' : 'var(--nebula-primary-strong)',
                          color: 'white',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={handleDeploy}
                        disabled={isDeploying}
                      >
                        {isDeploying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{
                              borderColor: 'white',
                              borderTopColor: 'transparent'
                            }}></div>
                            <span>Deploying...</span>
                          </>
                        ) : (
                          <>
                            <Cloud className="h-4 w-4" />
                            <span>Deploy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {deploymentStatus !== 'idle' && (
                      <div className="rounded-md p-3 mt-3" style={{
                        backgroundColor: 'var(--nebula-bg)',
                        border: `1px solid ${deploymentStatus === 'success' ? 'rgba(124, 236, 76, 0.5)' :
                          deploymentStatus === 'error' ? 'rgba(236, 76, 76, 0.5)' :
                            'var(--nebula-border)'
                          }`
                      }}>
                        <div className="flex items-center gap-2 mb-2">
                          {deploymentStatus === 'creating' || deploymentStatus === 'deploying' ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{
                              borderColor: 'var(--nebula-primary-strong)',
                              borderTopColor: 'transparent'
                            }}></div>
                          ) : deploymentStatus === 'success' ? (
                            <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="white">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="white">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414-1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <span className="text-sm font-medium" style={{ color: 'var(--nebula-text)' }}>
                            {deploymentStatus === 'creating' ? 'Preparing Deployment...' :
                              deploymentStatus === 'deploying' ? 'Deploying to Cloudflare...' :
                                deploymentStatus === 'success' ? 'Deployment Successful' :
                                  'Deployment Failed'}
                          </span>
                        </div>
                        <div className="pl-6 mt-2">
                          <p className="text-xs" style={{ color: 'var(--nebula-text-muted)' }}>{deploymentMessage}</p>
                          {deploymentStatus === 'deploying' && (
                            <div className="mt-2">
                              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 animate-pulse" style={{ width: '100%' }}></div>
                              </div>
                              <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                                This can take 1-2 minutes. Please be patient.
                              </p>
                            </div>
                          )}
                        </div>

                        {deploymentStatus === 'success' && deploymentUrl && (
                          <div className="mt-3 pl-6">
                            <p className="text-xs mb-1" style={{ color: 'var(--nebula-text)' }}>Your MCP server is now live at:</p>
                            <a
                              href={deploymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm flex items-center gap-1"
                              style={{ color: 'var(--nebula-primary-strong)' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                              </svg>
                              {deploymentUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="rounded-md p-4" style={{
                    border: '1px solid var(--nebula-card-border)',
                    backgroundColor: 'var(--nebula-bg-lighter)'
                  }}>
                    <h4 className="font-medium mb-2" style={{ color: 'var(--nebula-primary-strong)' }}>Deployment History</h4>

                    {deploymentHistory.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        {deploymentHistory.map((deployment, index) => (
                          <div key={index}>
                            {deployment.log && (
                              <div key={index} className="bg-[var(--nebula-bg)] border border-[var(--nebula-border)] rounded-md p-3 mb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-3 w-3 rounded-full ${deployment.deployment_state === 'success' ? 'bg-green-500' :
                                      deployment.deployment_state === 'error' ? 'bg-red-500' :
                                        'bg-yellow-500'
                                      }`}></div>
                                    <span className="text-sm font-medium" style={{ color: 'var(--nebula-text)' }}>
                                      {new Date(deployment.deployed_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <span className="text-xs px-2 py-1 rounded-full" style={{
                                    backgroundColor: deployment.deployment_state === 'success' ? 'rgba(124, 236, 76, 0.1)' :
                                      deployment.deployment_state === 'error' ? 'rgba(236, 76, 76, 0.1)' :
                                        'rgba(236, 201, 76, 0.1)',
                                    color: deployment.deployment_state === 'success' ? 'var(--nebula-primary-strong)' :
                                      deployment.deployment_state === 'error' ? 'rgb(236, 76, 76)' :
                                        'rgb(236, 201, 76)'
                                  }}>
                                    {index === 0 && deployment.deployment_state === 'success' ? 'Active' : deployment.deployment_state.charAt(0).toUpperCase() + deployment.deployment_state.slice(1)}
                                  </span>
                                </div>

                                {deployment.deployment_url && (
                                  <div className="mt-2 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Cloud className="h-3 w-3" />
                                      <a
                                        href={deployment.deployment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--nebula-primary-strong)' }}
                                      >{deployment.deployment_url}</a>
                                    </div>
                                  </div>
                                )}

                                {deployment.error_message && (
                                  <div className="mt-2 text-xs text-red-400 bg-red-50 p-2 rounded">
                                    <span className="font-medium">Error: </span>{deployment.error_message}
                                  </div>
                                )}

                                {deployment.log && (
                                  <div className="mt-2">
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-xs font-medium" style={{ color: 'var(--nebula-text-muted)' }}>
                                        View deployment logs
                                      </summary>
                                      <pre className="mt-1 p-2 rounded text-xs overflow-x-auto" style={{
                                        backgroundColor: 'var(--nebula-bg)',
                                        border: '1px solid var(--nebula-border)',
                                        color: 'var(--nebula-text)',
                                        maxHeight: '150px'
                                      }}>
                                        {typeof deployment.log === 'string' ? deployment.log : JSON.stringify(deployment.log, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6" style={{ color: 'var(--nebula-text-muted)' }}>
                        <p className="text-sm">No deployment history found</p>
                      </div>
                    )}
                  </div>
                </div>

                {
                  deploymentHistory.length > 0 && deploymentHistory[0]?.deployment_url &&
                  (<div className="mt-6">
                    <h3 className="text-lg font-medium mb-3" style={{ color: 'var(--nebula-primary-strong)' }}>Integration Configuration</h3>

                    {/* Claude Desktop Card */}
                    <div className="rounded-md p-4 mb-4" style={{
                      border: '1px solid var(--nebula-card-border)',
                      backgroundColor: 'var(--nebula-bg-lighter)'
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{
                            backgroundColor: "#FF5733"
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="12" x2="12" y1="3" y2="21" /></svg>
                          </div>
                          <h4 className="font-medium" style={{ color: 'var(--nebula-primary-strong)' }}>Claude Desktop</h4>
                        </div>
                        <button
                          className="px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--nebula-primary-strong)',
                            color: 'white',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(generateMcpConfig('Claude Desktop'));
                            toast.success('Configuration copied to clipboard');
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          <span>Copy Code</span>
                        </button>
                      </div>
                      <p className="text-xs mb-3" style={{ color: 'var(--nebula-text-muted)' }}>
                        Add the following mcp server config to your Claude Desktop configuration file.
                      </p>
                      <div className="rounded-md p-3 text-xs font-mono" style={{
                        backgroundColor: 'var(--nebula-bg)',
                        border: '1px solid var(--nebula-border)',
                        color: 'var(--nebula-text)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        <code>
                          {generateMcpConfig('Claude Desktop')}
                        </code>
                      </div>
                      <div className="mt-3 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                        <p className="mb-1">Location the config file:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                          <li>macOS: <span className="font-mono">~/Library/Application Support/Claude/claude_desktop_config.json</span></li>
                          <li>Windows: <span className="font-mono">%APPDATA%\Claude\claude_desktop_config.json</span></li>
                          <li>Linux: <span className="font-mono">~/.config/Claude/claude_desktop_config.json</span></li>
                        </ul>
                      </div>
                    </div>

                    {/* Cursor Card */}
                    <div className="rounded-md p-4 mb-4" style={{
                      border: '1px solid var(--nebula-card-border)',
                      backgroundColor: 'var(--nebula-bg-lighter)'
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{
                            backgroundColor: "#000000"
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" x2="14" y1="3" y2="10" /><line x1="3" x2="10" y1="21" y2="14" /></svg>
                          </div>
                          <h4 className="font-medium" style={{ color: 'var(--nebula-primary-strong)' }}>Cursor</h4>
                        </div>
                        <button
                          className="px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--nebula-primary-strong)',
                            color: 'white',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(generateMcpConfig('Cursor'));
                            toast.success('Configuration copied to clipboard');
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          <span>Copy Code</span>
                        </button>
                      </div>
                      <p className="text-xs mb-3" style={{ color: 'var(--nebula-text-muted)' }}>
                        Add the following mcp server config to your Cursor configuration file.
                      </p>
                      <div className="rounded-md p-3 text-xs font-mono" style={{
                        backgroundColor: 'var(--nebula-bg)',
                        border: '1px solid var(--nebula-border)',
                        color: 'var(--nebula-text)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        <code>
                          {generateMcpConfig('Cursor')}
                        </code>
                      </div>
                      <div className="mt-3 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                        <p className="mb-1">Location the config file:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                          <li>Global: <span className="font-mono">~/.cursor/mcp.json</span></li>
                          <li>Project-specific: <span className="font-mono">.cursor/mcp.json</span> (in your project root)</li>
                        </ul>
                      </div>
                    </div>

                    {/* Windsurf Card */}
                    <div className="rounded-md p-4 mb-4" style={{
                      border: '1px solid var(--nebula-card-border)',
                      backgroundColor: 'var(--nebula-bg-lighter)'
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{
                            backgroundColor: "#3DB2FF"
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}><path d="M20 22v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="9" r="4" /></svg>
                          </div>
                          <h4 className="font-medium" style={{ color: 'var(--nebula-primary-strong)' }}>Windsurf (Codeium)</h4>
                        </div>
                        <button
                          className="px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--nebula-primary-strong)',
                            color: 'white',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(generateMcpConfig('Windsurf'));
                            toast.success('Configuration copied to clipboard');
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          <span>Copy Code</span>
                        </button>
                      </div>
                      <p className="text-xs mb-3" style={{ color: 'var(--nebula-text-muted)' }}>
                        Add the following mcp server config to your Windsurf configuration file.
                      </p>
                      <div className="rounded-md p-3 text-xs font-mono" style={{
                        backgroundColor: 'var(--nebula-bg)',
                        border: '1px solid var(--nebula-border)',
                        color: 'var(--nebula-text)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        <code>
                          {generateMcpConfig('Windsurf')}
                        </code>
                      </div>
                      <div className="mt-3 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                        <p className="mb-1">Location the config file at <span className="font-mono">~/.codeium/windsurf/mcp_config.json</span></p>
                      </div>
                    </div>

                    {/* Direct API Card */}
                    <div className="rounded-md p-4 mb-4" style={{
                      border: '1px solid var(--nebula-card-border)',
                      backgroundColor: 'var(--nebula-bg-lighter)'
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{
                            backgroundColor: "#6C63FF"
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" /><path d="m6 17 3.13-5.78c.53-.97.43-2.21-.26-3.07A3.97 3.97 0 0 1 8.5 4c1.96-.01 3.67 1.41 3.93 3.35l.74 5.02c.15 1.02.95 1.33 1.85 1.41 0 0 3.55-.74 5.24-1.28 1.52-.48 2.67-1.33 2.93-3.35.23-1.82-1.06-3.15-2.92-3.15h-2.97" /><path d="M18 17a4 4 0 0 0-4-4 3.9 3.9 0 0 0-2.17.63" /><path d="M15.6 8.22A3 3 0 0 0 19 5.5c-.386.033-.763.128-1.12.28" /></svg>
                          </div>
                          <h4 className="font-medium" style={{ color: 'var(--nebula-primary-strong)' }}>Direct API</h4>
                        </div>
                        <button
                          className="px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--nebula-primary-strong)',
                            color: 'white',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(`${deploymentHistory[0]?.deployment_url}/sse`);
                            toast.success('SSE endpoint URL copied to clipboard');
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          <span>Copy URL</span>
                        </button>
                      </div>
                      <p className="text-xs mb-3" style={{ color: 'var(--nebula-text-muted)' }}>
                        The MCP protocol works as follows:
                      </p>
                      <div className="rounded-md p-3 text-xs" style={{
                        backgroundColor: 'var(--nebula-bg)',
                        border: '1px solid var(--nebula-border)',
                        color: 'var(--nebula-text)'
                      }}>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Send a GET request to establish an SSE connection to your endpoint: <span className="font-mono break-all">{deploymentHistory[0]?.deployment_url}/sse</span></li>
                          <li>The SSE connection will send a message event containing a POST endpoint URL</li>
                          <li>Send your JSON-RPC calls to that POST endpoint</li>
                          <li>Responses will be received as server-sent events through the original SSE connection</li>
                        </ol>
                      </div>
                      <div className="mt-3 text-xs flex items-center" style={{ color: 'var(--nebula-text-muted)' }}>
                        <p>For detailed API documentation and examples, see the MCP Protocol Specification</p>
                      </div>
                    </div>

                  </div>)
                }

              </div>
            </TabsContent>
          </CardContent>
        </Tabs >
      </Card >
    </div >
  );
}