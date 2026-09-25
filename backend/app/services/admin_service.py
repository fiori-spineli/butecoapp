from sqlalchemy.orm import Session
from backend.app.daos.admin_dao import AdminDAO

class AdminService:
    def __init__(self, db: Session):
        self.dao = AdminDAO(db)

    def obter_fila_interessados(self):
        return self.dao.listar_interessados()
