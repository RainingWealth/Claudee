"""
Campaign Report Generator — creates campaign KPI frameworks and post-campaign
analysis reports using analytics-tracking and ab-test-setup skill methodologies.
"""
import anthropic
import os
from datetime import datetime

CAMPAIGN_REPORTS_SCHEMA = {
    "name": "campaign_report_generator",
    "description": (
        "Generate a complete campaign report including KPI targets, success metrics, "
        "A/B test plan, tracking setup checklist, and next-step action plan. "
        "Run this at the end of campaign planning to finalise the measurement framework."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "campaign_name": {
                "type": "string",
                "description": "Name of the campaign."
            },
            "campaign_goal": {
                "type": "string",
                "description": "Primary goal (e.g. '20 qualified leads per month')."
            },
            "channels_used": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Marketing channels in this campaign (e.g. ['Facebook Ads', 'Cold Outreach', 'Email'])."
            },
            "campaign_angles": {
                "type": "array",
                "items": {"type": "string"},
                "description": "The 3 campaign angles used."
            },
            "total_budget": {
                "type": "number",
                "description": "Total campaign budget."
            },
            "campaign_duration_weeks": {
                "type": "integer",
                "description": "How many weeks the campaign will run."
            },
            "industry": {
                "type": "string",
                "description": "Industry/niche for benchmark context."
            }
        },
        "required": [
            "campaign_name", "campaign_goal", "channels_used",
            "campaign_angles", "total_budget", "campaign_duration_weeks", "industry"
        ]
    }
}

REPORT_PROMPT = """
You are an expert marketing analyst and campaign strategist specialising in consulting services.
Apply the analytics-tracking and ab-test-setup frameworks below to create a comprehensive
campaign measurement framework and performance report template.

## Skill Context
{skills_context}

---

## Campaign Brief
- **Campaign:** {campaign_name}
- **Goal:** {campaign_goal}
- **Channels:** {channels}
- **Angles:** {angles}
- **Total Budget:** SGD {total_budget}
- **Duration:** {duration} weeks
- **Industry:** {industry}
- **Generated:** {date}

## Deliverable: Complete Campaign Report

---

### Executive Summary
- Campaign objective (one sentence)
- Strategy overview (3 bullets)
- Expected outcomes

---

### KPI Framework

#### Primary KPIs
| KPI | Target | Benchmark | Measurement Method |
|-----|--------|-----------|-------------------|
[Fill in 3-5 primary KPIs with realistic targets for this industry]

#### Secondary KPIs
| KPI | Target | Why It Matters |
|-----|--------|----------------|
[Fill in 4-6 supporting metrics]

#### Warning Signals
What numbers would indicate the campaign needs adjustment, and what action to take.

---

### Channel-Specific Metrics

For each channel in the campaign, provide:
#### [Channel Name]
- Key metrics to track
- Benchmark performance for {industry}
- Reporting cadence (daily/weekly)
- Tool/platform for measurement

---

### A/B Test Plan

#### Test 1 — [High Priority]
- What to test
- Control vs. Variant
- Success metric
- Sample size needed / duration
- How to declare a winner

#### Test 2 — [Medium Priority]
[Same format]

#### Test 3 — [Lower Priority]
[Same format]

---

### Tracking Setup Checklist
- [ ] UTM parameters configured for each channel
- [ ] Conversion events set up in Meta Ads Manager
- [ ] Lead form pixel firing correctly
- [ ] CRM pipeline stages created (MQL → SQL → Opportunity → Won)
- [ ] Weekly reporting dashboard created
- [ ] WhatsApp response rate tracking enabled
- [ ] Email sequence open/click tracking active
[Add channel-specific items]

---

### Weekly Review Cadence

**Daily Check (5 min):** What to look at each morning
**Weekly Review (30 min):** What to analyse, who reviews it, decisions to make
**End-of-Campaign Review:** Full analysis framework

---

### Optimisation Decision Tree
Based on performance data:
- If CTR < X% → [action]
- If CPL > $Y → [action]
- If email open rate < Z% → [action]
- If call-to-meeting rate < W% → [action]

---

### Next Campaign Recommendations
Based on this campaign structure, what to do next (scale, pivot, or test new angles).

Output in clean, professional markdown — ready to share with client or team.
"""


def handle_campaign_report_generator(tool_input: dict, skills_context: str) -> str:
    """Generate a complete campaign measurement framework and report template."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = REPORT_PROMPT.format(
        skills_context=skills_context or "Apply data-driven marketing analytics best practices.",
        campaign_name=tool_input["campaign_name"],
        campaign_goal=tool_input["campaign_goal"],
        channels=", ".join(tool_input["channels_used"]),
        angles="\n".join(f"- {a}" for a in tool_input["campaign_angles"]),
        total_budget=tool_input["total_budget"],
        duration=tool_input["campaign_duration_weeks"],
        industry=tool_input["industry"],
        date=datetime.now().strftime("%B %d, %Y")
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3500,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
