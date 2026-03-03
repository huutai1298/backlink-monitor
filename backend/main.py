from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, customers, websites, backlinks, crawl, blacklist, logs, dashboard

app = FastAPI(title="Backlink Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(websites.router)
app.include_router(backlinks.router)
app.include_router(crawl.router)
app.include_router(blacklist.router)
app.include_router(logs.router)
app.include_router(dashboard.router)


@app.get("/")
def health_check():
    return {"status": "ok"}
