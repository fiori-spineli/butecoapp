from fastapi import APIRouter
router = APIRouter()
@router.get("/config")
def config_bar(): return {"status": "ok"}
