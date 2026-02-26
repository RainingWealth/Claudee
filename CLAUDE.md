# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

<!-- TODO: Add a brief description of your project here -->

## Development Setup

<!-- TODO: Add any setup instructions specific to your project -->

### Prerequisites

<!-- List any tools, runtimes, or services required -->

## Common Commands

### Install Dependencies

<!-- Add the command(s) to install project dependencies -->
```bash
# Example: npm install
# Example: pip install -r requirements.txt
# Example: bundle install
```

### Run Tests

<!-- Add the command to run the test suite -->
```bash
# Example: npm test
# Example: pytest
# Example: go test ./...
```

### Run Linter / Formatter

<!-- Add the command to lint or format code -->
```bash
# Example: npm run lint
# Example: ruff check .
# Example: golangci-lint run
```

### Build

<!-- Add the command to build the project, if applicable -->
```bash
# Example: npm run build
# Example: go build ./...
```

## Project Structure

<!-- TODO: Describe the key directories and files -->

```
.
├── .claude/
│   ├── hooks/
│   │   └── session-start.sh   # Auto-installs dependencies on session start
│   └── settings.json          # Claude Code settings
└── CLAUDE.md                  # This file
```

## Architecture & Key Conventions

<!-- TODO: Document important architectural decisions, patterns, or conventions -->

## Environment Variables

<!-- TODO: List any required or optional environment variables -->

| Variable | Description | Default |
|----------|-------------|---------|
| `EXAMPLE_VAR` | Description of the variable | `default_value` |

## Notes for Claude

- Always run tests after making changes
- Keep commits focused and atomic
- Follow existing code style and conventions
- When in doubt, prefer clarity over cleverness
