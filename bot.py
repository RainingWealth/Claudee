from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

import config
from workflow import run_workflow

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

_running_workflows: set[int] = set()


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Hello! Send me a PDF and I'll:\n"
        "1. Extract the data from it\n"
        "2. Fill in the web form automatically\n"
        "3. Send you the results\n\n"
        "Commands:\n"
        "/start - Show this message\n"
        "/status - Check if a workflow is running"
    )


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    if chat_id in _running_workflows:
        await update.message.reply_text("A workflow is currently running. Please wait.")
    else:
        await update.message.reply_text("No workflow running. Send a PDF to start one.")


async def handle_pdf(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id

    if chat_id in _running_workflows:
        await update.message.reply_text("A workflow is already running. Please wait for it to finish.")
        return

    document = update.message.document
    if not document.file_name.lower().endswith(".pdf"):
        await update.message.reply_text("Please send a PDF file.")
        return

    _running_workflows.add(chat_id)
    try:
        await update.message.reply_text(f"Received: {document.file_name}\nProcessing...")

        file = await context.bot.get_file(document.file_id)
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            await file.download_to_drive(tmp.name)
            pdf_path = tmp.name

        result = await run_workflow(pdf_path, chat_id, context.bot)

        Path(pdf_path).unlink(missing_ok=True)

        if result.success:
            logger.info("Workflow completed successfully for chat %s", chat_id)
        else:
            logger.warning("Workflow failed for chat %s: %s", chat_id, result.error or result.message)

    except Exception as e:
        logger.exception("Unhandled error in PDF handler")
        await update.message.reply_text(f"An error occurred: {e}")
    finally:
        _running_workflows.discard(chat_id)


def main() -> None:
    if not config.TELEGRAM_BOT_TOKEN:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN not set. "
            "Create a bot via @BotFather on Telegram and add the token to .env"
        )

    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_pdf))

    logger.info("Bot started. Waiting for PDFs...")
    app.run_polling()


if __name__ == "__main__":
    main()
