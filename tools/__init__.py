"""
Tool Registry — defines all Claude API tool schemas and dispatches handler calls.
"""
from tools.facebook_ads import handle_facebook_ads_creator, FACEBOOK_ADS_SCHEMA
from tools.perplexity_research import handle_perplexity_researcher, PERPLEXITY_SCHEMA
from tools.cold_outreach import handle_cold_outreach_generator, COLD_OUTREACH_SCHEMA
from tools.email_campaigns import handle_email_campaign_writer, EMAIL_CAMPAIGNS_SCHEMA
from tools.content_calendar import handle_content_calendar_planner, CONTENT_CALENDAR_SCHEMA
from tools.copywriting import handle_copywriting_assistant, COPYWRITING_SCHEMA
from tools.campaign_reports import handle_campaign_report_generator, CAMPAIGN_REPORTS_SCHEMA

# All tool schemas passed to the Claude API
ALL_TOOL_SCHEMAS = [
    PERPLEXITY_SCHEMA,
    FACEBOOK_ADS_SCHEMA,
    COLD_OUTREACH_SCHEMA,
    EMAIL_CAMPAIGNS_SCHEMA,
    CONTENT_CALENDAR_SCHEMA,
    COPYWRITING_SCHEMA,
    CAMPAIGN_REPORTS_SCHEMA,
]

# Dispatch map: tool name → handler function
TOOL_HANDLERS = {
    "perplexity_researcher": handle_perplexity_researcher,
    "facebook_ads_creator": handle_facebook_ads_creator,
    "cold_outreach_generator": handle_cold_outreach_generator,
    "email_campaign_writer": handle_email_campaign_writer,
    "content_calendar_planner": handle_content_calendar_planner,
    "copywriting_assistant": handle_copywriting_assistant,
    "campaign_report_generator": handle_campaign_report_generator,
}


def execute_tool(tool_name: str, tool_input: dict, skills_context: dict) -> str:
    """Execute a tool by name, passing skills context to the handler."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return f"Error: Unknown tool '{tool_name}'"
    return handler(tool_input, skills_context.get(tool_name, ""))
