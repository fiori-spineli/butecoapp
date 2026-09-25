from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.comanda_service import ComandaService
from backend.app.dtos.schemas import ComandaCreateDTO, PagamentoCreateDTO
router = APIRouter()
@router.post("/")
def abrir(bar_id: str, dto: ComandaCreateDTO, db: Session = Depends(get_db)):
    return ComandaService(db).abrir_mesa(bar_id, dto)
