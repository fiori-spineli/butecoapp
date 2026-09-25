import sys
import os

# Garante que a Vercel encontre os módulos locais (app/...)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

# Importa todas as rotas (incluindo auth_routes que estava faltando!)
try:
    from app.routes import auth_routes, comanda_routes, produto_routes, admin_routes, upload_routes
except ImportError:
    from backend.app.routes import auth_routes, comanda_routes, produto_routes, admin_routes, upload_routes

app = FastAPI(title="ButecoApp API Serverless", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REGISTRA TODAS AS ROTAS NO SERVIDOR:
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(comanda_routes.router, prefix="/api/comandas", tags=["Comandas"])
app.include_router(produto_routes.router, prefix="/api/produtos", tags=["Produtos"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])
app.include_router(upload_routes.router, prefix="/api/upload", tags=["Uploads"])

@app.get("/api/health")
def health_check():
    return {"status": "API Serverless ativa e com todas as rotas registradas!"}

handler = Mangum(app)