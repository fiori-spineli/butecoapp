from sqlalchemy.orm import Session
from backend.app.core.security import verificar_senha, hash_senha

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    # Regras de autenticação de donos de bar e super admins
