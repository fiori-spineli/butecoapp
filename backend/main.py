from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import relatorio_routes
from backend.app.routes import admin_routes, auth_routes, bar_routes, cliente_routes, comanda_routes, upload_routes

app = FastAPI(title="ButecoApp API Autossuficiente", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Backoffice Admin"])
app.include_router(bar_routes.router, prefix="/api/bar", tags=["Configurações do Bar"])
app.include_router(comanda_routes.router, prefix="/api/comandas", tags=["Gestão de Comandas"])
app.include_router(cliente_routes.router, prefix="/api/public", tags=["Portal do Cliente (QR)"])
app.include_router(relatorio_routes.router, prefix="/api/relatorios", tags=["Relatórios e Indicadores"])
app.include_router(upload_routes.router, prefix="/api/upload", tags=["Uploads e Imagens"])

@app.get("/")
def health_check():
    return {"status": "Backend completo operando sem dependências externas!"}
