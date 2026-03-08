"""
Cold Outreach Generator — creates cold call scripts AND WhatsApp follow-up sequences
using cold-email, marketing-psychology, and sales-enablement skill methodologies.
"""
import anthropic
import os

COLD_OUTREACH_SCHEMA = {
    "name": "cold_outreach_generator",
    "description": (
        "Generate a complete cold outreach package for one campaign angle: "
        "a cold call script with objection handling + WhatsApp follow-up message sequence. "
        "The WhatsApp format is compatible with the existing CRM automation system. "
        "Run once per campaign angle."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "product_or_service": {
                "type": "string",
                "description": "The consulting service being pitched."
            },
            "prospect_role": {
                "type": "string",
                "description": "Job title/role of the prospect (e.g. 'SME Business Owner', 'Mid-career Professional')."
            },
            "prospect_pain_points": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 specific pain points this prospect experiences."
            },
            "campaign_angle": {
                "type": "string",
                "description": "The campaign angle this outreach supports (e.g. 'awareness_problem', 'specific_trigger')."
            },
            "industry": {
                "type": "string",
                "description": "Prospect's industry (e.g. 'Financial Advisory', 'Business Consulting')."
            },
            "your_name": {
                "type": "string",
                "description": "Consultant's name for personalisation."
            }
        },
        "required": [
            "product_or_service", "prospect_role", "prospect_pain_points",
            "campaign_angle", "industry", "your_name"
        ]
    }
}

COLD_OUTREACH_PROMPT = """
You are an expert B2B sales strategist and cold outreach specialist for consulting and services businesses.
Using the cold-email, marketing-psychology, and sales-enablement frameworks below, create a complete outreach package.

## Skill Context
{skills_context}

---

## Outreach Brief
- **Service:** {product_or_service}
- **Prospect:** {prospect_role} in {industry}
- **Pain Points:** {pain_points}
- **Campaign Angle:** {campaign_angle}
- **Consultant Name:** {your_name}

## Deliverable 1: Cold Call Script

Create a conversational cold call script with these sections:

### Opening (15 seconds)
- Pattern interrupt opener
- Permission-based bridge

### Discovery Bridge (30 seconds)
- Contextual reason for calling
- Situational question

### Pain Agitation (30 seconds)
- Tie to their likely pain points
- Consequence awareness

### Value Statement (20 seconds)
- Specific, concrete outcome statement
- Social proof one-liner

### Soft Close / Next Step (15 seconds)
- Low-friction ask
- Fallback option

### Objection Handling Scripts
Provide responses for:
1. "I'm not interested"
2. "I'm too busy"
3. "Send me an email"
4. "We already have someone"
5. "How much does it cost?"

### Call Notes
- Tone and energy guidance
- Best calling times
- CRM notes to record after call

---

## Deliverable 2: WhatsApp Follow-up Sequence

Create a 5-message WhatsApp sequence to send AFTER initial contact.
Format each message for WhatsApp (short, conversational, uses line breaks for readability).
Compatible with automated CRM sending.

**Message 1 — Same Day (within 2 hours of call)**
[Message text]
[CTA]

**Message 2 — Day 2**
[Message text — add value, not just follow-up]
[CTA]

**Message 3 — Day 4**
[Message text — social proof or case study]
[CTA]

**Message 4 — Day 7**
[Message text — urgency or new angle]
[CTA]

**Message 5 — Day 14 (Re-engagement)**
[Message text — breakup or new offer]
[CTA]

### WhatsApp Notes
- Timing recommendations
- Personalisation placeholders: {{first_name}}, {{company}}
- When to mark as lost vs. nurture

Output everything in clean markdown, ready to hand to a sales VA or load into the CRM.
"""


def handle_cold_outreach_generator(tool_input: dict, skills_context: str) -> str:
    """Generate cold call script + WhatsApp follow-up sequence."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    pain_points_str = "\n".join(f"- {p}" for p in tool_input["prospect_pain_points"])

    prompt = COLD_OUTREACH_PROMPT.format(
        skills_context=skills_context or "Apply consultative selling and direct response principles.",
        product_or_service=tool_input["product_or_service"],
        prospect_role=tool_input["prospect_role"],
        industry=tool_input["industry"],
        pain_points=pain_points_str,
        campaign_angle=tool_input["campaign_angle"].replace("_", " ").title(),
        your_name=tool_input["your_name"]
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
