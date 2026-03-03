from fastapi import APIRouter

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
def list_logs():
    return {"message": "coming soon"}
