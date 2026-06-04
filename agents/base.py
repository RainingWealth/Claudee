from __future__ import annotations

import os
from pathlib import Path

import anthropic

from tools.web import WEB_TOOLS

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"

SALES_CONTEXT = """
## Sales Psychology Principles (apply to all marketing output for Rayvern Chng's financial advisory practice)
- Buyer's journey: awareness -> consideration -> decision. Match tone and depth to stage.
- Intent-first: take the pressure off before selling. Lead with value, not the ask. ("I'm not here to sell you anything — I'm here to see if what I do could help.")
- Hot-button driven: connect everything to what the client actually cares about (business survival, family security, legacy, peace of mind).
- DISC awareness: adapt style to personality — D (business owners/MDs): direct/results, I (networkers): stories/energy, S (families/special needs): reassurance/trust, C (CFOs/HR): data/proof.
- Benefits over features: "your business survives even if you can't work" not "key person insurance with $2M coverage".
- Objection = opportunity: acknowledge, explore, reframe. Never fight resistance. Common: "I already have insurance", "too expensive", "I'll think about it".
- Consequence framing: help the reader feel the cost of inaction ("What happens to your business if your co-founder can't work tomorrow?").
- Clear calls-to-action: assumptive, not permission-seeking ("Let's schedule your review" not "Would you maybe like to chat sometime?").
- Singapore context: reference CPF, MAS, SNTC, LPA, local regulations where relevant.
- MAS compliance: never promise guaranteed returns, always include appropriate disclaimers.
""".strip()


def load_knowledge(subdir: str | None = None) -> str:
    """Load all .txt and .md files from the knowledge directory."""
    target = KNOWLEDGE_DIR / subdir if subdir else KNOWLEDGE_DIR
    if not target.exists():
        return ""
    parts = []
    for ext in ("*.md", "*.txt"):
        for f in sorted(target.glob(ext)):
            if f.name == "README.md":
                continue
            content = f.read_text(errors="replace").strip()
            if content:
                parts.append(f"### {f.stem}\n{content}")
    return "\n\n".join(parts)


class BaseAgent:
    model = "claude-sonnet-4-6-20250514"
    max_iterations = 20
    agent_name = "Agent"
    system_prompt = "You are a helpful assistant."

    def __init__(self):
        self.client = anthropic.Anthropic()
        self._build_system_prompt()

    def _build_system_prompt(self) -> None:
        parts = [self.system_prompt, SALES_CONTEXT]
        knowledge = load_knowledge()
        if knowledge:
            parts.append(f"## Additional Knowledge\n{knowledge}")
        self.full_system_prompt = "\n\n".join(parts)

    def _get_tools(self) -> list[dict]:
        return list(WEB_TOOLS)

    def _execute_tool(self, name: str, input_data: dict) -> str:
        return f"Unknown tool: {name}"

    def _extract_text(self, response) -> str:
        for block in response.content:
            if hasattr(block, "text"):
                return block.text
        return ""

    def run(self, task: str) -> str:
        messages = [{"role": "user", "content": task}]
        tools = self._get_tools()
        response = None

        for _ in range(self.max_iterations):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=16000,
                system=self.full_system_prompt,
                tools=tools,
                messages=messages,
            )

            if response.stop_reason == "end_turn":
                return self._extract_text(response)

            if response.stop_reason == "pause_turn":
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": [{"type": "text", "text": "Continue."}]})
                continue

            # tool_use — server-side tools are handled automatically, user-defined tools need execution
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = self._execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            if tool_results:
                messages.append({"role": "user", "content": tool_results})

        return self._extract_text(response) if response else "Max iterations reached."
