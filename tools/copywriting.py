"""
Copywriting Assistant — generates structured copy using AIDA, PAS, or BAB frameworks,
powered by copywriting and marketing-psychology skill methodologies.
"""
import anthropic
import os

COPYWRITING_SCHEMA = {
    "name": "copywriting_assistant",
    "description": (
        "Write high-converting copy for any marketing medium using proven frameworks "
        "(AIDA, PAS, BAB). Use for landing pages, lead magnet descriptions, webinar "
        "registration pages, flyers, brochures, and ad copy."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "medium": {
                "type": "string",
                "enum": ["landing_page", "lead_magnet_description", "webinar_registration", "flyer", "brochure", "video_script"],
                "description": "The marketing asset to write copy for."
            },
            "framework": {
                "type": "string",
                "enum": ["AIDA", "PAS", "BAB"],
                "description": (
                    "AIDA: Attention → Interest → Desire → Action. "
                    "PAS: Problem → Agitate → Solution. "
                    "BAB: Before → After → Bridge."
                )
            },
            "product_or_service": {
                "type": "string",
                "description": "What is being offered."
            },
            "target_audience": {
                "type": "string",
                "description": "Who the copy is written for."
            },
            "key_benefit": {
                "type": "string",
                "description": "The single most important benefit or transformation."
            },
            "campaign_angle": {
                "type": "string",
                "description": "Which campaign angle this copy supports."
            }
        },
        "required": [
            "medium", "framework", "product_or_service",
            "target_audience", "key_benefit", "campaign_angle"
        ]
    }
}

COPYWRITING_PROMPT = """
You are a world-class direct response copywriter specialising in consulting and professional services.
Your copy builds authority, creates desire, and drives action without hype or empty promises.
Apply the copywriting and marketing-psychology frameworks below.

## Skill Context
{skills_context}

---

## Copy Brief
- **Medium:** {medium}
- **Framework:** {framework}
- **Service/Offer:** {product_or_service}
- **Audience:** {target_audience}
- **Key Benefit/Transformation:** {key_benefit}
- **Campaign Angle:** {campaign_angle}

## Write Complete Copy Using {framework} Framework

### {framework} Structure Applied:
{framework_explanation}

---

### Full Copy

[Write the complete copy for this medium here. Be specific and concrete.
Use the {framework} structure throughout. Avoid generic marketing language.
Every line should earn its place by moving the reader closer to action.]

---

### Headlines Variations (3 options)
Provide 3 alternative headline options the client can split-test.

### CTA Options (3 options)
Provide 3 alternative call-to-action button texts.

### Copy Notes
- Word count and format recommendations for this medium
- Key psychological triggers used
- What to A/B test first
- How to adapt this copy for different platforms

Output in clean markdown, formatted for easy editing and handoff.
"""

FRAMEWORK_EXPLANATIONS = {
    "AIDA": (
        "**Attention:** Hook the reader with a bold headline or provocative statement.\n"
        "**Interest:** Build interest by revealing a problem or opportunity they care about.\n"
        "**Desire:** Show the transformation — paint the 'after' picture vividly.\n"
        "**Action:** Make a clear, compelling, low-risk ask with a specific CTA."
    ),
    "PAS": (
        "**Problem:** Name the specific pain point they're experiencing right now.\n"
        "**Agitate:** Amplify the problem — cost of inaction, emotional consequences.\n"
        "**Solution:** Present your service as the clear, credible answer."
    ),
    "BAB": (
        "**Before:** Describe their current frustrating situation in relatable terms.\n"
        "**After:** Paint a vivid picture of their desired future state.\n"
        "**Bridge:** Show how your service is the bridge between before and after."
    )
}


def handle_copywriting_assistant(tool_input: dict, skills_context: str) -> str:
    """Generate structured copy using the specified framework."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    framework = tool_input["framework"]
    prompt = COPYWRITING_PROMPT.format(
        skills_context=skills_context or "Apply direct response copywriting best practices.",
        medium=tool_input["medium"].replace("_", " ").title(),
        framework=framework,
        product_or_service=tool_input["product_or_service"],
        target_audience=tool_input["target_audience"],
        key_benefit=tool_input["key_benefit"],
        campaign_angle=tool_input["campaign_angle"],
        framework_explanation=FRAMEWORK_EXPLANATIONS.get(framework, "")
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
