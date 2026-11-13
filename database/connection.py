"""Conexão com o SQLite: cria o banco, aplica o schema e entrega conexões.

O SQLite faz parte da biblioteca padrão do Python, então o projeto roda sem
instalar um servidor de banco de dados. O arquivo fica em ``instance/``.
"""
import sqlite3
import threading
from pathlib import Path

from config import Config


class Database:
    """Inicializa o banco uma única vez e fornece conexões curtas por operação."""

    _inicializado = False
    _lock = threading.Lock()

    @classmethod
    def inicializar(cls):
        """Cria a pasta, aplica o schema e insere os dados de demonstração."""
        if cls._inicializado:
            return

        with cls._lock:
            if cls._inicializado:
                return

            caminho = Path(Config.DB_PATH)
            caminho.parent.mkdir(parents=True, exist_ok=True)

            schema = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
            conexao = sqlite3.connect(caminho)
            try:
                conexao.executescript(schema)
                conexao.commit()
                if Config.SEED_DEMO:
                    from database.seed import semear

                    semear(conexao)
                    conexao.commit()
            finally:
                conexao.close()

            cls._inicializado = True

    @classmethod
    def get_connection(cls):
        """Abre uma conexão com linhas acessíveis por nome de coluna."""
        cls.inicializar()
        conexao = sqlite3.connect(Config.DB_PATH, timeout=15)
        conexao.row_factory = sqlite3.Row
        conexao.execute("PRAGMA foreign_keys = ON")
        return conexao
