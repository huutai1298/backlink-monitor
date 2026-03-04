import asyncio
import logging
import os
from datetime import datetime

try:
    from telegram.ext import ApplicationBuilder, CommandHandler
except ImportError:
    ApplicationBuilder = None  # type: ignore
    CommandHandler = None  # type: ignore

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN: str | None = os.getenv("TELEGRAM_BOT_TOKEN")
INTERNAL_GROUP_ID: str | None = os.getenv("INTERNAL_GROUP_ID")

STATUS_EMOJI = {
    "live": "✅ Live",
    "lost": "⚠️ Lost",
    "pending": "⏳ Pending",
    "expired": "⏰ Expired",
    "inactive": "🔴 Inactive",
}


def _now_str() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")


async def _info_handler(update, context) -> None:
    """Return group ID and group name. Used by admin to register the group."""
    chat = update.effective_chat
    chat_name = chat.title or chat.first_name or "Unknown"
    if chat.username:
        chat_url = f"https://t.me/{chat.username}"
    else:
        chat_url = f"https://t.me/c/{str(chat.id).replace('-100', '', 1)}"
    text = (
        f"📋 GROUP INFO\n"
        f"🏷️ Name  : {chat_name}\n"
        f"🆔 ID    : {chat.id}\n"
        f"🔗 URL   : {chat_url}\n"
        f"👉 Copy this Group ID to add to the system!"
    )
    await update.message.reply_text(text)


