from sqlalchemy.orm import Session
from backend.app.models.orm_models import ClienteModel, LancamentoModel, PagamentoModel
import uuid

class ComandaDAO:
    def __init__(self, db: Session):
        self.db = db

    def criar_comanda(self, bar_id: uuid.UUID, nome: str, numero_mesa: str):
        c = ClienteModel(bar_id=bar_id, nome=nome, numero_mesa=numero_mesa)
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        return c

    def buscar_por_token(self, token: uuid.UUID):
        return self.db.query(ClienteModel).filter(ClienteModel.token == token).first()

    def adicionar_lancamento(self, cliente_id: uuid.UUID, produto_id: uuid.UUID, desc: str, qtd: int, valor: int):
        l = LancamentoModel(cliente_id=cliente_id, produto_id=produto_id, descricao=desc, quantidade=qtd, valor_unitario_centavos=valor)
        self.db.add(l)
        self.db.commit()
        return l

    def registrar_pagamento(self, cliente_id: uuid.UUID, valor: int, desc: str):
        p = PagamentoModel(cliente_id=cliente_id, valor_centavos=valor, descricao=desc)
        self.db.add(p)
        self.db.commit()
        return p
