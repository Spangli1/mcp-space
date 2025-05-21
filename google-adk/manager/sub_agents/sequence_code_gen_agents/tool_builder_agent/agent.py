from google.adk.agents import Agent, SequentialAgent
from pydantic import BaseModel, Field

from ....config import config


class ToolBuilderOutput(BaseModel):
    index_ts_content: str
    wrangler_json_content: str
    package_json_content: str


INDEX_TS_FILE = """
import {" + "McpAgent"  + "} from "agents/mcp";
import { " +  "McpServer"  + "} from "@modelcontextprotocol/sdk/server/mcp.js";


export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Notion Database Lister",
    version: "1.0.0",
  });

   async init() {
    this.server.tool("sendSlackMessage", { message: z.string() }, async ("{" + "message" + "}") => {
  try {
    const url = this.env.SLACK_WEBHOOK_URL;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: " + "message" + " })
    });
    return { content: [{ type: 'text', text: 'Message sent.' }] };
  } catch (error) {
    return { content: [{ type: 'text', text: 'There was an error processing your request.' }] };
  }
});
   }

   export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {

    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      // @ts-ignore
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      // @ts-ignore
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};


"""


WRANGLER_JSONC_FILE = """

{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "mcp-calculator",
  "main": "src/index.ts",
  "compatibility_date": "2025-05-09",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "migrations": [
    {
      "new_sqlite_classes": ["MyMCP"],
      "tag": "v1"
    }
  ],
  "durable_objects": {
    "bindings": [
      {
        "class_name": "MyMCP",
        "name": "MCP_OBJECT"
      }
    ]
  },
  "vars": {
    "NOTION_API_KEY": "ntn_35083YA316M01GKA7JdqMBNe45F6"
  }
}


"""


PACKAGE_JSON_FILE = """
{
  "name": "mcpno-code-typescript",
  "version": "1.0.0",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "start": "wrangler dev --local",
    "deploy": "wrangler deploy",
    "test": "tsc && node dist/test.js",
    "inspector": "npx @modelcontextprotocol/inspector@latest"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.11.1",
    "agents": "^0.0.80",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "wrangler": "^4.14.4"
  }
}


"""


example_output = ToolBuilderOutput(
    index_ts_content=INDEX_TS_FILE.strip(),
    wrangler_json_content=WRANGLER_JSONC_FILE.strip(),
    package_json_content=PACKAGE_JSON_FILE.strip(),
)


# Individual agent for package.json generation
package_json_builder_agent = Agent(
    name="package_json_builder_agent",
    output_key="package_json_content",
    description="An agent that generates the package.json file for the MCP server with appropriate dependencies",
    model=config.GEMINI_MODEL_1,
    instruction="""
    You are a Package JSON Builder Agent responsible for generating the package.json file for the MCP server.

    Your task is to create a valid package.json file based on the tool specifications and the current tool name.

    === Base Structure ===
    Use this template as your starting point:

    {
      "name": "mcpno-code-typescript",
      "version": "1.0.0",
      "main": "dist/index.js",
      "type": "module",
      "scripts": {
        "start": "wrangler dev --local",
        "deploy": "wrangler deploy",
        "test": "tsc && node dist/test.js",
        "inspector": "npx @modelcontextprotocol/inspector@latest"
      },
      "keywords": [],
      "author": "",
      "license": "ISC",
      "description": "",
      "dependencies": {
        "@modelcontextprotocol/sdk": "^1.11.1",
        "agents": "^0.0.80",
        "zod": "^3.24.4"
      },
      "devDependencies": {
        "typescript": "^5.8.3",
        "wrangler": "^4.14.4"
      }
    }

    === Key Requirements ===
    1. UPDATE THE NAME: Replace "mcpno-code-typescript" with the tool name from the specs (format: "mcp-[tool_name]")
    2. KEEP CORE DEPENDENCIES: Don't remove @modelcontextprotocol/sdk, agents, or zod
    3. ADD TOOL-SPECIFIC PACKAGES: Analyze the tool specifications and implementation to identify additional dependencies
       - For HTTP requests: add axios
       - For API integrations: add relevant client libraries
       - For data processing: add any necessary utilities
    4. PRESERVE THE STRUCTURE: Don't change scripts, main, type, or other structural elements
    5. Use the lowercase for name parameter and for space use '-'
    
    === Example Additions ===
    - If the tool uses Notion API: add "@notionhq/client": "^2.2.13"
    - If the tool sends emails: add "nodemailer": "^6.9.7"
    - If the tool processes CSV/Excel: add "xlsx": "^0.18.5"
    
    Return ONLY the JSON content as a string, no explanations or markdown formatting.
    """,
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=config.GENERATE_CONFIGS,
)


