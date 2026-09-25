from sqlalchemy.orm import Session
from backend.app.models.orm_models import BarModel
import uuid

class BarDAO:
    def __init__(self, db: Session):
        self.db = db

    def buscar_por_owner(self, owner_id: uuid.UUID) -> BarModel:
        return self.db.query(BarModel).filter(BarModel.owner_id == owner_id).first()

    def atualizar_configuracoes(self, bar_id: uuid.UUID, dados: dict):
        bar = self.db.query(BarModel).filter(BarModel.id == bar_id).first()
        if bar:
            for chave, valor in dados.items():
                setattr(bar, chave, valor)
            self.db.commit()
            self.db.refresh(bar)
        return bar
