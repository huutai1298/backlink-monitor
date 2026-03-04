import asyncio
import logging
import os
from collections import defaultdict
from datetime import datetime, timezone, timedelta

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


_VN_TZ = timezone(timedelta(hours=7))


def _now_str() -> str:
    return datetime.now(_VN_TZ).strftime("%d/%m/%Y %H:%M")


def _format_backlink_detail(i: int, bl, ws=None) -> str:
    """Return a formatted detail line for a single backlink."""
    date_placed = (
        bl.date_placed.strftime("%d/%m/%Y") if bl.date_placed else "N/A"
    )
    return (
        f"{i}. {bl.backlink_url}\n"
        f"   Anchor: \"{bl.anchor_text or ''}\" | "
        f"{STATUS_EMOJI.get(bl.status, bl.status)} | {date_placed}"
    )


async def _info_handler(update, context) -> None:
    """Return group ID and group name. Used by admin to register the group."""
    chat = update.effective_chat
    chat_name = chat.title or chat.first_name or "Unknown"
    if chat.username:
        chat_url = f"https://t.me/{chat.username}"
    else:
        chat_url = f"https://t.me/c/{str(chat.id).replace('-100', '', 1)}"
    text = (
        f"📋 THÔNG TIN NHÓM\n"
        f"🏷️ Name  : {chat_name}\n"
        f"🆔 ID    : {chat.id}\n"
        f"🔗 URL   : {chat_url}\n"
        f"👉 Sao chép Group ID này để thêm vào hệ thống!"
    )
    await update.message.reply_text(text)


