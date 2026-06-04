"""
Email Campaign Writer — generates complete email sequences using
email-sequence, copywriting, and marketing-psychology skill methodologies.
"""
import anthropic
import os

EMAIL_CAMPAIGNS_SCHEMA = {
    "name": "email_campaign_writer",
    "description": (
        "Write a complete email sequence (welcome, nurture, or sales) for a campaign angle. "
        "Each email includes subject line, preview text, body copy, and CTA. "
        "Applies proven email marketing frameworks from skill modules."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "product_or_service": {
                "type": "string",
                "description": "The consulting service or offer being promoted."
            },
            "sequence_type": {
                "type": "string",
                "enum": ["welcome", "nurture", "sales", "reengagement"],
                "description": (
                    "'welcome': onboard new leads, build trust, "
                    "'nurture': educate and build authority over time, "
                    "'sales': convert warm leads to clients, "
                    "'reengagement': win back cold leads."
                )
            },
            "num_emails": {
                "type": "integer",
                "minimum": 3,
                "maximum": 7,
                "description": "Number of emails in the sequence (3-7)."
            },
            "campaign_angle": {
                "type": "string",
                "description": "The campaign angle this sequence supports."
            },
            "target_audience": {
                "type": "string",
                "description": "Who will receive these emails."
            },
            "lead_magnet": {
                "type": "string",
                "description": "The free resource or lead magnet the prospect opted in for."
            }
        },
        "required": [
            "product_or_service", "sequence_type", "num_emails",
            "campaign_angle", "target_audience", "lead_magnet"
        ]
    }
}

EMAIL_PROMPT = """
You are an expert email marketer specialising in consulting and services businesses.
Your emails build authority, trust, and create urgency without being pushy.
Apply the email-sequence, copywriting, and marketing-psychology frameworks below.

## Skill Context
{skills_context}

---

## Email Sequence Brief
- **Service:** {product_or_service}
- **Sequence Type:** {sequence_type}
- **Number of Emails:** {num_emails}
- **Campaign Angle:** {campaign_angle}
- **Audience:** {target_audience}
- **Lead Magnet / Entry Point:** {lead_magnet}

## Write the Complete Email Sequence

For each email provide:

---
### Email [N] — [Descriptive Name] | Day [X]

**Subject Line:** [subject]
**Preview Text:** [preview — 40-90 chars]
**Send Time:** Day X after opt-in

---
**[Email Body]**

[Write the full email body here. Use short paragraphs (1-3 sentences max).
Include personalisation token: {{first_name}} at the start.
Authority-building tone — position the sender as an expert guide.]

**CTA:** [Specific call to action with link placeholder]

---

### Sequence Notes
- Optimal sending days and times
- Segmentation triggers (who gets what based on behaviour)
- A/B test suggestions for subject lines
- Key metrics to watch (open rate, click rate, reply rate benchmarks)

Output in clean markdown format. All emails should feel personal, not automated.
"""


def handle_email_campaign_writer(tool_input: dict, skills_context: str) -> str:
    """Generate a complete email sequence."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = EMAIL_PROMPT.format(
        skills_context=skills_context or "Apply email marketing best practices for B2B consulting.",
        product_or_service=tool_input["product_or_service"],
        sequence_type=tool_input["sequence_type"],
        num_emails=tool_input["num_emails"],
        campaign_angle=tool_input["campaign_angle"],
        target_audience=tool_input["target_audience"],
        lead_magnet=tool_input["lead_magnet"]
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
