from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.blacklisted_link import BlacklistedLink
from schemas.blacklist import BlacklistCreate, BlacklistResponse
from middleware.auth import verify_token

router = APIRouter(prefix="/api/blacklist", tags=["blacklist"])


@router.get("", response_model=List[BlacklistResponse])
def list_blacklist(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    return db.query(BlacklistedLink).filter(BlacklistedLink.is_active == True).all()


@router.post("", response_model=BlacklistResponse, status_code=status.HTTP_201_CREATED)
def add_to_blacklist(
    data: BlacklistCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    entry = BlacklistedLink(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}/restore", response_model=BlacklistResponse)
def restore_from_blacklist(
    entry_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    entry = db.query(BlacklistedLink).filter(BlacklistedLink.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")
    entry.is_active = False
    db.commit()
    db.refresh(entry)
    return entry
