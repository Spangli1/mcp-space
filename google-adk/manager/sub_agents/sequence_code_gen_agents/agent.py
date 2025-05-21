from .tool_builder_agent.agent import tool_builder_agent
from .code_gen_agent.agent import code_gen_agent
from google.adk.agents import SequentialAgent


sequence_code_and_file_gen_agents = SequentialAgent(
    name="sequence_code_and_file_gen_agents",
    description="A sequential agent that first generates TypeScript tool implementations and then builds complete project files.",
    sub_agents=[
        code_gen_agent,
        tool_builder_agent,
    ],
)

# For backward compatibility
code_and_file_gen_agents = sequence_code_and_file_gen_agents
