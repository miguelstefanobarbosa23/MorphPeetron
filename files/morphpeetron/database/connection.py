"""Conexão com o MySQL usando pool de conexões (uma conexão por operação de DAO)."""
import threading

from mysql.connector import pooling

from config import Config


class Database:
    """Fornece conexões do pool. O pool é criado uma única vez, no primeiro uso."""

    _pool = None
    _lock = threading.Lock()

    @classmethod
    def _criar_pool(cls):
        return pooling.MySQLConnectionPool(
            pool_name="morphpeetron_pool",
            pool_size=Config.DB_POOL_SIZE,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset="utf8mb4",
        )

    @classmethod
    def get_connection(cls):
        """Devolve uma conexão do pool. Chamar .close() devolve a conexão ao pool."""
        if cls._pool is None:
            with cls._lock:
                if cls._pool is None:  # checagem dupla: evita 2 pools em requisições simultâneas
                    cls._pool = cls._criar_pool()
        return cls._pool.get_connection()