async def _help_handler(update, context) -> None:
    """Return context-aware help text depending on chat type."""
    from database import SessionLocal
    from models.customer import Customer

    chat = update.effective_chat
    chat_id = str(chat.id)
    is_internal = bool(INTERNAL_GROUP_ID and chat_id == str(INTERNAL_GROUP_ID))

    if is_internal:
        text = (
            "📖 HƯỚNG DẪN SỬ DỤNG BOT\n\n"
            "🔧 Lệnh dành cho Admin:\n"
            "/help — Hiển thị hướng dẫn này\n"
            "/info — Lấy ID & URL của nhóm hiện tại\n"
            "/check — Xem tổng quan toàn bộ backlink + doanh thu\n"
            "/check <keyword> — Tóm tắt backlink theo domain/anchor/URL (nhóm theo khách hàng)\n"
            "/detail <keyword> — Chi tiết đầy đủ backlink theo domain/anchor/URL\n\n"
            "📊 Thông báo tự động:\n"
            "• Bot sẽ tự động thông báo khi backlink bị mất hoặc phục hồi\n"
            "• Thông báo khi website không thể truy cập\n"
            "• Thông báo link inactive vẫn còn tồn tại\n\n"
            "💡 Tip: Dùng /check để kiểm tra nhanh trạng thái hệ thống"
        )
        await update.message.reply_text(text)
        return

    db = SessionLocal()
    try:
        customer = (
            db.query(Customer)
            .filter(Customer.telegram_group_id == chat_id)
            .first()
        )
        if not customer:
            await update.message.reply_text(
                "❌ Nhóm này chưa được đăng ký trong hệ thống!\n"
                "Vui lòng liên hệ admin để được hỗ trợ."
            )
            return

        text = (
            f"📖 HƯỚNG DẪN SỬ DỤNG BOT\n\n"
            f"Xin chào {customer.name}! 👋\n\n"
            f"🔧 Các lệnh có thể sử dụng:\n"
            f"/help — Hiển thị hướng dẫn này\n"
            f"/check — Xem tổng quan backlink của bạn\n"
            f"/check <keyword> — Tóm tắt backlink theo domain hoặc anchor text\n"
            f"/detail <keyword> — Chi tiết đầy đủ backlink theo domain hoặc anchor text\n\n"
            f"📊 Thông báo tự động:\n"
            f"• Bạn sẽ nhận thông báo khi backlink bị mất hoặc được phục hồi\n\n"
            f"💡 Tip: Dùng /check để kiểm tra nhanh trạng thái backlink của bạn"
        )
        await update.message.reply_text(text)
    except Exception:
        logger.exception("Error handling /help command")
        await update.message.reply_text("❌ Đã xảy ra lỗi. Vui lòng thử lại.")
    finally:
        db.close()


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
                    f"📊 TỔNG QUAN BACKLINK\n"
                    f"📅 {_now_str()}\n"
                    f"✅ Live      : {count_map.get('live', 0)} link\n"
                    f"⚠️ Lost      : {count_map.get('lost', 0)} link\n"
                    f"⏰ Expired   : {count_map.get('expired', 0)} link\n"
                    f"⏳ Pending   : {count_map.get('pending', 0)} link\n"
                    f"🔴 Inactive  : {count_map.get('inactive', 0)} link\n"
                    f"💰 Doanh thu đang có: {int(revenue):,} VND/tháng"
                )
            else:
                customer = (
                    db.query(Customer)
                    .filter(Customer.telegram_group_id == chat_id)
                    .first()
                )
                if not customer:
                    await update.message.reply_text(
                        "❌ Nhóm này chưa được đăng ký trong hệ thống!"
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
                    f"📊 TỔNG QUAN BACKLINK\n"
                    f"📅 {_now_str()}\n"
                    f"✅ Live      : {count_map.get('live', 0)} link\n"
                    f"⚠️ Lost      : {count_map.get('lost', 0)} link\n"
                    f"⏰ Expired   : {count_map.get('expired', 0)} link"
                )

        else:
            # --- /check keyword: summary grouped by customer+domain (admin) or domain (customer) ---
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
                    await update.message.reply_text("❌ Không tìm thấy kết quả!")
                    return

                # Group by customer name, then by domain
                customer_domain_map: dict = defaultdict(lambda: defaultdict(list))
                for bl, ws, cust in results:
                    customer_domain_map[cust.name][ws.domain].append(bl)

                lines = [f'🔍 KẾT QUẢ: "{keyword}"', f"📅 {_now_str()}"]
                for cust_name, domain_map in customer_domain_map.items():
                    lines.append(f"\n👤 {cust_name}")
                    for domain, backlinks in domain_map.items():
                        live_count = sum(1 for bl in backlinks if bl.status == "live")
                        lost_count = sum(1 for bl in backlinks if bl.status == "lost")
                        expired_count = sum(1 for bl in backlinks if bl.status == "expired")
                        lines.append(
                            f"   {domain} — {len(backlinks)} link\n"
                            f"   ✅ Live: {live_count}  |  ⚠️ Lost: {lost_count}  |  ⏰ Expired: {expired_count}"
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
                        "❌ Nhóm này chưa được đăng ký trong hệ thống!"
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
                    await update.message.reply_text("❌ Không tìm thấy kết quả!")
                    return

                # Group by domain
                domain_map: dict = defaultdict(list)
                for bl, ws in results:
                    domain_map[ws.domain].append(bl)

                lines = [
                    f'🔍 KẾT QUẢ: "{keyword}"',
                    f"👤 Khách: {customer.name}",
                    f"📅 {_now_str()}",
                ]
                for domain, backlinks in domain_map.items():
                    live_count = sum(1 for bl in backlinks if bl.status == "live")
                    lost_count = sum(1 for bl in backlinks if bl.status == "lost")
                    expired_count = sum(1 for bl in backlinks if bl.status == "expired")
                    lines.append(
                        f"\n{domain} — {len(backlinks)} link\n"
                        f"✅ Live: {live_count}  |  ⚠️ Lost: {lost_count}  |  ⏰ Expired: {expired_count}"
                    )
                text = "\n".join(lines)

        await update.message.reply_text(text)

    except Exception:
        logger.exception("Error handling /check command")
        await update.message.reply_text("❌ Đã xảy ra lỗi. Vui lòng thử lại.")
    finally:
        db.close()


async def _detail_handler(update, context) -> None:
    """
    /detail keyword  — full details per backlink
                       (admin: grouped by customer; customer: own links, no price)
    """
    from database import SessionLocal
    from models.backlink import Backlink
    from models.customer import Customer
    from models.website import Website

    chat = update.effective_chat
    chat_id = str(chat.id)
    keyword = " ".join(context.args).strip() if context.args else ""
    is_internal = bool(INTERNAL_GROUP_ID and chat_id == str(INTERNAL_GROUP_ID))

    if not keyword:
        await update.message.reply_text(
            "❌ Vui lòng cung cấp từ khóa!\nVí dụ: /detail example.com"
        )
        return

    db = SessionLocal()
    try:
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
                await update.message.reply_text("❌ Không tìm thấy kết quả!")
                return

            # Group by customer name
            customer_backlinks: dict = defaultdict(list)
            for bl, ws, cust in results:
                customer_backlinks[cust.name].append((bl, ws))

            lines = [f'📋 CHI TIẾT: "{keyword}"', f"📅 {_now_str()}"]
            for cust_name, bl_ws_list in customer_backlinks.items():
                lines.append(f"\n👤 {cust_name}")
                for i, (bl, ws) in enumerate(bl_ws_list, 1):
                    lines.append(_format_backlink_detail(i, bl))
            text = "\n".join(lines)

        else:
            customer = (
                db.query(Customer)
                .filter(Customer.telegram_group_id == chat_id)
                .first()
            )
            if not customer:
                await update.message.reply_text(
                    "❌ Nhóm này chưa được đăng ký trong hệ thống!"
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
                await update.message.reply_text("❌ Không tìm thấy kết quả!")
                return

            lines = [
                f'📋 CHI TIẾT: "{keyword}"',
                f"👤 Khách: {customer.name}",
                f"📅 {_now_str()}",
            ]
            for i, (bl, ws) in enumerate(results, 1):
                lines.append("\n" + _format_backlink_detail(i, bl))
            text = "\n".join(lines)

        await update.message.reply_text(text)

    except Exception:
        logger.exception("Error handling /detail command")
        await update.message.reply_text("❌ Đã xảy ra lỗi. Vui lòng thử lại.")
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
    bot_app.add_handler(CommandHandler("help", _help_handler))
    bot_app.add_handler(CommandHandler("info", _info_handler))
    bot_app.add_handler(CommandHandler("check", _check_handler))
    bot_app.add_handler(CommandHandler("detail", _detail_handler))

    async def _run_polling() -> None:
        try:
            await bot_app.initialize()
            await bot_app.start()
            await bot_app.updater.start_polling(drop_pending_updates=True)
            app.state.bot_app = bot_app
        except Exception:
            logger.exception("Telegram bot failed to start")

    asyncio.get_running_loop().create_task(_run_polling())
