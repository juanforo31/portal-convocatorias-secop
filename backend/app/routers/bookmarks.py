from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.deps import get_db, get_current_user
from app.models import Bookmark, User
from app.schemas import BookmarkCreate, BookmarkOut

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.get("", response_model=list[BookmarkOut])
def list_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()


@router.post("", response_model=BookmarkOut, status_code=201)
def create_bookmark(
    payload: BookmarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookmark = Bookmark(
        user_id=current_user.id,
        proceso_id=payload.proceso_id,
        titulo=payload.titulo,
        entidad=payload.entidad,
        estado=payload.estado,
        url=payload.url,
    )
    db.add(bookmark)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Esta convocatoria ya está en favoritos")
    db.refresh(bookmark)
    return bookmark


@router.delete("/{bookmark_id}", status_code=204)
def delete_bookmark(
    bookmark_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookmark = (
        db.query(Bookmark)
        .filter(Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id)
        .first()
    )
    if not bookmark:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    db.delete(bookmark)
    db.commit()
