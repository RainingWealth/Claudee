from __future__ import annotations

import json
import sys

import anthropic

from agents.base import BaseAgent
from agents.content_writer import ContentWriter
from agents.market_researcher import MarketResearcher
from agents.sales_coach import SalesCoach
from agents.social_media_manager import SocialMediaManager
from tools.web import WEB_TOOLS

DELEGATION_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "delegate_to_content_writer",
            "description": (
                "Delegate a task to the Content Writer specialist. Use for: blog posts, "
                "email campaigns, ad copy, landing page copy, sales emails, case studies, "
                "taglines, newsletters, and any content creation task."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "Detailed task description including target audience, tone, format, and any constraints.",
                    }
                },
                "required": ["task"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delegate_to_social_media_manager",
            "description": (
                "Delegate a task to the Social Media Manager specialist. Use for: platform strategies, "
                "social media posts, content calendars, hashtag research, engagement strategies, "
                "trend analysis for social, community building, and influencer outreach plans."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "Detailed task description including platforms, goals, audience, and timeline.",
                    }
                },
                "required": ["task"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delegate_to_market_researcher",
            "description": (
                "Delegate a task to the Market Researcher specialist. Use for: competitor analysis, "
                "SWOT analysis, market sizing, trend research, audience personas, industry analysis, "
                "positioning strategy, and any research-intensive task."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "Detailed research brief including what to investigate, specific competitors or markets, and desired output format.",
                    }
                },
                "required": ["task"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delegate_to_sales_coach",
            "description": (
                "Delegate a task to the Sales Coach specialist (Lusi SAPT/IBCT/HNW + NEPQ methodology). "
                "Use for: sales scripts, pitch development, objection handling, closing strategies, "
                "DISC profiling, role-play practice, prospecting sequences, follow-up systems, "
                "HNW client strategy, sales training, cold call scripts, discovery questions, "
                "and any sales-related challenge."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "Detailed description of the sales situation, challenge, or request including industry, product/service, and target customer.",
                    }
                },
                "required": ["task"],
            },
        },
    },
]

SYSTEM_PROMPT = """You are the Marketing Director — the strategic leader of a marketing agency with four specialist agents at your disposal.

## Your Role
You analyze user requests, break them into focused sub-tasks, delegate to the right specialists, and synthesize their work into a cohesive final output. You are the single point of contact — the user never talks to your team directly.

## Your Team
1. **Content Writer** — Creates blog posts, emails, ads, landing pages, sales copy
2. **Social Media Manager** — Platform strategies, social content, calendars, engagement
3. **Market Researcher** — Competitor analysis, trends, audience insights, market sizing
4. **Sales Coach** — Sales scripts, objection handling, DISC profiling, closing strategies, prospecting, role-play (uses Lusi + NEPQ methodology)

## How You Work
1. **Analyze** the request — understand the goal, audience, constraints
2. **Decompose** into specialist tasks — determine which agents are needed
3. **Delegate** with clear, detailed briefs — give each agent full context
4. **Synthesize** their outputs into a cohesive deliverable — edit, connect, and polish
5. **Present** the final result with clear structure and next steps

## Delegation Guidelines
- For complex requests, delegate to multiple agents and combine their work
- For simple requests, delegate to the single most relevant agent
- Always provide detailed context in your delegation — the specialists work better with specifics
- You can also use web search directly for quick lookups or fact-checks
- For go-to-market plans: Market Researcher (analysis) -> Sales Coach (strategy) -> Content Writer (content) -> Social Media Manager (distribution)
- When the user asks about selling, pitching, objections, closing, or prospecting — always involve the Sales Coach

## Communication Style
- Be strategic and decisive — the user hired you as a director, not an assistant
- Present deliverables professionally with clear structure
- Proactively suggest next steps and additional opportunities
- When synthesizing multiple agents' work, create a unified narrative — don't just concatenate outputs
"""


class Orchestrator(BaseAgent):
    model = "claude-opus-4-6-20250514"
    agent_name = "Marketing Director"
    system_prompt = SYSTEM_PROMPT

    def __init__(self):
        super().__init__()
        self.sub_agents = {
            "delegate_to_content_writer": ContentWriter(),
            "delegate_to_social_media_manager": SocialMediaManager(),
            "delegate_to_market_researcher": MarketResearcher(),
            "delegate_to_sales_coach": SalesCoach(),
        }

    def _get_tools(self) -> list[dict]:
        return DELEGATION_TOOLS + list(WEB_TOOLS)

    def _execute_tool(self, name: str, input_data: dict) -> str:
        agent = self.sub_agents.get(name)
        if agent is None:
            return f"Unknown tool: {name}"

        friendly = agent.agent_name
        print(f"\n  [{friendly}] Working on task...", flush=True)
        result = agent.run(input_data["task"])
        print(f"  [{friendly}] Done.", flush=True)
        return result

    def run(self, task: str) -> str:
        """Orchestrator uses streaming to prevent HTTP timeouts on long runs."""
        messages = [{"role": "user", "content": task}]
        tools = self._get_tools()
        response = None

        for _ in range(self.max_iterations):
            with self.client.messages.stream(
                model=self.model,
                max_tokens=16000,
                system=self.full_system_prompt,
                tools=tools,
                messages=messages,
                thinking={"type": "enabled", "budget_tokens": 10000},
            ) as stream:
                response = stream.get_final_message()

            if response.stop_reason == "end_turn":
                return self._extract_text(response)

            if response.stop_reason == "pause_turn":
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": [{"type": "text", "text": "Continue."}]})
                continue

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
