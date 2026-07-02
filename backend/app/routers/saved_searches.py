import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import SavedSearch, User
from app.schemas import SavedSearchCreate, SavedSearchOut

router = APIRouter(prefix="/api/saved-searches", tags=["saved-searches"])


def _to_out(search: SavedSearch) -> SavedSearchOut:
    return SavedSearchOut(
        id=search.id,
        name=search.name,
        filters=json.loads(search.filters_json),
        created_at=search.created_at,
    )


@router.get("", response_model=list[SavedSearchOut])
def list_saved_searches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    searches = (
        db.query(SavedSearch).filter(SavedSearch.user_id == current_user.id).all()
    )
    return [_to_out(s) for s in searches]


@router.post("", response_model=SavedSearchOut, status_code=201)
def create_saved_search(
    payload: SavedSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search = SavedSearch(
        user_id=current_user.id,
        name=payload.name,
        filters_json=json.dumps(payload.filters),
    )
    db.add(search)
    db.commit()
    db.refresh(search)
    return _to_out(search)


@router.delete("/{search_id}", status_code=204)
def delete_saved_search(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search = (
        db.query(SavedSearch)
        .filter(SavedSearch.id == search_id, SavedSearch.user_id == current_user.id)
        .first()
    )
    if not search:
        raise HTTPException(status_code=404, detail="Búsqueda guardada no encontrada")
    db.delete(search)
    db.commit()
