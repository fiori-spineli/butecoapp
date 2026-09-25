from sqlalchemy.orm import Session
from backend.app.daos.produto_dao import ProdutoDAO
import uuid

class ProdutoService:
    def __init__(self, db: Session):
        self.dao = ProdutoDAO(db)

    def alterar_estoque(self, produto_id: str, delta: int):
        return self.dao.ajustar_estoque_atomo(uuid.UUID(produto_id), delta)
