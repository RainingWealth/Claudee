#!/usr/bin/env python3
"""
Marketing Agent — AI-powered campaign generator for consulting & services businesses.

Leverages 29 marketing skill modules + the Anthropic Claude API to automatically
produce a full campaign: Facebook ads (3 angles), cold call scripts, WhatsApp sequences,
email nurture, content calendar, landing page copy, and campaign KPI report.

Usage:
    python marketing_agent.py --goal "Get 20 consulting clients" --industry "Financial Advisory" \
        --target "Mid-career professionals" --budget 5000 --campaign-name "advisory-q2"

    python marketing_agent.py --tool facebook_ads --product "Wealth Planning" --angle awareness_problem
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime

import anthropic
import click
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.markdown import Markdown
from rich.table import Table

load_dotenv()

# Import tool registry and skills loader
sys.path.insert(0, str(Path(__file__).parent))
from tools import ALL_TOOL_SCHEMAS, TOOL_HANDLERS, execute_tool
from lib.skills_loader import load_all_relevant_skills, get_tool_context, list_available_skills
from lib.pdf_generator import generate_pdfs

console = Console()

# ─────────────────────────────────────────────────────────────
# System Prompt
# ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an elite marketing strategist with deep expertise in consulting and professional services marketing.

Your positioning is authority-building and trust-focused — you help consultants and service businesses become recognized experts, attract high-quality clients, and run campaigns that generate genuine ROI.

You have access to 29 proven marketing skill modules (loaded below) that contain methodologies, frameworks, templates, and best practices. You MUST apply the relevant skill methodology when using each tool.

## Campaign Philosophy
- Every campaign follows a 3-ANGLE approach for maximum market coverage:
  * Angle 1 — awareness_problem: Broad pain/problem awareness (high volume, lower intent)
  * Angle 2 — specific_trigger: Targets a specific life/business event (medium volume, higher intent)
  * Angle 3 — identity_aspiration: Emotional identity and aspiration (emotional resonance, brand building)

- Always start with research before building assets
- All content is professional, substantiated, and compliance-aware
- WhatsApp follow-up sequences are formatted for CRM automation compatibility
- Every output should be immediately deployable — no generic filler

## Execution Order (Fully Automatic)
Run all tools in this sequence without pausing:
1. perplexity_researcher × 2-3 (market overview, competitor analysis, ICP)
2. facebook_ads_creator × 3 (one per angle)
3. cold_outreach_generator × 3 (one per angle)
4. email_campaign_writer × 2 (welcome sequence + sales sequence)
5. content_calendar_planner × 1 (4-week calendar across all angles)
6. copywriting_assistant × 1 (landing page or lead magnet copy)
7. campaign_report_generator × 1 (KPIs, A/B tests, tracking setup)

When you are done with all tools, provide a brief campaign summary with key next steps.
"""


# ─────────────────────────────────────────────────────────────
# Output Management
# ─────────────────────────────────────────────────────────────

# Maps tool names + inputs to output file paths
OUTPUT_FILE_MAP = {
    "perplexity_researcher": "00-research",
    "facebook_ads_creator": "angle-{angle}/01-facebook-ads",
    "cold_outreach_generator": "angle-{angle}/02-cold-outreach",
    "email_campaign_writer": "03-email-{sequence_type}",
    "content_calendar_planner": "04-content-calendar",
    "copywriting_assistant": "05-copywriting-{medium}",
    "campaign_report_generator": "06-campaign-report",
}

_tool_call_counts: dict = {}