# Individual agent for wrangler.json generation
wrangler_json_builder_agent = Agent(
    name="wrangler_json_builder_agent",
    output_key="wrangler_json_content",
    description="An agent that generates the wrangler.json file for the MCP server with proper configuration and environment variables",
    model=config.GEMINI_MODEL_1,
    instruction="""
    You are a Wrangler JSON Builder Agent responsible for generating the wrangler.json file for the MCP server.

    Your task is to create a valid wrangler.json file based on the tool specifications, particularly the environment variables.

    === Base Structure ===
    Use this template as your starting point:

    {
      "$schema": "node_modules/wrangler/config-schema.json",
      "name": "mcp-calculator",
      "main": "src/index.tsx",
      "compatibility_date": "2025-05-09",
      "compatibility_flags": ["nodejs_compat"],
      "observability": {
        "enabled": true
      },
      "migrations": [
        {
          "new_sqlite_classes": ["MyMCP"],
          "tag": "v1"
        }
      ],
      "durable_objects": {
        "bindings": [
          {
            "class_name": "MyMCP",
            "name": "MCP_OBJECT"
          }
        ]
      },
      "vars": {
      }
    }

    === Key Requirements ===
    1. UPDATE THE NAME: Use the name from the package.json, keeping the "mcp-" prefix
    2. ADD ENVIRONMENT VARIABLES: Extract all environment variables from the tool specifications and add them to the "vars" object
    3. KEEP STANDARD CONFIGURATION: Don't change compatibility settings, durable objects, or migrations
    4. ENSURE MAIN PATH IS CORRECT: Keep "src/index.ts" as the main file path
    5. Use the lowercase for name parameter and for space use '-'
    
    === Environment Variables Format ===
    For each environment variable specified in the tool specification:
    - Add it to the "vars" object with a placeholder value
    - For API keys, use format "VARIABLE_NAME": "placeholder-value"
    - For URLs, use format "VARIABLE_NAME": "https://example.com"
    
    Return ONLY the JSON content as a string, no explanations or markdown formatting.
    """,
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=config.GENERATE_CONFIGS,
)


# Individual agent for index.ts generation
index_ts_builder_agent = Agent(
    name="index_ts_builder_agent",
    output_key="index_ts_content",
    description="An agent that generates the index.ts file with the complete MCP server implementation",
    model=config.GEMINI_MODEL_1,
    instruction="""
    You are an Index.ts Builder Agent responsible for generating the index.ts file for the MCP server.

    Your task is to create a valid index.ts file that includes all tool implementations and proper exports.

    === Base Structure ===
    Use this template as your starting point:

    ```typescript
    import """ + "{" + "McpAgent" + "}" + """ from "agents/mcp";
    import {""" + """McpServer""" + """} from "@modelcontextprotocol/sdk/server/mcp.js";
    
    export class MyMCP extends McpAgent {
      server = new McpServer({
        name: "MCP Tool Server",
        version: "1.0.0",
      });
    
      async init() {
        
        // Tool implementations will go here
      
      }
    }
    
    export default {
      fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);
    
        if (url.pathname === "/sse" || url.pathname === "/sse/message") {
          // @ts-ignore
          return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
        }
    
        if (url.pathname === "/mcp") {
          // @ts-ignore
          return MyMCP.serve("/mcp").fetch(request, env, ctx);
        }
    
        return new Response("Not found", { status: 404 });
      },
    };
    ```
    
    

    === Key Requirements ===
    1. UPDATE SERVER NAME: Use the tool name from the specifications for the server name
    2. INCLUDE ALL TOOL IMPLEMENTATIONS: Insert the code from `state['tool_implementations']` inside the init() method
    3. ADD NECESSARY IMPORTS: Include any additional imports specified in the tool implementations
    4. MAINTAIN PROPER STRUCTURE: Keep the McpAgent class, init method, and fetch handler
    
    
    == Considerations ===
    - Check the imports and ensure they are correct for the tool implementations
    - Ensure that the no duplicates in imports
    - use {specification_json} context state for updated tool.server code
    
    === Implementation Notes ===
    - Place all tool implementations inside the init() method
    - Include any additional imports at the top of the file
    - Maintain proper TypeScript syntax and indentation
    - Keep the standard fetch handler with routes for /sse and /mcp
    - Implement full tool implementations, including error handling and response formatting
    - Don't include any comments or explanations in the final output
    - Ensure the code is clean and follows best practices for TypeScript and MCP SDK
    - Don't include the comments like replace, complete the actual output 
    - Complete the full Code Implementation
    
    Return the complete TypeScript code as a string, with no explanations or markdown formatting.
    """,
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=config.GENERATE_CONFIGS,
)


# Main tool builder agent as a sequential agent (the final step in the sequence_code_gen_agents workflow)
tool_builder_agent = SequentialAgent(
    name=config.TOOL_BUILDER_AGENT_NAME,
    description=config.TOOL_BUILDER_AGENT_DESCRIPTION,
    sub_agents=[
        package_json_builder_agent,
        wrangler_json_builder_agent,
        index_ts_builder_agent,
    ],
)
