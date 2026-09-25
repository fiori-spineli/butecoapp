from sqlalchemy.orm import Session
from backend.app.daos.pedido_dao import PedidoDAO
import uuid

class PedidoService:
    def __init__(self, db: Session):
        self.dao = PedidoDAO(db)

    def efetivar_entrega(self, pedido_id: str):
        return self.dao.confirmar_entrega(uuid.UUID(pedido_id))
