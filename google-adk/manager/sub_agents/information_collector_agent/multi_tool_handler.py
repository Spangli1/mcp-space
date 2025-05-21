"""
Helper module for information collector agent to handle multiple tool creation and updates.
"""
import re
from typing import Dict, List, Tuple, Optional


def parse_tool_update_query(query: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse a tool update query in the format "update the tool: {tool_name} {query}"
    Returns a tuple of (tool_name, update_query) or (None, None) if not a valid update query
    """
    # Match pattern "update the tool: {tool_name} {query}"
    pattern = r"update\s+the\s+tool:\s+(\w+)(.*)"
    match = re.search(pattern, query, re.IGNORECASE)

    if match:
        tool_name = match.group(1).strip()
        update_query = match.group(2).strip()
        return (tool_name, update_query)

    return (None, None)


def detect_multiple_tools_query(query: str) -> Tuple[bool, int, List[str]]:
    """
    Detect if a query is asking to create multiple tools and extract tool names/descriptions.
    Returns a tuple of (is_multiple_tools, number_of_tools, list_of_tool_descriptions)
    """
    # Check for patterns indicating multiple tools
    patterns = [
        r"create\s+(\d+)\s+tools",  # "create 3 tools"
        r"make\s+(\d+)\s+tools",    # "make 3 tools"
        r"build\s+(\d+)\s+tools",   # "build 3 tools"
        r"create\s+tools\s+for\s+(.*)",  # "create tools for X, Y and Z"
        r"make\s+tools\s+for\s+(.*)",    # "make tools for X, Y and Z"
    ]

    # Check each pattern
    for pattern in patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            if match.group(1).isdigit():
                # First pattern type: "create X tools"
                num_tools = min(int(match.group(1)), 3)  # Max 3 tools
                return (True, num_tools, [])
            else:
                # Second pattern type: "create tools for X, Y and Z"
                tool_descriptions = match.group(1)
                # Split by commas and "and"
                descriptions = re.split(r',\s*|\s+and\s+', tool_descriptions)
                descriptions = [d.strip() for d in descriptions if d.strip()]
                num_tools = min(len(descriptions), 3)  # Max 3 tools
                return (True, num_tools, descriptions[:num_tools])

    return (False, 1, [])


def create_spec_summary(tools: List[Dict]) -> str:
    """
    Create a summary of multiple tool specifications
    """
    if not tools:
        return "No tools have been created yet."

    summary = "## Tool Specifications Summary:\n\n"

    for i, tool in enumerate(tools):
        summary += f"### Tool {i+1}: {tool.get('tool_name', 'Unnamed')}\n"
        summary += f"- **Description**: {tool.get('tool_description', 'No description')}\n"

        # Parameters
        summary += "- **Parameters**:\n"
        for param in tool.get('tool_parameters', []):
            req = "(required)" if param.get(
                'tool_parameter_required', False) else "(optional)"
            summary += f"  - {param.get('tool_parameter_name', '')} {req}\n"

        # Environment variables
        if tool.get('tool_env_vars', []):
            summary += "- **Environment Variables**:\n"
            for env in tool.get('tool_env_vars', []):
                summary += f"  - {env.get('env_name', '')}\n"

        summary += "\n"

    return summary
