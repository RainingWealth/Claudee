"""
Content Calendar Planner — creates social media content calendars using
social-content and content-strategy skill methodologies.
"""
import anthropic
import os

CONTENT_CALENDAR_SCHEMA = {
    "name": "content_calendar_planner",
    "description": (
        "Plan a 4-week social media content calendar that supports the campaign angles. "
        "Includes post types, captions, hashtag sets, and content themes for each platform."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "brand_name": {
                "type": "string",
                "description": "The brand or consultant's name."
            },
            "platforms": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": ["Facebook", "Instagram", "LinkedIn", "TikTok", "Twitter/X"]
                },
                "description": "Social platforms to create content for."
            },
            "campaign_angles": {
                "type": "array",
                "items": {"type": "string"},
                "description": "The 3 campaign angles to weave into content."
            },
            "content_themes": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Core content themes or topics relevant to the business."
            },
            "industry": {
                "type": "string",
                "description": "Industry niche for contextual content."
            },
            "posting_frequency": {
                "type": "string",
                "enum": ["daily", "5x_week", "3x_week"],
                "description": "How often to post per platform."
            }
        },
        "required": ["brand_name", "platforms", "campaign_angles", "content_themes", "industry", "posting_frequency"]
    }
}

CONTENT_CALENDAR_PROMPT = """
You are an expert social media strategist specialising in authority-building content
for consulting and professional services businesses.
Apply the social-content and content-strategy frameworks below.

## Skill Context
{skills_context}

---

## Content Calendar Brief
- **Brand:** {brand_name}
- **Platforms:** {platforms}
- **Posting Frequency:** {posting_frequency}
- **Industry:** {industry}
- **Campaign Angles:** {campaign_angles}
- **Content Themes:** {content_themes}

## Deliverable: 4-Week Content Calendar

### Content Pillars (80/20 Rule)
Define 4-5 content pillars, with percentage mix:
- Educational (teach): X%
- Authority / Thought Leadership: X%
- Social Proof / Results: X%
- Engagement / Community: X%
- Promotional (offers): X%

---

### Week 1

For each post this week, provide:

**[Day] — [Platform] — [Content Type]**
Caption: [Full caption text, optimised for the platform]
Visual Direction: [What image/video/graphic should show]
Hashtags: [Relevant hashtag set, 5-15 depending on platform]
Engagement Hook: [Opening line or question]
Campaign Angle Served: [Which of the 3 angles this supports]

[Repeat for each post across all platforms for the week]

---

### Week 2
[Same format]

### Week 3
[Same format]

### Week 4
[Same format — include at least 2 promotional posts this week]

---

### Platform-Specific Notes
For each platform, provide:
- Best posting times (timezone-aware)
- Content format recommendations
- Engagement tactics specific to platform

### Hashtag Banks
Provide 3 sets of hashtags (broad / niche / branded) for easy rotation.

### Content Repurposing Guide
How to repurpose each piece across platforms to maximise output.

Output in clean markdown with a table format for easy VA implementation.
"""


def handle_content_calendar_planner(tool_input: dict, skills_context: str) -> str:
    """Generate a 4-week social media content calendar."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = CONTENT_CALENDAR_PROMPT.format(
        skills_context=skills_context or "Apply social media best practices for B2B consulting.",
        brand_name=tool_input["brand_name"],
        platforms=", ".join(tool_input["platforms"]),
        posting_frequency=tool_input["posting_frequency"].replace("_", " "),
        industry=tool_input["industry"],
        campaign_angles="\n".join(f"- {a}" for a in tool_input["campaign_angles"]),
        content_themes="\n".join(f"- {t}" for t in tool_input["content_themes"])
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
