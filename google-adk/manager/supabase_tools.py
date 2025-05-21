"""
Tools for interacting with Supabase database to fetch and check tool and specification data.
"""
import google.generativeai as genai
import json
from typing import Dict, List, Optional, Tuple, Union, Any

from .sb import supabase
from .config import config

from dotenv import load_dotenv

import os
import re
import json

load_dotenv()


genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

model = genai.GenerativeModel(config.GEMINI_MODEL_1, generation_config={
    "temperature": 0.0,
})


def compare_query_json(query: str, json_data: Any) -> Dict[str, float]:
    """
    Compare a query with a JSON object and return a score .
    """

    PROMPT = f"""
    You are an expert in semantic search and semantic matching between natural language queries and JSON data structures.
    
    TASK:
    Perform a semantic search to analyze how well the provided JSON object satisfies the user's query by comparing their semantic meaning, purpose, and content.
    
    FORMAT:
    - example json format
    ''' {
        "name": "getCityTemperature",
        "description": "Fetches the current temperature for a specified city using the OpenWeatherMap API.",
        "parameters": {
            "cityName": "string"
        },
        "envVars": [
            {
                "env_name": "OPENWEATHERMAP_API_KEY",
                "env_value": "string"
            }
        ],
        "logic": "Make a GET request to the OpenWeatherMap API with the city name. The API key should be read from the environment variables. Return the temperature in Celsius."
    }'''
    
    EVALUATION CRITERIA:
    - Semantic Relevance: Does the JSON contain the key concepts, synonyms, and related terms mentioned in the query?
    - Intent Matching: Does the JSON align with the implicit and explicit intentions in the query?
    - Completeness: Does the JSON provide all the information needed to satisfy the query?
    - Functionality: Does the functionality represented by the JSON match what the user is looking for?
    - Context Understanding: Consider the broader context of what the user might be trying to achieve.
    - Check the description, name, parameterse, logic.
    
    After performing semantic analysis, assign a similarity score from 0.0 (no match) to 1.0 (perfect match).
    
    Query: {query}
    JSON: {json_data}
    """

    # Generate similarity analysis using Gemini model
    response = model.generate_content(PROMPT)
    response_text = response.text

    # Extract score from response - look for a decimal value between 0 and 1
    score_matches = re.findall(r'(\d+\.\d+)', response_text)
    if score_matches:
        similarity_score = float(score_matches[0])
        # Ensure score is within valid range
        similarity_score = max(0.0, min(1.0, similarity_score))
    else:
        # Default score if no valid number found
        similarity_score = 0.5

    return {"similarity_score": similarity_score}


def get_tool_by_id(tools_id: str) -> Optional[Dict]:
    """
    Retrieves a tool from the tools_data table by its ID.

    Args:
        tools_id (str): The ID of the tool to retrieve.

    Returns:
        Optional[Dict]: The tool data if found, None otherwise.
    """
    try:
        response = supabase.table("tools_data").select(
            "*").eq("tools_id", tools_id).execute()
        data = response.data
        if data and len(data) > 0:
            return data[0]
        return None
    except Exception as e:
        print(f"Error retrieving tool by ID: {e}")
        return None


def get_tool_by_query(query: str, user_id: Optional[str] = None, server_id: Optional[str] = None) -> Optional[Dict]:
    """
    Searches for a tool in the tools_data table based on semantic matching with the query.

    This function analyzes the query and tries to find tools that have similar purpose 
    or functionality, rather than just simple text matching.

    Args:
        query (str): The search query describing the tool functionality.
        user_id (Optional[str], optional): The user ID to filter results by.
        server_id (Optional[str], optional): The server ID to filter results by.

    Returns:
        Optional[Dict]: The tool data if found, None otherwise.
    """
    try:

        # Get all tools, optionally filtered by user_id
        query_builder = supabase.table("tools_data").select("*")
        if user_id:
            query_builder = query_builder.eq("user_id", user_id)
        if server_id:
            query_builder = query_builder.eq("server_id", server_id)

        response = query_builder.execute()
        data = response.data

        if not data:
            return None

        # Score each tool based on relevance to the query
        best_match = None
        highest_score = 0

        for item in data:
            if 'tools_json' not in item:
                continue

            # Parse the JSON if it's a string
            tools_json = item['tools_json']
            if isinstance(tools_json, str):
                try:
                    tools_json = json.loads(tools_json)
                except:
                    continue            # Calculate match score - use both rule-based and semantic approaches
            # Use the compare_query_json function for semantic matching
            semantic_result = compare_query_json(query, tools_json)
            semantic_score = semantic_result.get("similarity_score", 0.5)

            # Debug logging
            print(
                f"Tool matching - Query: '{query[:50]}...' Tool: '{tools_json.get('name', 'unnamed')}'")
            print(f"  Semantic score: {semantic_score:.2f},")

            # Keep track of the best match
            if semantic_score > highest_score:
                highest_score = semantic_score
                best_match = item        # Only return a match if it's reasonably similar
        # With the new combined scoring system, we can use a slightly higher threshold
        matching_threshold = 0.8  # Increased from 0.3 for the combined score
        if highest_score > matching_threshold:
            print(
                f"Tool match found with score {highest_score:.2f} (threshold: {matching_threshold:.2f})")
            return best_match

        print(
            f"No good tool match found. Best score: {highest_score:.2f} (threshold: {matching_threshold:.2f})")
        return None
    except Exception as e:
        print(f"Error searching for tool by query: {e}")
        return None


