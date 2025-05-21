from typing import List
from pydantic import BaseModel, Field


class ListOfCodeAgentOutput(BaseModel):
    code: str = Field(
        description="The generated TypeScript code for the tool implementation."
    )
    imports: List[str] = Field(
        description="List of necessary imports for the generated code."
    )


class CodeGenAgentOutput(BaseModel):
    tools: List[ListOfCodeAgentOutput] = Field(
        description="List of generated tool implementations."
    )
