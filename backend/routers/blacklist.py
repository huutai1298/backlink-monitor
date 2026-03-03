from fastapi import APIRouter

router = APIRouter(prefix="/api/blacklist", tags=["blacklist"])


@router.get("")
def list_blacklist():
    return {"message": "coming soon"}
