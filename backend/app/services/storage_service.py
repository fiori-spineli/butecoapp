import os
import io
import uuid
import boto3
from botocore.config import Config
from PIL import Image
from fastapi import UploadFile, HTTPException

R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "buteco-imagens")
R2_PUBLIC_DOMAIN = os.getenv("R2_PUBLIC_DOMAIN", "").rstrip("/")

# Configuração do cliente S3 para conversar com o Cloudflare R2
s3_client = boto3.client(
    service_name="s3",
    endpoint_url=R2_ENDPOINT_URL,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
    config=Config(signature_version="s3v4")
)

def otimizar_para_webp(imagem_bytes: bytes, max_largura: int = 800, qualidade: int = 80) -> io.BytesIO:
    """Converte qualquer imagem (PNG, JPG, etc.) para WebP otimizado."""
    try:
        imagem = Image.open(io.BytesIO(imagem_bytes))
        
        # Converte modos que não suportam WebP direto (ex: RGBA para RGB se necessário)
        if imagem.mode in ("RGBA", "P"):
            imagem = imagem.convert("RGBA")
        else:
            imagem = imagem.convert("RGB")
            
        # Redimensiona proporcionalmente mantendo a qualidade
        if imagem.width > max_largura:
            proporcao = max_largura / float(imagem.width)
            altura_calculada = int(float(imagem.height) * float(proporcao))
            imagem = imagem.resize((max_largura, altura_calculada), Image.Resampling.LANCZOS)
            
        buffer_saida = io.BytesIO()
        imagem.save(buffer_saida, format="WEBP", quality=qualidade, optimize=True)
        buffer_saida.seek(0)
        return buffer_saida
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar imagem: {str(e)}")

async def upload_imagem_r2(arquivo: UploadFile, pasta: str = "produtos") -> str:
    """Recebe o arquivo da requisição, otimiza e sobe para o Cloudflare R2."""
    if not arquivo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="O arquivo enviado precisa ser uma imagem válida.")

    conteudo_bruto = await arquivo.read()
    
    # Valida tamanho máximo de 6 MB antes de processar
    if len(conteudo_bruto) > 6 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="A imagem excede o tamanho máximo de 6 MB.")

    # Converte e comprime para WebP
    buffer_webp = otimizar_para_webp(conteudo_bruto)

    # Gera um identificador único para não sobrescrever arquivos existentes
    nome_arquivo = f"{pasta}/{uuid.uuid4()}.webp"

    try:
        s3_client.upload_fileobj(
            buffer_webp,
            R2_BUCKET_NAME,
            nome_arquivo,
            ExtraArgs={"ContentType": "image/webp"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao enviar arquivo para o Cloudflare R2: {str(e)}")

    # Retorna o link público direto para salvar no PostgreSQL do Neon
    return f"{R2_PUBLIC_DOMAIN}/{nome_arquivo}"