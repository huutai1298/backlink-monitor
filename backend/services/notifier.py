import os
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    from telegram import Bot
except ImportError:
    Bot = None  # type: ignore

from models.notification_log import NotificationLog
from models.customer import Customer

INTERNAL_GROUP_ID: Optional[str] = os.getenv("INTERNAL_GROUP_ID")
BOT_TOKEN: Optional[str] = os.getenv("TELEGRAM_BOT_TOKEN")

_bot: Optional[object] = None


def _get_bot():
    global _bot
    if _bot is None and BOT_TOKEN and Bot is not None:
        _bot = Bot(token=BOT_TOKEN)
    return _bot


async def send_internal(message: str, db=None, log_id: int = None) -> int | None:
    """Send message to INTERNAL_GROUP_ID. Returns telegram message_id."""
    bot = _get_bot()
    if bot is None or not INTERNAL_GROUP_ID:
        return None
    sent = await bot.send_message(chat_id=INTERNAL_GROUP_ID, text=message)
    if db and log_id and sent:
        log = db.query(NotificationLog).filter(NotificationLog.id == log_id).first()
        if log:
            log.telegram_message_id = sent.message_id
            log.telegram_chat_id = str(INTERNAL_GROUP_ID)
            db.commit()
    return sent.message_id if sent else None


async def send_customer(customer_id: int, message: str, db, log_id: int = None) -> int | None:
    """Send message to customer's telegram_group_id. Returns telegram message_id."""
    bot = _get_bot()
    if bot is None:
        return None

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer or not customer.telegram_group_id:
        return None
    sent = await bot.send_message(chat_id=customer.telegram_group_id, text=message)
    if sent and log_id:
        log = db.query(NotificationLog).filter(NotificationLog.id == log_id).first()
        if log:
            log.telegram_message_id = sent.message_id
            log.telegram_chat_id = str(customer.telegram_group_id)
            db.commit()
    return sent.message_id if sent else None


# ---------- message formatters ----------


_VN_TZ = timezone(timedelta(hours=7))


def _now_str() -> str:
    return datetime.now(_VN_TZ).strftime("%d/%m/%Y %H:%M")


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

    lines = [f"⚠️ BACKLINK MẤT", f"📅 {_now_str()}", ""]
    total = 0
    for cname, links in by_customer.items():
        lines.append(f"👤 {cname} ({len(links)} link)")
        for i, bl in enumerate(links, 1):
            price = int(bl.get("price_monthly", 0) or 0)
            total += price
            anchor = bl.get("anchor_text") or ""
            lines.append(
                f"{i}. {bl.get('domain', '')} | \"{anchor}\" | {price:,} VND"
            )
        lines.append("")
    lines.append(f"💸 Tổng ảnh hưởng: {total:,} VND/tháng")
    return "\n".join(lines)


def format_lost_customer(lost_backlinks: list) -> str:
    """
    ⚠️ BACKLINK LOST
    📅 DD/MM/YYYY HH:MM

    1. domain.com

    We are checking and will resolve this shortly!
    """
    lines = [f"⚠️ BACKLINK MẤT", f"📅 {_now_str()}", ""]
    for i, bl in enumerate(lost_backlinks, 1):
        lines.append(f"{i}. {bl.get('domain', '')}")
    lines.extend(["", "Chúng tôi đang kiểm tra và sẽ xử lý sớm!"])
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

    lines = [f"✅ BACKLINK PHỤC HỒI", f"📅 {_now_str()}", ""]
    total = 0
    for cname, links in by_customer.items():
        lines.append(f"👤 {cname} ({len(links)} link)")
        for i, bl in enumerate(links, 1):
            price = int(bl.get("price_monthly", 0) or 0)
            total += price
            anchor = bl.get("anchor_text") or ""
            lines.append(
                f"{i}. {bl.get('domain', '')} | \"{anchor}\" | {price:,} VND"
            )
        lines.append("")
    lines.append(f"💰 Tổng phục hồi: {total:,} VND/tháng")
    return "\n".join(lines)


def format_live_customer(recovered_backlinks: list) -> str:
    """
    ✅ BACKLINK RECOVERED
    📅 DD/MM/YYYY HH:MM

    1. domain.com
    """
    lines = [f"✅ BACKLINK PHỤC HỒI", f"📅 {_now_str()}", ""]
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

    lines = [f"💡 LINK CHƯA ĐƯỢC GỠ", f"📅 {_now_str()}", ""]
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
                f" | hết hạn {expiry_str}"
            )
        lines.append("")
    lines.append(
        "👉 Các link này vẫn tồn tại — hãy liên hệ khách hàng để gia hạn!"
    )
    return "\n".join(lines)


def format_website_die(websites: list) -> str:
    """
    🔴 WEBSITE CANNOT BE ACCESSED
    📅 DD/MM/YYYY HH:MM

    1. domain.com → HTTP 503

    ⚠️ Backlinks on these domains are temporarily NOT updated!
    """
    lines = [f"🔴 WEBSITE KHÔNG THỂ TRUY CẬP", f"📅 {_now_str()}", ""]
    for i, w in enumerate(websites, 1):
        lines.append(f"{i}. {w.get('domain', '')}")
    lines.extend(
        ["", "⚠️ Backlink trên các domain này tạm thời KHÔNG được cập nhật!"]
    )
    return "\n".join(lines)


def format_website_alive(websites: list) -> str:
    """
    ✅ WEBSITE IS BACK ONLINE
    📅 DD/MM/YYYY HH:MM

    1. domain.com

    👉 System continues crawling normally!
    """
    lines = [f"✅ WEBSITE ĐÃ HOẠT ĐỘNG TRỞ LẠI", f"📅 {_now_str()}", ""]
    for i, w in enumerate(websites, 1):
        lines.append(f"{i}. {w.get('domain', '')}")
    lines.extend(["", "👉 Hệ thống tiếp tục crawl bình thường!"])
    return "\n".join(lines)
