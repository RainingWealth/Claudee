"""
Facebook Ads Creator — generates complete Meta/Facebook ad campaigns using
paid-ads, ad-creative, and marketing-psychology skill methodologies.
"""
import anthropic
import os

FACEBOOK_ADS_SCHEMA = {
    "name": "facebook_ads_creator",
    "description": (
        "Create a complete Facebook/Meta ad campaign for one campaign angle. "
        "Generates 3 ad variations with headlines, body copy, CTAs, creative direction, "
        "audience targeting parameters, and budget recommendations. "
        "Run this once per campaign angle (3 times total for a full campaign)."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "product_or_service": {
                "type": "string",
                "description": "The consulting service or product being advertised."
            },
            "campaign_angle": {
                "type": "string",
                "enum": ["awareness_problem", "specific_trigger", "identity_aspiration"],
                "description": (
                    "'awareness_problem': broad awareness of pain points (high volume), "
                    "'specific_trigger': targets a specific event/trigger (high intent), "
                    "'identity_aspiration': emotional identity/aspiration angle."
                )
            },
            "target_audience": {
                "type": "string",
                "description": "Detailed description of the ideal customer (demographics, role, situation)."
            },
            "daily_budget_sgd": {
                "type": "number",
                "description": "Daily ad budget in SGD (or your local currency)."
            },
            "objective": {
                "type": "string",
                "enum": ["leads", "traffic", "awareness", "conversions"],
                "description": "Primary campaign objective."
            },
            "unique_value_proposition": {
                "type": "string",
                "description": "What makes this service uniquely valuable to the target audience."
            }
        },
        "required": [
            "product_or_service", "campaign_angle", "target_audience",
            "daily_budget_sgd", "objective", "unique_value_proposition"
        ]
    }
}

AD_GENERATION_PROMPT = """
You are an elite Facebook/Meta ads specialist with deep expertise in consulting and services marketing.
Using the paid-ads, ad-creative, and marketing-psychology frameworks below, create a complete ad campaign.

## Skill Context
{skills_context}

---

## Campaign Brief
- **Service:** {product_or_service}
- **Angle:** {campaign_angle}
- **Target Audience:** {target_audience}
- **Daily Budget:** SGD {daily_budget_sgd}
- **Objective:** {objective}
- **UVP:** {unique_value_proposition}

## Your Output Must Include:

### Campaign Overview
- Angle strategy and psychological hook
- Why this angle works for this audience

### Audience Targeting
- Core demographics (age, gender, location)
- Interest targeting (3-5 specific interests)
- Behavioural targeting
- Exclusions
- Lookalike or retargeting recommendations

### 3 Ad Variations

For each ad variation provide:
- **Ad #N — [Angle Sub-type]**
- Primary Text (125 chars max for mobile, full version)
- Headline (40 chars max)
- Description (30 chars max)
- CTA Button: [Button text]
- Creative Direction: [What the image/video should show]
- Emotional hook used

### Budget Split
- Recommended allocation across the 3 variations for testing
- When to consolidate to winner

### Lead Magnet Recommendation
- What free resource would capture this audience's attention

### Compliance Notes
- Any claims to avoid or compliance considerations

Output in clean markdown format, ready to hand to a media buyer or VA.
"""


def handle_facebook_ads_creator(tool_input: dict, skills_context: str) -> str:
    """Generate a complete Facebook ad campaign for one angle."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = AD_GENERATION_PROMPT.format(
        skills_context=skills_context or "Apply direct response advertising best practices.",
        product_or_service=tool_input["product_or_service"],
        campaign_angle=tool_input["campaign_angle"].replace("_", " ").title(),
        target_audience=tool_input["target_audience"],
        daily_budget_sgd=tool_input["daily_budget_sgd"],
        objective=tool_input["objective"],
        unique_value_proposition=tool_input["unique_value_proposition"]
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