async def _check_handler(update, context) -> None:
    """
    /check          — backlink overview (internal: all + revenue; customer: own counts)
    /check keyword  — search (internal: all details; customer: own links, no price)
    """
    from database import SessionLocal
    from models.backlink import Backlink
    from models.customer import Customer
    from models.website import Website
    from sqlalchemy import func

    chat = update.effective_chat
    chat_id = str(chat.id)
    keyword = " ".join(context.args).strip() if context.args else ""
    is_internal = bool(INTERNAL_GROUP_ID and chat_id == str(INTERNAL_GROUP_ID))

    db = SessionLocal()
    try:
        if not keyword:
            # --- /check (no keyword): overview ---
            if is_internal:
                counts = (
                    db.query(Backlink.status, func.count(Backlink.id))
                    .group_by(Backlink.status)
                    .all()
                )
                count_map = {s: c for s, c in counts}

                revenue = (
                    db.query(func.sum(Website.price_monthly))
                    .join(Backlink, Backlink.website_id == Website.id)
                    .filter(Backlink.status == "live")
                    .scalar()
                    or 0
                )

                text = (
                    f"📊 BACKLINK OVERVIEW\n"
                    f"📅 {_now_str()}\n"
                    f"✅ Live      : {count_map.get('live', 0)} links\n"
                    f"⚠️ Lost      : {count_map.get('lost', 0)} links\n"
                    f"⏰ Expired   : {count_map.get('expired', 0)} links\n"
                    f"⏳ Pending   : {count_map.get('pending', 0)} links\n"
                    f"🔴 Inactive  : {count_map.get('inactive', 0)} links\n"
                    f"💰 Active revenue: {int(revenue):,} VND/month"
                )
            else:
                customer = (
                    db.query(Customer)
                    .filter(Customer.telegram_group_id == chat_id)
                    .first()
                )
                if not customer:
                    await update.message.reply_text(
                        "❌ This group is not registered in the system!"
                    )
                    return

                counts = (
                    db.query(Backlink.status, func.count(Backlink.id))
                    .filter(Backlink.customer_id == customer.id)
                    .group_by(Backlink.status)
                    .all()
                )
                count_map = {s: c for s, c in counts}

                text = (
                    f"📊 BACKLINK OVERVIEW\n"
                    f"📅 {_now_str()}\n"
                    f"✅ Live      : {count_map.get('live', 0)} links\n"
                    f"⚠️ Lost      : {count_map.get('lost', 0)} links\n"
                    f"⏰ Expired   : {count_map.get('expired', 0)} links"
                )

        else:
            # --- /check keyword: search ---
            if is_internal:
                results = (
                    db.query(Backlink, Website, Customer)
                    .join(Website, Backlink.website_id == Website.id)
                    .join(Customer, Backlink.customer_id == Customer.id)
                    .filter(
                        Website.domain.ilike(f"%{keyword}%")
                        | Backlink.anchor_text.ilike(f"%{keyword}%")
                        | Backlink.backlink_url.ilike(f"%{keyword}%")
                    )
                    .all()
                )

                if not results:
                    await update.message.reply_text("❌ No results found!")
                    return

                lines = [f'🔍 SEARCH RESULTS: "{keyword}"', f"📅 {_now_str()}"]
                for i, (bl, ws, cust) in enumerate(results, 1):
                    date_placed = (
                        bl.date_placed.strftime("%d/%m/%Y")
                        if bl.date_placed
                        else "N/A"
                    )
                    price = int(ws.price_monthly or 0)
                    lines.append(
                        f"{i}. {ws.domain}\n"
                        f"   Anchor   : \"{bl.anchor_text or ''}\"\n"
                        f"   Customer : {cust.name}\n"
                        f"   Status   : {STATUS_EMOJI.get(bl.status, bl.status)}\n"
                        f"   Price    : {price:,} VND/month\n"
                        f"   Added    : {date_placed}"
                    )
                text = "\n".join(lines)

            else:
                customer = (
                    db.query(Customer)
                    .filter(Customer.telegram_group_id == chat_id)
                    .first()
                )
                if not customer:
                    await update.message.reply_text(
                        "❌ This group is not registered in the system!"
                    )
                    return

                # Search ONLY this customer's backlinks — never reveal others' data
                results = (
                    db.query(Backlink, Website)
                    .join(Website, Backlink.website_id == Website.id)
                    .filter(Backlink.customer_id == customer.id)
                    .filter(
                        Website.domain.ilike(f"%{keyword}%")
                        | Backlink.anchor_text.ilike(f"%{keyword}%")
                        | Backlink.backlink_url.ilike(f"%{keyword}%")
                    )
                    .all()
                )

                if not results:
                    await update.message.reply_text("❌ No results found!")
                    return

                lines = [f'🔍 SEARCH RESULTS: "{keyword}"', f"📅 {_now_str()}"]
                for i, (bl, ws) in enumerate(results, 1):
                    date_placed = (
                        bl.date_placed.strftime("%d/%m/%Y")
                        if bl.date_placed
                        else "N/A"
                    )
                    lines.append(
                        f"{i}. {ws.domain}\n"
                        f"   Anchor   : \"{bl.anchor_text or ''}\"\n"
                        f"   Status   : {STATUS_EMOJI.get(bl.status, bl.status)}\n"
                        f"   Added    : {date_placed}"
                    )
                text = "\n".join(lines)

        await update.message.reply_text(text)

    except Exception:
        logger.exception("Error handling /check command")
        await update.message.reply_text("❌ An error occurred. Please try again.")
    finally:
        db.close()


def start_bot(app) -> None:
    """Start Telegram bot polling as a background asyncio task on FastAPI startup."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set — Telegram bot will not start")
        return

    if ApplicationBuilder is None:
        logger.warning("python-telegram-bot not installed — bot will not start")
        return

    bot_app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    bot_app.add_handler(CommandHandler("info", _info_handler))
    bot_app.add_handler(CommandHandler("check", _check_handler))

    async def _run_polling() -> None:
        try:
            await bot_app.initialize()
            await bot_app.start()
            await bot_app.updater.start_polling(drop_pending_updates=True)
            app.state.bot_app = bot_app
        except Exception:
            logger.exception("Telegram bot failed to start")

    asyncio.get_running_loop().create_task(_run_polling())
