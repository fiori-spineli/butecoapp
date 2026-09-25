from passlib.context import CryptContext
import pyotp

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def verificar_senha(senha: str, hashed: str) -> bool:
    return pwd_context.verify(senha, hashed)

def gerar_totp_secret() -> str:
    return pyotp.random_base32()

def validar_totp(secret: str, codigo: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(codigo)
