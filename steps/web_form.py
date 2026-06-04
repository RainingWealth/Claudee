from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from pathlib import Path

from playwright.async_api import Page, async_playwright

import config
from models import CalendarConfig, ExtractedData, FieldMapping, FormConfig, LoginConfig

logger = logging.getLogger(__name__)


async def run_browser_workflow(
    data: ExtractedData,
    login_cfg: LoginConfig | None = None,
    form_cfg: FormConfig | None = None,
    calendar_cfg: CalendarConfig | None = None,
) -> tuple[bool, str, str | None]:
    login_cfg = login_cfg or config.get_login_config()
    form_cfg = form_cfg or config.get_form_config()
    calendar_cfg = calendar_cfg or config.get_calendar_config()

    screenshot_path = None

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=config.HEADLESS)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await login(page, login_cfg)
            await fill_form(page, data, form_cfg, calendar_cfg)
            screenshot_path = await take_screenshot(page)
            await submit_form(page, form_cfg.submit_selector)
            confirmation = await get_confirmation(page)
            return True, confirmation, screenshot_path
        except Exception as e:
            logger.exception("Browser workflow failed")
            error_screenshot = await take_screenshot(page, suffix="error")
            return False, str(e), error_screenshot
        finally:
            await browser.close()


async def login(page: Page, cfg: LoginConfig) -> None:
    logger.info("Navigating to login page: %s", cfg.url)
    await page.goto(cfg.url, wait_until="networkidle")
    await page.fill(cfg.username_selector, config.WEBSITE_USERNAME)
    await page.fill(cfg.password_selector, config.WEBSITE_PASSWORD)
    await page.click(cfg.submit_selector)
    await page.wait_for_load_state("networkidle")
    logger.info("Login completed")


async def fill_form(
    page: Page,
    data: ExtractedData,
    form_cfg: FormConfig,
    calendar_cfg: CalendarConfig,
) -> None:
    logger.info("Navigating to form: %s", form_cfg.url)
    await page.goto(form_cfg.url, wait_until="networkidle")

    for field in form_cfg.fields:
        value = data.get(field.pdf_key)
        if not value:
            logger.warning("No value found for PDF key: %s", field.pdf_key)
            continue

        if field.type == "calendar":
            await handle_calendar(page, calendar_cfg, value)
        elif field.type == "select":
            await page.select_option(field.selector, value)
        elif field.type == "checkbox":
            if value.lower() in ("true", "yes", "1", "checked"):
                await page.check(field.selector)
        else:
            await page.fill(field.selector, value)

        logger.info("Filled field %s = %s", field.pdf_key, value)


async def handle_calendar(page: Page, cfg: CalendarConfig, date_str: str) -> None:
    target = _parse_date(date_str, cfg.date_format)
    logger.info("Setting calendar date to: %s", target)

    await page.click(cfg.trigger_selector)
    await asyncio.sleep(0.5)

    for _ in range(24):
        header_text = await page.text_content(cfg.month_year_selector) or ""
        current = _parse_month_year(header_text)
        if current is None:
            break

        if current.year == target.year and current.month == target.month:
            break

        if current < target.replace(day=1):
            await page.click(cfg.next_month_selector)
        else:
            await page.click(cfg.prev_month_selector)
        await asyncio.sleep(0.3)

    day_selector = cfg.day_selector_template.format(day=target.day)
    await page.click(day_selector)
    logger.info("Calendar date selected: %s", target)


async def submit_form(page: Page, submit_selector: str) -> None:
    await page.click(submit_selector)
    await page.wait_for_load_state("networkidle")
    logger.info("Form submitted")


async def get_confirmation(page: Page) -> str:
    await asyncio.sleep(1)
    return await page.text_content("body") or "Form submitted (no confirmation text found)"


async def take_screenshot(page: Page, suffix: str = "result") -> str:
    path = str(Path(config.BASE_DIR) / f"screenshot_{suffix}.png")
    await page.screenshot(path=path, full_page=True)
    return path


def _parse_date(date_str: str, fmt: str) -> datetime:
    for f in [fmt, "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"]:
        try:
            return datetime.strptime(date_str.strip(), f)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {date_str}")


def _parse_month_year(text: str) -> datetime | None:
    import calendar as cal

    text = text.strip()
    for fmt in ["%B %Y", "%b %Y", "%m/%Y"]:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None
