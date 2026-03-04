from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
import logging

from models.website import Website
from models.backlink import Backlink
from models.notification_log import NotificationLog
from services.crawler import crawl_domain
from services import notifier

logger = logging.getLogger(__name__)


def _normalize_url(url: str) -> str:
    return url.lower().strip().rstrip("/")


async def update_all_domains(db: Session) -> None:
    """Crawl all active websites one by one and update backlink statuses."""
    websites = db.query(Website).filter(Website.is_active == True).all()
    for website in websites:
        try:
            await update_single_domain(website.domain, db)
        except Exception as exc:
            logger.error("Error updating domain %s: %s", website.domain, exc)


async def update_single_domain(domain: str, db: Session) -> None:
    """Crawl a single domain and update its backlink statuses."""
    logger.info("Crawling domain: %s", domain)
    website = db.query(Website).filter(Website.domain == domain).first()
    if not website:
        return

    result = crawl_domain(domain)
    now = datetime.now(timezone.utc)

    if not result["success"]:
        # --- Website DEAD ---
        if not website.is_dead:
            website.is_dead = True
            website.dead_since = now
            db.commit()
            logger.warning("Website marked DEAD: %s — error: %s", domain, result.get("error"))

            msg = notifier.format_website_die(
                [{"domain": domain, "error": result.get("error", "Unknown")}]
            )
            await notifier.send_internal(msg)
            db.add(
                NotificationLog(
                    website_id=website.id,
                    type="website_die",
                    message=msg,
                )
            )
            db.commit()
        # CRITICAL: do NOT touch any backlink statuses when website is dead
        return

    # --- Website ALIVE ---
    was_dead = website.is_dead
    if was_dead:
        website.is_dead = False
        db.commit()
        logger.info("Website recovered: %s", domain)

        msg = notifier.format_website_alive([{"domain": domain}])
        await notifier.send_internal(msg)
        db.add(
            NotificationLog(
                website_id=website.id,
                type="website_alive",
                message=msg,
            )
        )
        db.commit()

    crawled_hrefs = set(result["links"])
    crawled_normalized = {_normalize_url(h) for h in crawled_hrefs}
    backlinks = (
        db.query(Backlink)
        .filter(Backlink.website_id == website.id)
        .options(joinedload(Backlink.customer))
        .all()
    )

    lost_backlinks = []
    live_backlinks = []  # lost -> live transitions

    for bl in backlinks:
        bl.last_checked = now
        bl_url = _normalize_url(bl.backlink_url) if bl.backlink_url else None
        found = bool(bl_url and bl_url in crawled_normalized)

        if found:
            bl.last_live_at = now
            if bl.status == "pending":
                bl.status = "live"
            elif bl.status == "live":
                pass  # already live, no action
            elif bl.status == "lost":
                bl.status = "live"
                bl.lost_at = None
                live_backlinks.append(bl)
            elif bl.status == "inactive":
                pass  # inactive: no action needed
            # expired: no action
        else:
            if bl.status == "live":
                bl.status = "lost"
                bl.lost_at = now
                lost_backlinks.append(bl)
            # pending: keep pending (no notification)
            # lost: keep lost — DO NOT re-notify
            # inactive, expired: no action

    db.commit()
    logger.info("Domain %s: %d lost, %d recovered", domain, len(lost_backlinks), len(live_backlinks))

    # --- Notifications for live->lost ---
    if lost_backlinks:
        bl_data = _build_bl_data(lost_backlinks, domain, website)
        msg = notifier.format_lost_internal(bl_data)
        await notifier.send_internal(msg)

        by_customer = _group_by_customer(bl_data)
        for cid, bls in by_customer.items():
            cust_msg = notifier.format_lost_customer(bls)
            await notifier.send_customer(cid, cust_msg, db)

        for bl in lost_backlinks:
            db.add(
                NotificationLog(
                    backlink_id=bl.id,
                    website_id=website.id,
                    customer_id=bl.customer_id,
                    type="lost",
                    message=msg,
                )
            )
        db.commit()

    # --- Notifications for lost->live ---
    if live_backlinks:
        bl_data = _build_bl_data(live_backlinks, domain, website)
        msg = notifier.format_live_internal(bl_data)
        await notifier.send_internal(msg)

        by_customer = _group_by_customer(bl_data)
        for cid, bls in by_customer.items():
            cust_msg = notifier.format_live_customer(bls)
            await notifier.send_customer(cid, cust_msg, db)

        for bl in live_backlinks:
            db.add(
                NotificationLog(
                    backlink_id=bl.id,
                    website_id=website.id,
                    customer_id=bl.customer_id,
                    type="live",
                    message=msg,
                )
            )
        db.commit()


def _build_bl_data(backlinks: list, domain: str, website: Website) -> list:
    return [
        {
            "customer_name": bl.customer.name if bl.customer else "Unknown",
            "domain": domain,
            "anchor_text": bl.anchor_text,
            "price_monthly": float(website.price_monthly or 0),
            "date_payment": bl.date_payment,
            "customer_id": bl.customer_id,
        }
        for bl in backlinks
    ]


def _group_by_customer(bl_data: list) -> dict:
    groups: dict = {}
    for bl in bl_data:
        cid = bl["customer_id"]
        groups.setdefault(cid, []).append(bl)
    return groups
