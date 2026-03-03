import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

CRAWL_INTERVAL_MINUTES = int(os.getenv("CRAWL_INTERVAL_MINUTES", "60"))


def start_scheduler(app) -> None:
    """Start APScheduler on FastAPI startup. Runs crawl_all every CRAWL_INTERVAL_MINUTES."""
    scheduler = AsyncIOScheduler()

    async def crawl_all_job() -> None:
        from database import SessionLocal
        from services.status_updater import update_all_domains

        db = SessionLocal()
        try:
            await update_all_domains(db)
        finally:
            db.close()

    scheduler.add_job(
        crawl_all_job,
        IntervalTrigger(minutes=CRAWL_INTERVAL_MINUTES),
    )
    scheduler.start()
    app.state.scheduler = scheduler
