"""Configurações da aplicação (lidas de variáveis de ambiente / arquivo .env)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Centraliza as configurações. Nada sensível fica fixo no código."""

    # --- Flask ---
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"
    SECRET_KEY = os.getenv(
        "SECRET_KEY", "dev-only-troque-esta-chave-em-producao-0000"
    )
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "0") == "1"

    # --- Banco de dados (SQLite) ---
    # O arquivo é criado automaticamente na primeira execução.
    DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "instance" / "morphpeetron.db"))
    SEED_DEMO = os.getenv("SEED_DEMO", "1") == "1"

    # --- Servidor local ---
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5000"))
    AUTO_OPEN_BROWSER = os.getenv("AUTO_OPEN_BROWSER", "1") == "1"

    # --- Autenticação (JWT da API) ---
    JWT_EXPIRA_HORAS = int(os.getenv("JWT_EXPIRA_HORAS", "8"))
