import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.app.core.database import Base

class BarModel(Base):
    __tablename__ = "bars"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False)
    nome = Column(String(120), nullable=False)
    slug = Column(String(60), unique=True, nullable=False)
    mensagem_qr = Column(Text, nullable=True)
    horario_abertura = Column(String(10), default="18:00")
    horario_fechamento = Column(String(10), default="03:00")
    telefone = Column(String(30), nullable=True)
    cidade = Column(String(120), nullable=True)
    foto_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ClienteModel(Base):
    __tablename__ = "clientes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id = Column(UUID(as_uuid=True), ForeignKey("bars.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(80), nullable=False)
    numero_mesa = Column(String(20), nullable=True)
    token = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    status = Column(String(20), default="aberta")
    fechada_em = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProdutoModel(Base):
    __tablename__ = "produtos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id = Column(UUID(as_uuid=True), ForeignKey("bars.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(120), nullable=False)
    preco_centavos = Column(Integer, nullable=False)
    categoria = Column(String(30), default="outros")
    estoque_atual = Column(Integer, default=0)
    imagem_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LancamentoModel(Base):
    __tablename__ = "lancamentos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("produtos.id", ondelete="SET NULL"), nullable=True)
    descricao = Column(Text, nullable=True)
    quantidade = Column(Integer, nullable=False, default=1)
    valor_unitario_centavos = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PagamentoModel(Base):
    __tablename__ = "pagamentos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)
    lancamento_id = Column(UUID(as_uuid=True), ForeignKey("lancamentos.id", ondelete="CASCADE"), nullable=True)
    quantidade_paga = Column(Integer, nullable=True)
    valor_centavos = Column(Integer, nullable=False)
    descricao = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PedidoPendenteModel(Base):
    __tablename__ = "pedidos_pendentes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id = Column(UUID(as_uuid=True), ForeignKey("bars.id", ondelete="CASCADE"), nullable=False)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("produtos.id", ondelete="CASCADE"), nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    valor_unitario_centavos = Column(Integer, nullable=False)
    status = Column(String(20), default="pendente") # pendente, entregue, cancelado
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class InteressadoModel(Base):
    __tablename__ = "interessados"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(120), nullable=False)
    bar_nome = Column(String(120), nullable=False)
    email = Column(String(254), nullable=False)
    telefone = Column(String(30), nullable=False)
    cidade = Column(String(120), nullable=True)
    mensagem = Column(Text, nullable=True)
    status = Column(String(20), default="novo") # novo, contatado, convertido, descartado
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AdministradorModel(Base):
    __tablename__ = "administradores"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    email = Column(String(254), nullable=False)
    totp_secret = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
