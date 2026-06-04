from __future__ import annotations

from pathlib import Path

from telegram import Bot


def format_result(success: bool, message: str, extracted_data: dict[str, str] | None = None) -> str:
    parts: list[str] = []

    if success:
        parts.append("Workflow completed successfully.")
    else:
        parts.append("Workflow failed.")

    if extracted_data:
        parts.append("\nExtracted fields:")
        for key, value in extracted_data.items():
            parts.append(f"  {key}: {value}")

    parts.append(f"\n{message}")
    return "\n".join(parts)


async def send_result(
    bot: Bot,
    chat_id: int,
    success: bool,
    message: str,
    extracted_data: dict[str, str] | None = None,
    screenshot_path: str | None = None,
) -> None:
    text = format_result(success, message, extracted_data)
    await bot.send_message(chat_id=chat_id, text=text)

    if screenshot_path and Path(screenshot_path).exists():
        with open(screenshot_path, "rb") as photo:
            await bot.send_photo(chat_id=chat_id, photo=photo, caption="Form submission screenshot")
