# filepath: f:\Products\no-code-multiagent\a2a\manager\sub_agents\sequence_code_gen_agents\code_gen_agent\agent.py
from google.adk.agents import Agent
import json
from ....config import config

from .models import CodeGenAgentOutput, ListOfCodeAgentOutput

from google.adk.agents.callback_context import CallbackContext
from typing import Optional
from google.genai import types


CODE_IMPLEMENTATION_SAMPLE = """
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
"""

# Define a sample tool specification structure
tool_spec_sample = {
    "tool_name": "sendSlackMessage",
    "tool_description": "Sends a message to a Slack channel using a webhook URL",
    "tool_parameters": [
        {
            "tool_parameter_name": "message",
            "tool_parameter_description": "The message to send to Slack",
            "tool_parameter_required": True
        }
    ],
    "tool_env_vars": [
        {
            "env_name": "SLACK_WEBHOOK_URL",
            "env_description": "The webhook URL for the Slack channel"
        }
    ],
    "tool_implementation_notes": "Sends a POST request to the Slack webhook URL with the message in the request body"
}

example_output = ListOfCodeAgentOutput(
    code=CODE_IMPLEMENTATION_SAMPLE.strip(),
    imports=["import axios from 'axios';"]

)


CODE_GEN_AGENT_INSTRUCTIONS = """
You are a Code Generation Agent tasked with generating TypeScript tool implementations using the MCP SDK, based on structured specifications.
You are the first step in the sequence_code_gen_agents workflow, receiving specifications from the information_collector_agent workflow.

====================
<< Conditional Check >>
====================

* If `state['tool_spec']` is missing or null, do NOT proceed.
* Instead, immediately delegate control to the Manager Agent.

====================
<< Task Overview >>
====================

1. Parse the tool specification from `state['tool_spec']` (received from information_collector_agent)
2. Generate the TypeScript implementation using `this.server.tool(...)`
3. Ensure code conforms to MCP and Cloudflare Workers standards
4. Your output will be passed to tool_builder_agent as the next step in the workflow
4. After completion, your output will be passed to the tool_builder_agent to create project files

=========================
<< Input Specification >>
=========================

* The tool specification is a JSON object found in `state['tool_spec']`
* Structure includes: 
""" + f"""
{json.dumps(tool_spec_sample, indent=2)} 
""" + """

===========================
<< Code Generation Rules >>
===========================

* Use `this.server.tool("toolId", schema, async handler)` format
* Validate parameters with `zod`
* Access env vars with `this.env.VAR_NAME`
* Implement business logic inside a try/catch block
* On error, return standardized fallback content
* Output must be a JSON with:
  * `code`: The tool code as a string
  * `imports`: List of required imports (e.g., `zod`, `fetch`, etc.)

========================
<< Output JSON Format >>
========================
[
  {
    "code": "`ts\\n<TOOL_IMPLEMENTATION>\\n`",
    "imports": [
      "",
    ]
  }
]

=========================
<< Example Output JSON >>
=========================

Sample output

""" + f"""
{str(json.dumps(example_output.dict(), indent=2))}
""" + """

=======================
<< Key Constraints >>
=======================

* Only use `this.server.tool(...)` — no other structure
* Use `zod` schemas for param validation
* All logic must use async/await and error handling
* No user-facing text or explanations — all output is internal
* Adhere to MCP content return shape and standards
* Avoid unnecessary imports or scaffolding
* Your code will be automatically passed to the tool_builder_agent as part of the sequential workflow
* Ensure output is syntactically correct for Cloudflare Workers
* Format strictly: no extra text outside JSON structure
* Use the User Agent in the headers.

===========================
<< Output Schema Definition >>
===========================

""" + f"""
{json.dumps(CodeGenAgentOutput.model_json_schema(), indent=2)}
""" + """

===========================
<< End of Instructions >>
===========================
"""


def after_agent_callback(callback_context: CallbackContext) -> Optional[types.Content]:
    """
      This callback is called after each agent is executed.
      It handles automatic transition from information_collector_agent to sequence_code_and_file_gen_agents.
    """

    callback_context.state['user_confirmed'] = False


code_gen_agent = Agent(
    name=config.CODE_GEN_AGENT_NAME,
    output_key="tool_implementation",
    description=config.CODE_GEN_AGENT_DESCRIPTION,
    model=config.GEMINI_MODEL_1,
    instruction=CODE_GEN_AGENT_INSTRUCTIONS,
    output_schema=CodeGenAgentOutput,
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=config.GENERATE_CONFIGS,
    after_agent_callback=after_agent_callback,
)
