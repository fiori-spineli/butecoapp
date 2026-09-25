from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.storage_service import upload_imagem_r2

router = APIRouter()

@router.post("/produtos/imagem")
async def upload_foto_produto(arquivo: UploadFile = File(...)):
    """Rota para enviar fotos de itens do cardápio."""
    url = await upload_imagem_r2(arquivo, pasta="produtos")
    return {"url": url}

@router.post("/bar/foto")
async def upload_logo_bar(arquivo: UploadFile = File(...)):
    """Rota para enviar logotipo ou foto do estabelecimento."""
    url = await upload_imagem_r2(arquivo, pasta="logos")
    return {"url": url}