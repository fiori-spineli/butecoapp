from sqlalchemy.orm import Session
from backend.app.models.orm_models import InteressadoModel, BarModel

class AdminDAO:
    def __init__(self, db: Session):
        self.db = db

    def listar_interessados(self):
        return self.db.query(InteressadoModel).order_by(InteressadoModel.created_at.desc()).all()

    def atualizar_status_interessado(self, interessado_id: str, status: str, obs: str):
        item = self.db.query(InteressadoModel).filter(InteressadoModel.id == interessado_id).first()
        if item:
            item.status = status
            item.observacao = obs
            self.db.commit()
        return item
