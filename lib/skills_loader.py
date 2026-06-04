"""
Skills Loader — reads .claude/skills/*/SKILL.md files and injects
methodology context into each marketing tool's prompts.
"""
from pathlib import Path

# Maps tool names to the skill modules that should inform them
SKILL_MAP = {
    "facebook_ads_creator": ["paid-ads", "ad-creative", "marketing-psychology"],
    "cold_outreach_generator": ["cold-email", "marketing-psychology", "sales-enablement"],
    "email_campaign_writer": ["email-sequence", "copywriting", "marketing-psychology"],
    "content_calendar_planner": ["social-content", "content-strategy"],
    "copywriting_assistant": ["copywriting", "marketing-psychology"],
    "campaign_report_generator": ["analytics-tracking", "ab-test-setup"],
    "perplexity_researcher": [],  # Perplexity API handles research
}

# Base path for skills (relative to project root)
SKILLS_BASE = Path(__file__).parent.parent / ".claude" / "skills"


def load_skill(skill_name: str) -> str:
    """Read a SKILL.md file and return its content, or empty string if not found."""
    skill_path = SKILLS_BASE / skill_name / "SKILL.md"
    if skill_path.exists():
        return skill_path.read_text(encoding="utf-8")
    return ""


def get_tool_context(tool_name: str) -> str:
    """Return concatenated SKILL.md content for a given tool."""
    skill_names = SKILL_MAP.get(tool_name, [])
    parts = []
    for skill_name in skill_names:
        content = load_skill(skill_name)
        if content:
            parts.append(f"## Skill: {skill_name}\n\n{content}")
    return "\n\n---\n\n".join(parts) if parts else ""


def list_available_skills() -> list[str]:
    """Return a list of all installed skill names."""
    if not SKILLS_BASE.exists():
        return []
    return sorted(d.name for d in SKILLS_BASE.iterdir() if d.is_dir())


def load_all_relevant_skills() -> str:
    """Load all skills relevant to marketing campaigns for the system prompt."""
    priority_skills = [
        "launch-strategy",
        "marketing-psychology",
        "paid-ads",
        "copywriting",
        "cold-email",
        "email-sequence",
        "social-content",
        "analytics-tracking",
    ]
    parts = []
    for skill_name in priority_skills:
        content = load_skill(skill_name)
        if content:
            parts.append(f"## Skill: {skill_name}\n\n{content}")

    installed = list_available_skills()
    if installed:
        skill_list = ", ".join(installed)
        parts.insert(0, f"## Available Marketing Skills\n\n{skill_list}")

    return "\n\n---\n\n".join(parts) if parts else "No skill modules found."
