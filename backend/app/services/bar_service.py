from sqlalchemy.orm import Session
from backend.app.daos.bar_dao import BarDAO
import uuid

class BarService:
    def __init__(self, db: Session):
        self.dao = BarDAO(db)

    def atualizar_perfil(self, bar_id: str, dados: dict):
        return self.dao.atualizar_configuracoes(uuid.UUID(bar_id), dados)
