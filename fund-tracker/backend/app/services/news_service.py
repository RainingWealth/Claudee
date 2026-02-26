"""News fetching and storage service.

Primary source: Google News RSS via feedparser (no API key required).
Fallback: NewsAPI.org (requires NEWSAPI_KEY env var).
Optional: OpenAI summarisation (requires OPENAI_API_KEY).
"""
import html
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote

import feedparser
import httpx
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.fund import Fund, FundHolding
from ..models.news import NewsItem
from .audit_service import write_audit

logger = logging.getLogger(__name__)

MAX_ITEMS_PER_FUND = 10
NEWS_CACHE_HOURS = 6


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return " ".join(text.split())


def _first_two_sentences(text: str) -> str:
    """Return the first two sentences of a text block."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(sentences[:2])


def _build_search_query(fund: Fund, top_holdings: list[str]) -> str:
    terms = []
    if fund.ticker:
        terms.append(fund.ticker)
    if fund.name:
        terms.append(f'"{fund.name}"')
    for h in top_holdings[:2]:
        terms.append(h)
    return " OR ".join(terms[:4])


def _is_cache_fresh(db: Session, fund_id: int) -> bool:
    """Return True if news was fetched within NEWS_CACHE_HOURS."""
    cutoff = datetime.utcnow() - timedelta(hours=NEWS_CACHE_HOURS)
    latest = (
        db.query(NewsItem.fetched_at)
        .filter(NewsItem.fund_id == fund_id)
        .order_by(NewsItem.fetched_at.desc())
        .first()
    )
    if latest and latest.fetched_at > cutoff:
        return True
    return False


def _fetch_from_google_news(query: str) -> list[dict]:
    """Fetch news items from Google News RSS."""
    encoded = quote(query)
    url = (
        f"https://news.google.com/rss/search"
        f"?q={encoded}&hl=en-US&gl=US&ceid=US:en"
    )
    try:
        feed = feedparser.parse(url, agent="FundTracker/1.0")
        items = []
        for entry in feed.entries[:15]:
            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    import calendar
                    ts = calendar.timegm(entry.published_parsed)
                    published_at = datetime.utcfromtimestamp(ts)
                except Exception:
                    pass

            raw_summary = getattr(entry, "summary", "") or ""
            clean = _strip_html(raw_summary)
            summary = _first_two_sentences(clean) if clean else None

            source_name = None
            if hasattr(entry, "source") and isinstance(entry.source, dict):
                source_name = entry.source.get("title")

            items.append({
                "title": getattr(entry, "title", ""),
                "url": getattr(entry, "link", ""),
                "source_name": source_name,
                "published_at": published_at,
                "summary": summary,
            })
        return items
    except Exception as exc:
        logger.warning("Google News RSS fetch failed: %s", exc)
        return []


def _fetch_from_newsapi(query: str, api_key: str) -> list[dict]:
    """Fetch news from NewsAPI.org (requires API key)."""
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "sortBy": "publishedAt",
                    "pageSize": 15,
                    "language": "en",
                    "apiKey": api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            items = []
            for article in data.get("articles", []):
                pub = article.get("publishedAt")
                published_at = None
                if pub:
                    try:
                        published_at = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                        published_at = published_at.replace(tzinfo=None)
                    except Exception:
                        pass
                items.append({
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "source_name": article.get("source", {}).get("name"),
                    "published_at": published_at,
                    "summary": _first_two_sentences(article.get("description") or ""),
                })
            return items
    except Exception as exc:
        logger.warning("NewsAPI fetch failed: %s", exc)
        return []


def _summarise_with_llm(title: str, url: str, summary: str, api_key: str) -> str:
    """Optionally call OpenAI gpt-4o-mini for a 1-sentence summary."""
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                f"Summarise this financial news in one sentence. "
                                f"Keep factual, no speculation. "
                                f"Title: {title}\nExcerpt: {summary}"
                            ),
                        }
                    ],
                    "max_tokens": 80,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.debug("LLM summarisation failed: %s", exc)
        return summary  # fall back to RSS excerpt


def fetch_and_store_news(
    db: Session, fund: Fund, force_refresh: bool = False
) -> tuple[int, int]:
    """Fetch news for a fund and store new items in the DB.

    Args:
        db: database session
        fund: Fund ORM object
        force_refresh: skip cache check if True

    Returns:
        (total_fetched, new_items_stored) tuple
    """
    if not force_refresh and _is_cache_fresh(db, fund.id):
        existing = (
            db.query(NewsItem).filter(NewsItem.fund_id == fund.id).count()
        )
        return existing, 0

    settings = get_settings()

    # Get top holding names for better query
    top_holdings = (
        db.query(FundHolding.holding_name)
        .filter(FundHolding.fund_id == fund.id)
        .order_by(FundHolding.weight.desc())
        .limit(3)
        .all()
    )
    holding_names = [h.holding_name for h in top_holdings]

    query = _build_search_query(fund, holding_names)
    logger.info("Fetching news for fund %d with query: %s", fund.id, query)

    # Fetch from primary source
    raw_items = _fetch_from_google_news(query)

    # Fallback to NewsAPI if configured and primary returned nothing
    if not raw_items and settings.NEWSAPI_KEY:
        raw_items = _fetch_from_newsapi(query, settings.NEWSAPI_KEY)

    # Existing URLs to avoid duplicates
    existing_urls = {
        row.url
        for row in db.query(NewsItem.url).filter(NewsItem.fund_id == fund.id).all()
    }

    now = datetime.utcnow()
    new_count = 0
    stored = 0

    for item in raw_items:
        if stored >= MAX_ITEMS_PER_FUND:
            break
        if not item["url"] or item["url"] in existing_urls:
            continue

        summary = item.get("summary") or ""
        if settings.OPENAI_API_KEY and summary:
            summary = _summarise_with_llm(
                item["title"], item["url"], summary, settings.OPENAI_API_KEY
            )

        news_item = NewsItem(
            fund_id=fund.id,
            title=item["title"][:499] if item["title"] else "Untitled",
            url=item["url"][:1999],
            source_name=item.get("source_name"),
            published_at=item.get("published_at"),
            summary=summary[:2000] if summary else None,
            fetched_at=now,
        )
        db.add(news_item)
        existing_urls.add(item["url"])
        new_count += 1
        stored += 1

    db.commit()

    write_audit(
        db,
        event_type="news_fetch",
        fund_id=fund.id,
        detail={"fetched": len(raw_items), "new": new_count, "source": "google_news"},
        status="success",
    )

    total = db.query(NewsItem).filter(NewsItem.fund_id == fund.id).count()
    return total, new_count


def get_news_for_fund(
    db: Session, fund_id: int, limit: int = MAX_ITEMS_PER_FUND
) -> list[NewsItem]:
    """Return stored news items for a fund, sorted newest first."""
    return (
        db.query(NewsItem)
        .filter(NewsItem.fund_id == fund_id)
        .order_by(NewsItem.published_at.desc().nullslast(), NewsItem.fetched_at.desc())
        .limit(limit)
        .all()
    )
