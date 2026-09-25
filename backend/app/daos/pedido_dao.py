from sqlalchemy.orm import Session
from backend.app.models.orm_models import PedidoPendenteModel, LancamentoModel
import uuid

class PedidoDAO:
    def __init__(self, db: Session):
        self.db = db

    def criar_pedido_cliente(self, bar_id: uuid.UUID, cliente_id: uuid.UUID, produto_id: uuid.UUID, qtd: int, valor: int):
        p = PedidoPendenteModel(bar_id=bar_id, cliente_id=cliente_id, produto_id=produto_id, quantidade=qtd, valor_unitario_centavos=valor)
        self.db.add(p)
        self.db.commit()
        return p

    def confirmar_entrega(self, pedido_id: uuid.UUID):
        pedido = self.db.query(PedidoPendenteModel).filter(PedidoPendenteModel.id == pedido_id).first()
        if pedido and pedido.status == "pendente":
            pedido.status = "entregue"
            # Transforma em lançamento oficial na comanda
            lancamento = LancamentoModel(
                cliente_id=pedido.cliente_id,
                produto_id=pedido.produto_id,
                quantidade=pedido.quantidade,
                valor_unitario_centavos=pedido.valor_unitario_centavos
            )
            self.db.add(lancamento)
            self.db.commit()
            return True
        return False
