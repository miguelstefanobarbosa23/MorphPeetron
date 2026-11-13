"""Camada de conexão com o banco de dados SQLite."""
from sqlite3 import IntegrityError

from .connection import Database

__all__ = ["Database", "IntegrityError"]
