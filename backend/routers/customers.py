from fastapi import APIRouter

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("")
def list_customers():
    return {"message": "coming soon"}
