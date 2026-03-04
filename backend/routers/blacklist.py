from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models.blacklisted_link import BlacklistedLink
from models.website import Website
from schemas.blacklist import BlacklistCreate, BlacklistResponse
from middleware.auth import verify_token

router = APIRouter(prefix="/api/blacklist", tags=["blacklist"])


@router.get("", response_model=List[BlacklistResponse])
def list_blacklist(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    entries = (
        db.query(BlacklistedLink)
        .options(joinedload(BlacklistedLink.website))
        .filter(BlacklistedLink.is_active == True)
        .all()
    )
    result = []
    for entry in entries:
        item = BlacklistResponse(
            id=entry.id,
            website_id=entry.website_id,
            blacklist_url=entry.blacklist_url,
            anchor_text=entry.anchor_text,
            is_active=entry.is_active,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
            website_domain=entry.website.domain if entry.website else None,
        )
        result.append(item)
    return result


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
