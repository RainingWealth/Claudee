# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Multi-agent marketing system powered by Claude. A Marketing Director (orchestrator) delegates to 4 specialist agents: Content Writer, Social Media Manager, Market Researcher, and Sales Coach (Lusi + NEPQ methodology).

## Development Setup

### Prerequisites
- Python 3.10+
- Anthropic API key (`ANTHROPIC_API_KEY` environment variable)

## Common Commands

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run (Interactive)
```bash
python main.py
```

### Run (One-shot)
```bash
python main.py "Your marketing request here"
```

### LinkedIn DM Outreach (Interactive)
```bash
python linkedin_outreach.py
```

### LinkedIn DM Outreach (One-shot)
```bash
python linkedin_outreach.py "DM sequence for a CFO who attended my workshop"
```

### Syntax Check
```bash
python -c "from agents.orchestrator import Orchestrator; print('OK')"
```

## Project Structure

```
.
├── main.py                       # CLI entry point (interactive + one-shot)
├── linkedin_outreach.py          # LinkedIn DM generator (interactive + one-shot)
├── requirements.txt              # anthropic>=0.52.0
├── agents/
│   ├── __init__.py
│   ├── base.py                   # BaseAgent with agentic loop + knowledge loading
│   ├── orchestrator.py           # Marketing Director (Opus) + delegation tools
│   ├── content_writer.py         # Blog posts, copy, emails, ads (Sonnet)
│   ├── social_media_manager.py   # Platform strategies, engagement (Sonnet)
│   ├── market_researcher.py      # Competitor/trend/audience analysis (Sonnet)
│   ├── sales_coach.py            # Lusi SAPT/IBCT/HNW + NEPQ system (Sonnet)
│   └── linkedin_dm_writer.py     # LinkedIn DM outreach sequences (Sonnet)
├── tools/
│   ├── __init__.py
│   ├── web.py                    # Server-side web_search + web_fetch definitions
│   └── linkedin_dm.py            # Prospect types, DM sequences, campaign triggers
├── knowledge/                    # Drop .md/.txt files here for agent context
│   ├── README.md
│   └── references/               # Sales methodology docs (loaded by Sales Coach)
└── CLAUDE.md
```

## Architecture & Key Conventions

- **Orchestrator pattern**: Marketing Director (Opus 4.6) analyzes requests and delegates to specialist agents (Sonnet 4.6) via tool_use
- **Server-side web tools**: web_search and web_fetch are handled by Anthropic — no API keys needed
- **Agentic loop**: BaseAgent handles end_turn, pause_turn, and tool_use stop reasons with max 20 iterations
- **Knowledge injection**: All .md/.txt files in `knowledge/` are loaded into agent system prompts at startup
- **Sales methodology**: All agents share core sales psychology principles; Sales Coach has full Lusi + NEPQ system
- **Streaming**: Orchestrator uses streaming to prevent HTTP timeouts on long multi-agent runs

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (required) | — |

## Notes for Claude

- Keep commits focused and atomic
- Follow existing code style and conventions
- When in doubt, prefer clarity over cleverness