def get_spec_by_id(spec_id: str) -> Optional[Dict]:
    """
    Retrieves a specification from the spec table by its ID.

    Args:
        spec_id (str): The ID of the specification to retrieve.

    Returns:
        Optional[Dict]: The specification data if found, None otherwise.
    """
    try:
        response = supabase.table("spec").select(
            "*").eq("spec_id", spec_id).execute()
        data = response.data
        if data and len(data) > 0:
            return data[0]
        return None
    except Exception as e:
        print(f"Error retrieving spec by ID: {e}")
        return None


def get_spec_by_query(query: str, user_id: Optional[str] = None, server_id: Optional[str] = None) -> Optional[Dict]:
    """
    Searches for a specification in the spec table based on semantic matching with the query.

    This function analyzes the query and tries to find specifications that have similar purpose 
    or functionality, rather than just simple text matching.

    Args:
        query (str): The search query describing the specification functionality.
        user_id (Optional[str], optional): The user ID to filter results by.
        server_id (Optional[str], optional): The server ID to filter results by.

    Returns:
        Optional[Dict]: The specification data if found, None otherwise.
    """
    try:

        # Get all specifications, optionally filtered by user_id
        query_builder = supabase.table("spec").select("*")
        if user_id:
            query_builder = query_builder.eq("user_id", user_id)
        if server_id:
            query_builder = query_builder.eq("server_id", server_id)

        response = query_builder.execute()
        data = response.data

        if not data:
            return None

        # Score each specification based on relevance to the query
        best_match = None
        highest_score = 0

        for item in data:
            if 'spec_json' not in item:
                continue

            # Parse the JSON if it's a string
            spec_json = item['spec_json']
            print("\n\nspec_json : ", spec_json)
            input("\nspec_json\nPress Enter to continue...")

            semantic_result = compare_query_json(query, spec_json)
            print("MySemilarty score: ", semantic_result)
            input("\nsimilarty score \nPress Enter to continue...")
            semantic_score = semantic_result.get("similarity_score", 0.5)

            # Debug logging
            print(
                f"Spec matching - Query: '{query[:50]}...' Spec: '{spec_json.get('name', 'unnamed')}'")
            print(f"  Semantic score: {semantic_score:.2f}")

            # Keep track of the best match
            if semantic_score > highest_score:
                highest_score = semantic_score
                best_match = item        # Only return a match if it's reasonably similar
        # With the new combined scoring system, we can use a slightly higher threshold
        matching_threshold = 0.8  # Increased from 0.3 for the combined score
        print(f"\n\n\n\n\n\tBest match: {best_match}")
        if highest_score > matching_threshold:
            print(
                f"Spec match found with score {highest_score:.2f} (threshold: {matching_threshold:.2f})")
            return best_match

        print(
            f"No good spec match found. Best score: {highest_score:.2f} (threshold: {matching_threshold:.2f})")
        return None
    except Exception as e:
        print(f"Error searching for spec by query: {e}")
        return None