def get_output_path(campaign_dir: Path, tool_name: str, tool_input: dict) -> Path:
    """Determine output file path for a tool result."""
    _tool_call_counts[tool_name] = _tool_call_counts.get(tool_name, 0) + 1
    count = _tool_call_counts[tool_name]

    angle_map = {
        "awareness_problem": "1-awareness",
        "specific_trigger": "2-trigger",
        "identity_aspiration": "3-aspiration",
    }

    if tool_name == "perplexity_researcher":
        filename = f"00-research-{count:02d}-{tool_input.get('research_type', 'general')}"
    elif tool_name == "facebook_ads_creator":
        angle_key = tool_input.get("campaign_angle", f"angle-{count}")
        angle_label = angle_map.get(angle_key, angle_key)
        filename = f"01-facebook-ads"
        campaign_dir = campaign_dir / f"angle-{count}-{angle_label.split('-')[1]}"
    elif tool_name == "cold_outreach_generator":
        angle_key = tool_input.get("campaign_angle", f"angle-{count}")
        angle_label = angle_map.get(angle_key, angle_key)
        filename = f"02-cold-outreach"
        campaign_dir = campaign_dir / f"angle-{count}-{angle_label.split('-')[1]}"
    elif tool_name == "email_campaign_writer":
        seq_type = tool_input.get("sequence_type", "sequence")
        filename = f"03-email-{seq_type}-{count:02d}"
    elif tool_name == "content_calendar_planner":
        filename = "04-content-calendar"
    elif tool_name == "copywriting_assistant":
        medium = tool_input.get("medium", "copy").replace("_", "-")
        filename = f"05-copy-{medium}"
    elif tool_name == "campaign_report_generator":
        filename = "06-campaign-report"
    else:
        filename = f"{tool_name}-{count:02d}"

    campaign_dir.mkdir(parents=True, exist_ok=True)
    return campaign_dir / f"{filename}.md"


def save_output(file_path: Path, tool_name: str, tool_input: dict, content: str) -> None:
    """Save tool output as a markdown file with metadata header."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    header = f"---\ntool: {tool_name}\ngenerated: {timestamp}\n"
    for k, v in tool_input.items():
        if isinstance(v, (str, int, float, bool)):
            header += f"{k}: {v}\n"
    header += "---\n\n"

    file_path.write_text(header + content, encoding="utf-8")
    console.print(f"  [green]✓[/green] Saved: [dim]{file_path.relative_to(Path.cwd())}[/dim]")


# ─────────────────────────────────────────────────────────────
# Agentic Loop
# ─────────────────────────────────────────────────────────────

def build_campaign_brief(goal: str, industry: str, target: str, budget: float, campaign_name: str) -> str:
    """Build the initial user message / campaign brief."""
    return f"""# Marketing Campaign Brief

**Campaign Name:** {campaign_name}
**Goal:** {goal}
**Industry:** {industry}
**Target Audience:** {target}
**Total Budget:** SGD {budget:,.0f}
**Generated:** {datetime.now().strftime("%B %d, %Y")}

## Instructions

Execute a complete marketing campaign automatically using all available tools.
Follow the 3-angle campaign structure and execution order in your system instructions.
Do not pause or ask for approval between steps — run all tools to completion.

