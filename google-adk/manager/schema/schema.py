from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional


class EnvVarSchema(BaseModel):
    name: str = Field(description="The name of the environment variable")
    description: str = Field(
        description="Description of what the environment variable is used for")


class ToolSpecOutputSchema(BaseModel):
    name: str = Field(description="A camelCase name for the tool")
    description: str = Field(
        description="A clear, concise explanation of what the tool does")
    parameters: Dict[str, str] = Field(
        description="An object mapping parameter names to their types")
    envVars: List[Dict[str, str]] = Field(
        default=[],
        description="An array of objects, each with name and description")
    logic: str = Field(
        description="A brief description of the core functionality")


class CodeGenOutputSchema(BaseModel):
    code: str = Field(description="The generated TypeScript tool code")


class McpServerOutputSchema(BaseModel):
    serverCode: str = Field(
        description="The complete TypeScript MCP server implementation")
