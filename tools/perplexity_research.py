"""
Perplexity Research Tool — calls the Perplexity API for real-time market research.
"""
import os
import json
import requests

PERPLEXITY_SCHEMA = {
    "name": "perplexity_researcher",
    "description": (
        "Research the market, competitors, target audience, and industry trends using "
        "Perplexity's real-time search. Use this FIRST before building any campaign assets."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The specific research question or topic to investigate."
            },
            "research_type": {
                "type": "string",
                "enum": ["market", "competitor", "trends", "icp", "regulations"],
                "description": (
                    "Type of research: 'market' for market size/landscape, "
                    "'competitor' for competitor analysis, 'trends' for industry trends, "
                    "'icp' for ideal customer profile research, "
                    "'regulations' for compliance requirements."
                )
            },
            "industry": {
                "type": "string",
                "description": "The industry or niche being researched (e.g. 'Financial Advisory Singapore')."
            }
        },
        "required": ["query", "research_type", "industry"]
    }
}


def handle_perplexity_researcher(tool_input: dict, skills_context: str) -> str:
    """Call Perplexity API and return structured research output."""
    api_key = os.getenv("PERPLEXITY_API_KEY", "")
    query = tool_input["query"]
    research_type = tool_input["research_type"]
    industry = tool_input["industry"]

    system_prompt = (
        f"You are an expert market researcher specializing in {industry}. "
        f"Provide detailed, actionable research findings with specific data points, "
        f"statistics, and insights. Structure your response with clear sections: "
        f"Key Findings, Market Data, Implications for Marketing, and Recommended Actions."
    )

    if not api_key:
        return _fallback_research(query, research_type, industry)

    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-sonar-large-128k-online",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Research ({research_type}): {query}\nIndustry: {industry}"}
                ],
                "max_tokens": 2000,
                "temperature": 0.2,
                "search_recency_filter": "month"
            },
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        citations = result.get("citations", [])

        output = f"# Research Report: {query}\n\n"
        output += f"**Type:** {research_type.title()} | **Industry:** {industry}\n\n"
        output += content
        if citations:
            output += "\n\n## Sources\n"
            for i, cite in enumerate(citations, 1):
                output += f"{i}. {cite}\n"
        return output

    except requests.RequestException as e:
        return f"[Perplexity API Error: {e}]\n\n" + _fallback_research(query, research_type, industry)


def _fallback_research(query: str, research_type: str, industry: str) -> str:
    """Return a placeholder when Perplexity API is unavailable."""
    return (
        f"# Research Report: {query}\n\n"
        f"**Note:** Perplexity API key not configured. Add PERPLEXITY_API_KEY to .env for live research.\n\n"
        f"**Research Type:** {research_type}\n"
        f"**Industry:** {industry}\n\n"
        f"## Placeholder Findings\n\n"
        f"- Market research for '{query}' would appear here\n"
        f"- Key statistics and data points from current sources\n"
        f"- Competitor landscape analysis\n"
        f"- Target audience insights and ICP definition\n\n"
        f"*Configure PERPLEXITY_API_KEY to get real-time research data.*"
    )
