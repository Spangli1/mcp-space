from datetime import datetime
from google.genai import types


# ANSI color codes for terminal output
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"

    # Foreground colors
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"

    # Background colors
    BG_BLACK = "\033[40m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"
    BG_MAGENTA = "\033[45m"
    BG_CYAN = "\033[46m"
    BG_WHITE = "\033[47m"


def update_session_state(session_service, app_name, user_id, session_id, state):
    try:
        session = session_service.get_session(
            app_name=app_name, user_id=user_id, session_id=session_id
        )
        state_copy = session.state.copy()
        state_copy['user_id'] = user_id
        state_copy['session_id'] = session_id
        state_copy['app_name'] = app_name
        state_copy['conversation_id'] = session_id

        session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state=state_copy,
        )

    except Exception as e:
        print(f"Error updating session state: {e}")


def update_interaction_history(session_service, app_name, user_id, session_id, entry):
    """Update the interaction history in the session state."""
    try:
        session = session_service.get_session(
            app_name=app_name, user_id=user_id, session_id=session_id
        )

        # Get current history and append the new entry
        interaction_history = session.state.get("interaction_history", [])
        interaction_history.append(entry)

        # Update the state with the new history
        updated_state = session.state.copy()
        updated_state["interaction_history"] = interaction_history

        # Create a new session with updated state
        session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state=updated_state,
        )
    except Exception as e:
        print(f"Error updating interaction history: {e}")


def add_user_query_to_history(session_service, app_name, user_id, session_id, query):
    """Add a user query to the interaction history."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "type": "user_query",
        "content": query,
    }
    update_interaction_history(
        session_service, app_name, user_id, session_id, entry)


def add_agent_response_to_history(
    session_service, app_name, user_id, session_id, agent_name, response
):
    """Add an agent response to the interaction history."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "type": "agent_response",
        "agent": agent_name,
        "content": response,
    }
    update_interaction_history(
        session_service, app_name, user_id, session_id, entry)


def display_state(
    session_service, app_name, user_id, session_id, label="Current State"
):
    """Display the current session state in a formatted way."""
    try:
        session = session_service.get_session(
            app_name=app_name, user_id=user_id, session_id=session_id
        )

        print(f"\n{Colors.YELLOW}{Colors.BOLD}=== {label} ==={Colors.RESET}")

        for key, value in session.state.items():
            if key == "interaction_history":
                # Skip showing full history in state display
                print(
                    f"{Colors.CYAN}{key}: {Colors.RESET}[{len(value)} entries]")
            else:
                print(f"{Colors.CYAN}{key}: {Colors.RESET}{value}")

        print()
    except Exception as e:
        print(f"{Colors.RED}Error displaying state: {e}{Colors.RESET}")


async def process_agent_response(event):
    """Process and display agent response events."""
    # Log basic event info
    print(f"Event ID: {event.id}, Author: {event.author}")

    # Check for specific parts first
    has_specific_part = False
    if event.content and event.content.parts:
        for part in event.content.parts:
            if hasattr(part, "executable_code") and part.executable_code:
                # Access the actual code string via .code
                print(
                    f"  Debug: Agent generated code:\n```python\n{part.executable_code.code}\n```"
                )
                has_specific_part = True
            elif hasattr(part, "code_execution_result") and part.code_execution_result:
                # Access outcome and output correctly
                print(
                    f"  Debug: Code Execution Result: {part.code_execution_result.outcome} - Output:\n{part.code_execution_result.output}"
                )
                has_specific_part = True
            elif hasattr(part, "tool_response") and part.tool_response:
                # Print tool response information
                print(f"  Tool Response: {part.tool_response.output}")
                has_specific_part = True
            # Also print any text parts found in any event for debugging
            elif hasattr(part, "text") and part.text and not part.text.isspace():
                print(f"  Text: '{part.text.strip()}'")

    # Check for final response after specific parts
    final_response = None
    if event.is_final_response():
        if (
            event.content
            and event.content.parts
            and hasattr(event.content.parts[0], "text")
            and event.content.parts[0].text
        ):
            final_response = event.content.parts[0].text.strip()
            # Use colors and formatting to make the final response stand out
            print(
                f"\n{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD}╔══ AGENT RESPONSE ═════════════════════════════════════════{Colors.RESET}"
            )
            print(f"{Colors.CYAN}{Colors.BOLD}{final_response}{Colors.RESET}")
            print(
                f"{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD}╚═════════════════════════════════════════════════════════════{Colors.RESET}\n"
            )
        else:
            print(
                f"\n{Colors.BG_RED}{Colors.WHITE}{Colors.BOLD}==> Final Agent Response: [No text content in final event]{Colors.RESET}\n"
            )

    return final_response


async def call_agent_async(runner, user_id, session_id, query):
    """Call the agent asynchronously with the user's query."""
    print(f"\n{Colors.GREEN}Processing query: {query}{Colors.RESET}")

    # Create the message content
    new_message = types.Content(
        role="user", parts=[types.Part(text=query)]
    )

    # Display state before processing
    display_state(
        runner.session_service,
        runner.app_name,
        user_id,
        session_id,
        "State BEFORE processing",
    )

    # Process the query through the runner
    final_response_text = None
    for event in runner.run(user_id=user_id, session_id=session_id, new_message=new_message):
        response_text = await process_agent_response(event)
        if response_text:
            final_response_text = response_text

    # Display state after processing
    display_state(
        runner.session_service,
        runner.app_name,
        user_id,
        session_id,
        "State AFTER processing",
    )

    return final_response_text
