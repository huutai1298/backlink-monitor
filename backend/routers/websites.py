from fastapi import APIRouter

router = APIRouter(prefix="/api/websites", tags=["websites"])


@router.get("")
def list_websites():
    return {"message": "coming soon"}