Start with Perplexity research to understand the market, then build all campaign assets.
Save everything to organised outputs. When done, provide a brief campaign summary.
"""


def run_campaign(goal: str, industry: str, target: str, budget: float, campaign_name: str) -> None:
    """Run the full marketing campaign agentic loop."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        console.print("[bold red]Error:[/bold red] ANTHROPIC_API_KEY not set. Copy .env.example to .env and add your key.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    # Load skill modules for context injection
    console.print("\n[bold cyan]Loading marketing skill modules...[/bold cyan]")
    skills_summary = load_all_relevant_skills()
    available = list_available_skills()
    console.print(f"  [green]✓[/green] {len(available)} skills loaded: {', '.join(available[:8])}{'...' if len(available) > 8 else ''}")

    # Pre-load tool-specific contexts
    skills_context = {tool: get_tool_context(tool) for tool in TOOL_HANDLERS.keys()}

    # Set up campaign output directory
    outputs_dir = Path("outputs") / campaign_name
    outputs_dir.mkdir(parents=True, exist_ok=True)
    _tool_call_counts.clear()

    console.print(Panel(
        f"[bold]Campaign:[/bold] {campaign_name}\n"
        f"[bold]Goal:[/bold] {goal}\n"
        f"[bold]Industry:[/bold] {industry}\n"
        f"[bold]Target:[/bold] {target}\n"
        f"[bold]Budget:[/bold] SGD {budget:,.0f}",
        title="[bold cyan]Marketing Agent — Starting Campaign[/bold cyan]",
        border_style="cyan"
    ))

    system = SYSTEM_PROMPT + f"\n\n## Loaded Marketing Skills\n\n{skills_summary}"
    messages = [{"role": "user", "content": build_campaign_brief(goal, industry, target, budget, campaign_name)}]

    tool_calls_made = 0
    loop_iterations = 0
    max_iterations = 25  # Safety limit

    console.print("\n[bold cyan]Running campaign (fully automatic)...[/bold cyan]\n")

    while loop_iterations < max_iterations:
        loop_iterations += 1

        with console.status(f"[cyan]Thinking... (iteration {loop_iterations})[/cyan]"):
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=8096,
                system=system,
                tools=ALL_TOOL_SCHEMAS,
                messages=messages
            )

        # Check if we're done
        if response.stop_reason == "end_turn":
            # Print final summary
            for block in response.content:
                if hasattr(block, "text"):
                    console.print("\n" + "─" * 60)
                    console.print(Markdown(block.text))
            break

        # Process tool calls
        tool_results = []
        has_tool_use = False

        for block in response.content:
            if block.type == "tool_use":
                has_tool_use = True
                tool_calls_made += 1
                tool_name = block.name
                tool_input = block.input

                console.print(f"\n[bold yellow]→ Tool:[/bold yellow] [bold]{tool_name}[/bold]")

                # Show key inputs
                if "campaign_angle" in tool_input:
                    console.print(f"  Angle: {tool_input['campaign_angle']}")
                if "research_type" in tool_input:
                    console.print(f"  Research: {tool_input['research_type']}")
                if "sequence_type" in tool_input:
                    console.print(f"  Sequence: {tool_input['sequence_type']}")

                # Execute tool
                with console.status(f"[cyan]Executing {tool_name}...[/cyan]"):
                    result = execute_tool(tool_name, tool_input, skills_context)

                # Save output
                out_path = get_output_path(outputs_dir, tool_name, tool_input)
                save_output(out_path, tool_name, tool_input, result)

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result
                })

        if not has_tool_use:
            # No tool calls but not end_turn — extract any text and break
            for block in response.content:
                if hasattr(block, "text") and block.text:
                    console.print(Markdown(block.text))
            break

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    # Generate PDFs
    console.print(f"\n[bold cyan]Generating PDFs...[/bold cyan]")
    pdfs = generate_pdfs(outputs_dir)
    if pdfs:
        console.print(f"  [green]✓[/green] {len(pdfs)} PDFs saved to {outputs_dir}/pdfs/")

    console.print(Panel(
        f"[green]Campaign complete![/green]\n\n"
        f"Tool calls made: {tool_calls_made}\n"
        f"Output directory: outputs/{campaign_name}/\n"
        f"PDFs generated: {len(pdfs)}",
        title="[bold green]Campaign Complete[/bold green]",
        border_style="green"
    ))


# ─────────────────────────────────────────────────────────────
# Single-Tool Mode
# ─────────────────────────────────────────────────────────────

def run_single_tool(tool_name: str, extra_args: dict) -> None:
    """Run a single tool with provided arguments."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        console.print(f"[red]Unknown tool: {tool_name}[/red]")
        console.print(f"Available tools: {', '.join(TOOL_HANDLERS.keys())}")
        sys.exit(1)

    skills_context_str = get_tool_context(tool_name)
    result = handler(extra_args, skills_context_str)
    console.print(Markdown(result))


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────

@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """Marketing Agent — AI-powered campaign generator for consulting & services businesses."""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


@cli.command()
@click.option("--goal", required=True, help="Primary campaign goal (e.g. 'Get 20 consulting clients')")
@click.option("--industry", required=True, help="Industry/niche (e.g. 'Financial Advisory')")
@click.option("--target", required=True, help="Target audience description")
@click.option("--budget", required=True, type=float, help="Total campaign budget in SGD")
@click.option("--campaign-name", required=True, help="Slug for output folder (e.g. 'advisory-q2-2026')")
def run(goal, industry, target, budget, campaign_name):
    """Run a full marketing campaign (all tools, 3 angles, fully automatic)."""
    run_campaign(goal, industry, target, budget, campaign_name)


@cli.command()
def skills():
    """List all installed marketing skill modules."""
    available = list_available_skills()
    table = Table(title="Installed Marketing Skills", border_style="cyan")
    table.add_column("Skill", style="bold")
    table.add_column("Path")
    for skill in available:
        table.add_row(skill, f".claude/skills/{skill}/SKILL.md")
    console.print(table)
    console.print(f"\n[green]{len(available)} skills installed.[/green]")


@cli.command()
def tools_list():
    """List all available marketing tools."""
    table = Table(title="Available Marketing Tools", border_style="cyan")
    table.add_column("Tool Name", style="bold")
    table.add_column("Description")
    for schema in ALL_TOOL_SCHEMAS:
        table.add_row(schema["name"], schema["description"][:80] + "...")
    console.print(table)


if __name__ == "__main__":
    cli()
