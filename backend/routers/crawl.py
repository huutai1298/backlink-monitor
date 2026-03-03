from fastapi import APIRouter

router = APIRouter(prefix="/api/crawl", tags=["crawl"])


@router.post("")
def crawl_domain():
    return {"message": "coming soon"}
