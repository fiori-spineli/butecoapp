from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from jose import jwt, JWTError
import os
import uuid
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import verificar_senha, hash_senha
from app.models.orm_models import AdministradorModel

# Tentativa de importar a tabela de usuários (public.users)
try:
    from app.models.orm_models import UserModel
except ImportError:
    from sqlalchemy import Column, String, DateTime
    from sqlalchemy.dialects.postgresql import UUID
    from sqlalchemy.sql import func
    from app.core.database import Base

    class UserModel(Base):
        __tablename__ = "users"
        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        email = Column(String(254), unique=True, nullable=False)
        password_hash = Column(String, nullable=True)
        created_at = Column(DateTime(timezone=True), server_default=func.now())

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "buteco_jwt_secret_padrao_substitua_no_env")
ALGORITHM = "HS256"

class LoginSchema(BaseModel):
    email: EmailStr
    password: str
    captcha_token: Optional[str] = None

class AlterarSenhaSchema(BaseModel):
    senha: str
    user_id: Optional[str] = None

def criar_jwt(payload: dict, expires_delta: timedelta = timedelta(days=30)) -> str:
    dados = payload.copy()
    dados.update({"exp": datetime.utcnow() + expires_delta})
    return jwt.encode(dados, SECRET_KEY, algorithm=ALGORITHM)

def obter_usuario_logado(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido.")
    token = authorization.split(" ")[1]
    try:
        dados = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = dados.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Sessão expirada ou inválida.")

    usuario = db.query(UserModel).filter(UserModel.id == uuid.UUID(user_id)).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuário não encontrado.")
    return usuario

@router.post("/login")
def login(dados: LoginSchema, db: Session = Depends(get_db)):
    usuario = db.query(UserModel).filter(UserModel.email == dados.email.lower()).first()
    if not usuario or not usuario.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )

    if not verificar_senha(dados.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )

    # Identifica se o usuário é administrador
    admin = db.query(AdministradorModel).filter(AdministradorModel.user_id == usuario.id).first()

    token = criar_jwt({
        "sub": str(usuario.id),
        "email": usuario.email,
        "is_admin": bool(admin)
    })

    return {
        "ok": True,
        "token": token,
        "usuario": {
            "id": str(usuario.id),
            "email": usuario.email,
            "is_admin": bool(admin)
        }
    }

@router.get("/me")
def obter_dados_usuario(usuario: UserModel = Depends(obter_usuario_logado)):
    return {
        "id": str(usuario.id),
        "email": usuario.email
    }

@router.post("/alterar-senha")
def alterar_senha(
    dados: AlterarSenhaSchema,
    usuario: UserModel = Depends(obter_usuario_logado),
    db: Session = Depends(get_db)
):
    alvo = usuario
    if dados.user_id and str(usuario.id) != dados.user_id:
        raise HTTPException(status_code=403, detail="Não autorizado a alterar este usuário.")

    alvo.password_hash = hash_senha(dados.senha)
    db.commit()
    return {"ok": True, "mensagem": "Senha atualizada com sucesso."}