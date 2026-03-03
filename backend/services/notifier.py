import os
from datetime import datetime
from typing import Optional

try:
    from telegram import Bot
except ImportError:
    Bot = None  # type: ignore

INTERNAL_GROUP_ID: Optional[str] = os.getenv("INTERNAL_GROUP_ID")
BOT_TOKEN: Optional[str] = os.getenv("TELEGRAM_BOT_TOKEN")


async def send_internal(message: str) -> None:
    """Send message to INTERNAL_GROUP_ID."""
    if not BOT_TOKEN or not INTERNAL_GROUP_ID or Bot is None:
        return
    bot = Bot(token=BOT_TOKEN)
    await bot.send_message(chat_id=INTERNAL_GROUP_ID, text=message)


async def send_customer(customer_id: int, message: str, db) -> None:
    """Send message to customer's telegram_group_id."""
    if not BOT_TOKEN or Bot is None:
        return
    from models.customer import Customer

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer or not customer.telegram_group_id:
        return
    bot = Bot(token=BOT_TOKEN)
    await bot.send_message(chat_id=customer.telegram_group_id, text=message)


# ---------- message formatters ----------


def _now_str() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")


def format_lost_internal(lost_backlinks: list) -> str:
    """
    ⚠️ BACKLINK LOST
    📅 DD/MM/YYYY HH:MM

    👤 Customer Name (N links)
    1. domain.com | "anchor" | 500,000 VND

    💸 Total affected: X VND/month
    """
    by_customer: dict = {}
    for bl in lost_backlinks:
        cname = bl.get("customer_name", "Unknown")
        by_customer.setdefault(cname, []).append(bl)

    lines = [f"⚠️ BACKLINK LOST", f"📅 {_now_str()}", ""]
    total = 0
    for cname, links in by_customer.items():
        lines.append(f"👤 {cname} ({len(links)} links)")
        for i, bl in enumerate(links, 1):
            price = int(bl.get("price_monthly", 0) or 0)
            total += price
            anchor = bl.get("anchor_text") or ""
            lines.append(
                f"{i}. {bl.get('domain', '')} | \"{anchor}\" | {price:,} VND"
            )
        lines.append("")
    lines.append(f"💸 Total affected: {total:,} VND/month")
    return "\n".join(lines)


def format_lost_customer(lost_backlinks: list) -> str:
    """
    ⚠️ BACKLINK LOST
    📅 DD/MM/YYYY HH:MM

    1. domain.com

    We are checking and will resolve this shortly!
    """
    lines = [f"⚠️ BACKLINK LOST", f"📅 {_now_str()}", ""]
    for i, bl in enumerate(lost_backlinks, 1):
        lines.append(f"{i}. {bl.get('domain', '')}")
    lines.extend(["", "We are checking and will resolve this shortly!"])
    return "\n".join(lines)


def format_live_internal(recovered_backlinks: list) -> str:
    """
    ✅ BACKLINK RECOVERED
    📅 DD/MM/YYYY HH:MM

    👤 Customer Name (N links)
    1. domain.com | "anchor" | 500,000 VND

    💰 Total recovered: X VND/month
    """
    by_customer: dict = {}
    for bl in recovered_backlinks:
        cname = bl.get("customer_name", "Unknown")
        by_customer.setdefault(cname, []).append(bl)

    lines = [f"✅ BACKLINK RECOVERED", f"📅 {_now_str()}", ""]
    total = 0
    for cname, links in by_customer.items():
        lines.append(f"👤 {cname} ({len(links)} links)")
        for i, bl in enumerate(links, 1):
            price = int(bl.get("price_monthly", 0) or 0)
            total += price
            anchor = bl.get("anchor_text") or ""
            lines.append(
                f"{i}. {bl.get('domain', '')} | \"{anchor}\" | {price:,} VND"
            )
        lines.append("")
    lines.append(f"💰 Total recovered: {total:,} VND/month")
    return "\n".join(lines)


def format_live_customer(recovered_backlinks: list) -> str:
    """
    ✅ BACKLINK RECOVERED
    📅 DD/MM/YYYY HH:MM

    1. domain.com
    """
    lines = [f"✅ BACKLINK RECOVERED", f"📅 {_now_str()}", ""]
    for i, bl in enumerate(recovered_backlinks, 1):
        lines.append(f"{i}. {bl.get('domain', '')}")
    return "\n".join(lines)


def format_inactive_still_live(backlinks: list) -> str:
    """
    💡 LINK HAS NOT BEEN REMOVED
    📅 DD/MM/YYYY HH:MM

    👤 Customer Name
    1. domain.com | "anchor" | 500,000 VND | expired DD/MM/YYYY

    👉 These links still exist — consider contacting customer to renew!
    """
    by_customer: dict = {}
    for bl in backlinks:
        cname = bl.get("customer_name", "Unknown")
        by_customer.setdefault(cname, []).append(bl)

    lines = [f"💡 LINK HAS NOT BEEN REMOVED", f"📅 {_now_str()}", ""]
    for cname, links in by_customer.items():
        lines.append(f"👤 {cname}")
        for i, bl in enumerate(links, 1):
            price = int(bl.get("price_monthly", 0) or 0)
            anchor = bl.get("anchor_text") or ""
            expiry = bl.get("date_payment")
            expiry_str = (
                expiry.strftime("%d/%m/%Y")
                if hasattr(expiry, "strftime")
                else str(expiry or "N/A")
            )
            lines.append(
                f"{i}. {bl.get('domain', '')} | \"{anchor}\" | {price:,} VND"
                f" | expired {expiry_str}"
            )
        lines.append("")
    lines.append(
        "👉 These links still exist — consider contacting customer to renew!"
    )
    return "\n".join(lines)


def format_website_die(websites: list) -> str:
    """
    🔴 WEBSITE CANNOT BE ACCESSED
    📅 DD/MM/YYYY HH:MM

    1. domain.com → HTTP 503

    ⚠️ Backlinks on these domains are temporarily NOT updated!
    """
    lines = [f"🔴 WEBSITE CANNOT BE ACCESSED", f"📅 {_now_str()}", ""]
    for i, w in enumerate(websites, 1):
        error = w.get("error") or "Unknown"
        lines.append(f"{i}. {w.get('domain', '')} → {error}")
    lines.extend(
        ["", "⚠️ Backlinks on these domains are temporarily NOT updated!"]
    )
    return "\n".join(lines)


def format_website_alive(websites: list) -> str:
    """
    ✅ WEBSITE IS BACK ONLINE
    📅 DD/MM/YYYY HH:MM

    1. domain.com

    👉 System continues crawling normally!
    """
    lines = [f"✅ WEBSITE IS BACK ONLINE", f"📅 {_now_str()}", ""]
    for i, w in enumerate(websites, 1):
        lines.append(f"{i}. {w.get('domain', '')}")
    lines.extend(["", "👉 System continues crawling normally!"])
    return "\n".join(lines)
