import uuid
from google.genai import types

MANAGER_AGENT_NAME = 'manager_agent'
MANAGER_AGENT_DESCRIPTION = 'A manager agent that coordinates the entire agent workflow, routes user prompts to appropriate agents, manages orchestration, and returns the final MCP server code.'

SPEC_AGENT_NAME = 'spec_agent'
SPEC_AGENT_DESCRIPTION = 'A spec agent that transforms natural language prompts into structured tool specifications including name, description, parameters, logic, and optional environment variables.'

ENV_MANAGEMENT_AGENT_NAME = 'env_management_agent'
ENV_MANAGEMENT_AGENT_DESCRIPTION = 'An environment management agent that detects and handles environment variable requirements, manages secure access, and injects runtime-safe env usage into the tool code.'

CODE_GEN_AGENT_NAME = 'code_gen_agent'
CODE_GEN_AGENT_DESCRIPTION = 'A code generation agent that generates valid TypeScript tool code using MCP SDK conventions and zod schema validation from the given tool specification.'

WRAPPER_AGENT_NAME = 'wrapper_agent'
WRAPPER_AGENT_DESCRIPTION = 'A wrapper agent that wraps one or more tool implementations into a complete MCP server class with fetch handlers and Cloudflare-compatible deployment code.'

TOOL_BUILDER_AGENT_NAME = 'tool_builder_agent'
TOOL_BUILDER_AGENT_DESCRIPTION = 'A sequential tool builder agent that orchestrates three sub-agents to create the complete project structure including package.json, wrangler.json, and index.ts files based on tool specifications and implementations.'

GEMINI_MODEL_1 = 'gemini-2.0-flash'


GENERATE_CONFIGS = types.GenerateContentConfig(
    temperature=0.00001,
)


MCP_TOOLS_SERVER_ID = str(uuid.uuid4())
USER_ID = str(uuid.uuid4())
APP_NAME = 'MCP SPACE AGENT TEAMS'
SESSION_ID = str(uuid.uuid4())
