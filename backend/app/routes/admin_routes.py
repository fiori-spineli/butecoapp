from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.admin_service import AdminService
router = APIRouter()
@router.get("/interessados")
def listar_leads(db: Session = Depends(get_db)):
    return AdminService(db).obter_fila_interessados()
