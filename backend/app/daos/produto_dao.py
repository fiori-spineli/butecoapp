from sqlalchemy.orm import Session
from backend.app.models.orm_models import ProdutoModel
import uuid

class ProdutoDAO:
    def __init__(self, db: Session):
        self.db = db

    def listar_por_bar(self, bar_id: uuid.UUID):
        return self.db.query(ProdutoModel).filter(ProdutoModel.bar_id == bar_id).order_by(ProdutoModel.nome).all()

    def ajustar_estoque_atomo(self, produto_id: uuid.UUID, delta: int):
        prod = self.db.query(ProdutoModel).filter(ProdutoModel.id == produto_id).first()
        if prod:
            prod.estoque_atual = max(0, prod.estoque_atual + delta)
            self.db.commit()
            self.db.refresh(prod)
        return prod
