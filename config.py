from __future__ import annotations

import os
import re
from pathlib import Path

import yaml
from dotenv import load_dotenv

from models import CalendarConfig, FieldMapping, FormConfig, LoginConfig

load_dotenv()

BASE_DIR = Path(__file__).parent


def _resolve_env_vars(value: str) -> str:
    def replacer(match: re.Match) -> str:
        var_name = match.group(1)
        return os.getenv(var_name, match.group(0))
    return re.sub(r"\$\{(\w+)}", replacer, value)


def _resolve_dict(d: dict) -> dict:
    resolved = {}
    for k, v in d.items():
        if isinstance(v, str):
            resolved[k] = _resolve_env_vars(v)
        elif isinstance(v, dict):
            resolved[k] = _resolve_dict(v)
        elif isinstance(v, list):
            resolved[k] = [_resolve_dict(i) if isinstance(i, dict) else i for i in v]
        else:
            resolved[k] = v
    return resolved


def load_form_config(path: Path | None = None) -> dict:
    config_path = path or BASE_DIR / "form_config.yaml"
    with open(config_path) as f:
        raw = yaml.safe_load(f)
    return _resolve_dict(raw)


def get_login_config(config: dict | None = None) -> LoginConfig:
    config = config or load_form_config()
    return LoginConfig(**config["login"])


def get_form_config(config: dict | None = None) -> FormConfig:
    config = config or load_form_config()
    form = config["form"]
    return FormConfig(
        url=form["url"],
        fields=[FieldMapping(**f) for f in form["fields"]],
        submit_selector=form["submit_selector"],
    )


def get_calendar_config(config: dict | None = None) -> CalendarConfig:
    config = config or load_form_config()
    return CalendarConfig(**config["calendar"])


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
WEBSITE_URL = os.getenv("WEBSITE_URL", "")
WEBSITE_USERNAME = os.getenv("WEBSITE_USERNAME", "")
WEBSITE_PASSWORD = os.getenv("WEBSITE_PASSWORD", "")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
