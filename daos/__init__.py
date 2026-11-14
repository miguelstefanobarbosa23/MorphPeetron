"""DAOs (Data Access Objects): única camada que conversa com o banco de dados."""
from .base_dao import BaseDAO
from .cliente_dao import ClienteDAO
from .equipamento_dao import EquipamentoDAO
from .obra_dao import ObraDAO
from .orcamento_dao import OrcamentoDAO
from .usuario_dao import UsuarioDAO

__all__ = ["BaseDAO", "UsuarioDAO", "ClienteDAO", "ObraDAO", "EquipamentoDAO",
           "OrcamentoDAO"]
