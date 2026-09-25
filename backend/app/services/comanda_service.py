from sqlalchemy.orm import Session
from backend.app.daos.comanda_dao import ComandaDAO
from backend.app.dtos.schemas import ComandaCreateDTO, PagamentoCreateDTO
import uuid

class ComandaService:
    def __init__(self, db: Session):
        self.dao = ComandaDAO(db)

    def abrir_mesa(self, bar_id: str, dto: ComandaCreateDTO):
        return self.dao.criar_comanda(uuid.UUID(bar_id), dto.nome, dto.numero_mesa)

    def abater_pagamento(self, cliente_id: str, dto: PagamentoCreateDTO):
        desc = dto.descricao or "Pagamento avulso"
        if dto.nome_pagador:
            desc = f"{dto.nome_pagador} · {desc}"
        return self.dao.registrar_pagamento(uuid.UUID(cliente_id), dto.valor_centavos, desc)
