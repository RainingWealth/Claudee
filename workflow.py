from __future__ import annotations

import logging

from telegram import Bot

from models import WorkflowResult
from steps.notify import send_result
from steps.pdf_extract import extract_from_pdf
from steps.web_form import run_browser_workflow

logger = logging.getLogger(__name__)


async def run_workflow(pdf_path: str, chat_id: int, bot: Bot) -> WorkflowResult:
    try:
        logger.info("Starting workflow for: %s", pdf_path)

        logger.info("Step 1: Extracting data from PDF")
        data = extract_from_pdf(pdf_path)
        logger.info("Extracted %d fields: %s", len(data.raw_fields), list(data.raw_fields.keys()))

        if not data.raw_fields:
            result = WorkflowResult(
                success=False,
                message="No data could be extracted from the PDF.",
                extracted_data={},
            )
            await send_result(bot, chat_id, result.success, result.message)
            return result

        logger.info("Step 2: Browser automation (login + form fill)")
        success, message, screenshot = await run_browser_workflow(data)

        result = WorkflowResult(
            success=success,
            message=message,
            extracted_data=data.raw_fields,
            screenshot_path=screenshot,
        )

        logger.info("Step 3: Sending results to Telegram")
        await send_result(
            bot, chat_id,
            result.success,
            result.message,
            result.extracted_data,
            result.screenshot_path,
        )

        return result

    except Exception as e:
        logger.exception("Workflow failed with unexpected error")
        error_result = WorkflowResult(
            success=False,
            message=f"Unexpected error: {e}",
            error=str(e),
        )
        await send_result(bot, chat_id, False, str(e))
        return error_result
