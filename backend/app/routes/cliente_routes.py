from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.daos.comanda_dao import ComandaDAO
import uuid
router = APIRouter()
@router.get("/c/{token}")
def comanda_publica(token: str, db: Session = Depends(get_db)):
    dao = ComandaDAO(db)
    comanda = dao.buscar_por_token(uuid.UUID(token))
    return comanda or {"erro": "não encontrada"}
