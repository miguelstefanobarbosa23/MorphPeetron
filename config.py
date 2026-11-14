"""Configurações da aplicação (lidas de variáveis de ambiente / arquivo .env)."""
import os

from dotenv import load_dotenv

load_dotenv()  # carrega o .env da raiz do projeto, se existir


class Config:
    """Centraliza as configurações. Nada sensível fica fixo no código."""

    # --- Flask ---
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"
    # Também é a chave que assina os tokens JWT. Troque em produção!
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-troque-esta-chave-em-producao-0000")

    # --- Banco de dados (MySQL) ---
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "morphpeetron")
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))

    # --- Autenticação (JWT) ---
    JWT_EXPIRA_HORAS = int(os.getenv("JWT_EXPIRA_HORAS", "8"))