def check_existing_implementation(query: str, user_id: Optional[str] = None, server_id: Optional[str] = None) -> Tuple[bool, Optional[Dict], Optional[Dict]]:
    """
    Checks if there's an existing implementation for the given query using semantic matching.

    Args:
        query (str): The user query about a tool they want to build.
        user_id (Optional[str], optional): The user ID to filter results by.
        server_id (Optional[str], optional): The server ID to filter results by.

    Returns:
        Tuple[bool, Optional[Dict], Optional[Dict]]: 
            - Boolean indicating if an existing implementation was found
            - Tool data if found, None otherwise
            - Specification data if found, None otherwise
    """
    print("\n\n" + "="*80)
    print(f"Checking for existing implementation matching query: '{query}'")
    print(f"User ID: {user_id}")
    print(f"Server ID: {server_id}")
    print("="*80)

    print("Step 1: Searching for matching tools...")

    # First try to find a matching tool
    tool_data = get_tool_by_query(query, user_id, server_id)

    if tool_data:
        print(f"Found matching tool: {tool_data.get('tools_id')}")
        if isinstance(tool_data.get('tools_json'), str):
            try:
                tool_json = json.loads(tool_data.get('tools_json'))
                print(f"Tool name: {tool_json.get('name', 'Unnamed')}")
                print(
                    f"Tool description: {tool_json.get('description', 'No description')[:100]}...")
            except:
                print("Could not parse tool JSON")
        else:
            print("Tool JSON not available in string format")
    else:
        print("No matching tool found")

    if tool_data:
        # If we have a tool, try to get its specification
        spec_data = None
        if 'spec_id' in tool_data:
            spec_data = get_spec_by_id(tool_data['spec_id'])
        return True, tool_data, spec_data

    # If no tool is found, try to find a matching specification
    spec_data = get_spec_by_query(query, user_id, server_id)
    if spec_data:
        return True, None, spec_data

    # Nothing found
    return False, None, None


def save_tool_implementation(user_id: str, tools_json: Optional[Dict[str, Any]], spec_id: Optional[str] = None, server_id: Optional[str] = None) -> Optional[str]:
    """
    Saves a new tool implementation to the tools_data table.

    Args:
        user_id (str): The ID of the user.
        tools_json (Dict): The tool implementation as a JSON dictionary.
        spec_id (Optional[str], optional): The ID of the associated specification if any.
        server_id (Optional[str], optional): The ID of the server if any.

    Returns:
        Optional[str]: The ID of the newly created tool if successful, None otherwise.
    """
    try:
        data = {
            "user_id": user_id,
            "tools_json": json.dumps(tools_json) if isinstance(tools_json, dict) else tools_json,
        }

        if spec_id:
            data["spec_id"] = spec_id

        if server_id:
            data["server_id"] = server_id

        response = supabase.table("tools_data").insert(data).execute()

        if response.data and len(response.data) > 0:
            return response.data[0].get("tools_id")
        return None
    except Exception as e:
        print(f"Error saving tool implementation: {e}")
        return None


def save_specification(user_id: str, spec_json: Optional[Dict[str, Any]], server_id: Optional[str] = None) -> Optional[str]:
    """
    Saves a new specification to the spec table. Checks for existence before saving.
    If a similar specification already exists, returns the ID of the existing one.
    Only saves a new specification if no similar one is found.

    Args:
        user_id (str): The ID of the user.
        spec_json (Dict): The specification as a JSON dictionary.
        server_id (Optional[str], optional): The ID of the server if any.

    Returns:
        Optional[str]: The ID of the specification (existing or newly created) if successful, None otherwise.
    """
    print("\n\n\nsaving specifications : ", spec_json)
    input("\n\nsave specification\nPress Enter to continue...")
    try:
        # Check if a similar specification already exists
        existing_spec_id = None

        # Generate a query from the spec_json data if it's a dict
        if isinstance(spec_json, dict):
            # Create a query from name and description if available
            query_parts = []
            if 'name' in spec_json:
                query_parts.append(spec_json['name'])
            if 'description' in spec_json:
                query_parts.append(spec_json['description'])

            query = " ".join(query_parts) if query_parts else ""

            # Check if a similar specification already exists
            if query:
                print(
                    f"Checking for existing specification matching: '{query}'")
                existing_spec = get_spec_by_query(query, user_id, server_id)
                print(f"Existing specification found: {existing_spec}")
                input("checking for existing specification\nPress Enter to continue...")
                if existing_spec:
                    print(
                        f"Found existing specification with ID: {existing_spec.get('spec_id')}")
                    input("found existing: \nPress Enter to continue...")
                    existing_spec_id = existing_spec.get('spec_id')
                    return existing_spec_id

        # If no existing spec found (existing_spec_id is None), create and save a new one
        print("No existing specification found. Creating new specification...")
        if spec_json:
            import uuid
            data = {
                "user_id": user_id,
                "spec_json": json.dumps(spec_json) if isinstance(spec_json, dict) else spec_json,
                # Generate a new UUID for the spec_id
                "spec_id": str(uuid.uuid4()),
            }

            if server_id:
                data["server_id"] = server_id

            print("\n\n\save specification data : ", data)
            input("\nsave specification data\nPress Enter to continue...")

            response = supabase.table("spec").insert(data).execute()

            print("\n\n\nresponse : ", response)

            input("\nsave specification response\nPress Enter to continue...")

            if response.data and len(response.data) > 0:
                return response.data[0].get("spec_id")
        return None
    except Exception as e:
        # print(f"Error saving specification: {e}")
        return None
