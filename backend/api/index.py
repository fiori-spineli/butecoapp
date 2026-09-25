from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from app.routes import comanda_routes, produto_routes, admin_routes

app = FastAPI(title="ButecoApp Serverless API", version="2.0.0")

# Libera o CORS para o seu frontend acessar a API sem bloqueio
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui suas rotas mapeadas na pasta app/routes
app.include_router(comanda_routes.router, prefix="/api/comandas", tags=["Comandas"])
app.include_router(produto_routes.router, prefix="/api/produtos", tags=["Produtos"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])

@app.get("/api/health")
def health_check():
    return {"status": "API Serverless operando com sucesso na Vercel!"}

# O Mangum é a ponte mágica que converte a Vercel (AWS Lambda) para o FastAPI
handler = Mangum(app)