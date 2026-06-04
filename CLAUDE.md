# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

An AI-powered **Marketing Agent** for consulting and professional services businesses.

The agent autonomously generates complete marketing campaigns using:
- **29 installed marketing skill modules** (paid-ads, cold-email, email-sequence, copywriting, social-content, marketing-psychology, analytics-tracking, etc.)
- **3-angle campaign structure** (awareness/problem → specific trigger → identity/aspiration)
- **Claude claude-sonnet-4-6** via the Anthropic API for all content generation
- **Perplexity API** for real-time market research

Each campaign produces: Facebook/Meta ads, cold call scripts, WhatsApp follow-up sequences, email nurture sequences, social media content calendar, landing page copy, and a full KPI/tracking report — all saved as markdown files with optional PDF export.

## Development Setup

### Prerequisites

- Python 3.11+
- pip
- Anthropic API key
- Perplexity API key (optional — enables live market research)

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure API Keys

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and PERPLEXITY_API_KEY
```

## Common Commands

### Run a Full Marketing Campaign

```bash
python marketing_agent.py run \
  --goal "Get 20 high-ticket consulting clients" \
  --industry "Financial Advisory" \
  --target "Mid-career professionals aged 35-50" \
  --budget 5000 \
  --campaign-name "advisory-q2-2026"
```

### List Installed Marketing Skills

```bash
python marketing_agent.py skills
```

### List Available Tools

```bash
python marketing_agent.py tools-list
```

### Get Help

```bash
python marketing_agent.py --help
python marketing_agent.py run --help
```

## Project Structure

```
.
├── marketing_agent.py           # Main CLI entry point + agentic loop
├── lib/
│   ├── skills_loader.py         # Reads .claude/skills/*/SKILL.md at startup
│   └── pdf_generator.py         # WeasyPrint PDF export
├── tools/
│   ├── __init__.py              # Tool registry (schemas + dispatch)
│   ├── facebook_ads.py          # Facebook/Meta ad campaign generator
│   ├── perplexity_research.py   # Perplexity API market research
│   ├── cold_outreach.py         # Cold call scripts + WhatsApp sequences
│   ├── email_campaigns.py       # Email nurture/sales sequences
│   ├── content_calendar.py      # 4-week social media content calendar
│   ├── copywriting.py           # AIDA/PAS/BAB copywriting framework
│   └── campaign_reports.py      # Campaign KPIs, A/B tests, tracking setup
├── .claude/
│   ├── hooks/
│   │   └── session-start.sh     # Auto-installs dependencies + 29 marketing skills
│   ├── settings.json            # Claude Code settings
│   └── skills/                  # 29 marketing skill modules (auto-installed)
├── requirements.txt
├── .env.example                 # API key template
├── .gitignore
└── outputs/                     # Generated campaign files (gitignored)
    └── {campaign-name}/
        ├── 00-research-*.md
        ├── angle-1-awareness/
        │   ├── 01-facebook-ads.md
        │   └── 02-cold-outreach.md
        ├── angle-2-trigger/  ...
        ├── angle-3-aspiration/  ...
        ├── 03-email-*.md
        ├── 04-content-calendar.md
        ├── 05-copy-*.md
        ├── 06-campaign-report.md
        └── pdfs/                # PDF versions of all files
```

## Architecture & Key Conventions

### Agentic Loop
`marketing_agent.py` runs a while loop calling the Claude API with `tools`. The agent decides which tools to call and in what order. The loop exits when `stop_reason == "end_turn"`.

### Skills Injection
`lib/skills_loader.py` reads `.claude/skills/*/SKILL.md` at startup and injects relevant methodology into each tool's handler prompt. The agent's Facebook ads use `paid-ads/SKILL.md`, cold scripts use `cold-email/SKILL.md`, etc.

### Tool Pattern
Each tool in `tools/` exports:
- `TOOL_SCHEMA` — JSON schema for the Claude API `tools` list
- `handle_*()` — Handler that receives `(tool_input: dict, skills_context: str)` and returns `str`

### Output Structure
Every tool call saves a `.md` file to `outputs/{campaign-name}/`. Files are prefixed with numbers for ordering. PDFs are generated at the end using WeasyPrint.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key for all content generation | Yes |
| `PERPLEXITY_API_KEY` | Perplexity API key for live market research | Recommended |

## Notes for Claude

- Always run `python marketing_agent.py skills` first to verify skill modules are loaded
- The 29 skills in `.claude/skills/` are auto-installed by `session-start.sh` on remote sessions
- Campaign outputs are gitignored — check `outputs/` directory locally
- When adding new tools: add the schema + handler to `tools/`, then register in `tools/__init__.py`
- Perplexity research falls back gracefully if API key is missing
- WeasyPrint requires system dependencies on Linux: `apt-get install -y libpango-1.0-0 libcairo2`
- Keep commits focused and atomic
- Follow existing code style and conventions
