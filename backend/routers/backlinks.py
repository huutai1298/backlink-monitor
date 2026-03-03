from fastapi import APIRouter

router = APIRouter(prefix="/api/backlinks", tags=["backlinks"])


@router.get("")
def list_backlinks():
    return {"message": "coming soon"}
