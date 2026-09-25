from pydantic import BaseModel, Field
from typing import Optional, List
import uuid

class ComandaCreateDTO(BaseModel):
    nome: str = Field(..., min_length=1, max_length=80)
    numero_mesa: Optional[str] = Field(None, max_length=20)

class LancamentoCreateDTO(BaseModel):
    produto_id: Optional[uuid.UUID] = None
    quantidade: int = Field(..., gt=0, le=999)
    descricao_livre: Optional[str] = None
    valor_avulso_centavos: Optional[int] = None

class PagamentoCreateDTO(BaseModel):
    valor_centavos: int = Field(..., gt=0)
    descricao: Optional[str] = None
    nome_pagador: Optional[str] = None

class ProdutoCreateDTO(BaseModel):
    nome: str = Field(..., min_length=2, max_length=120)
    preco_centavos: int = Field(..., gt=0)
    categoria: str = "outros"
    estoque_atual: int = Field(0, ge=0)
