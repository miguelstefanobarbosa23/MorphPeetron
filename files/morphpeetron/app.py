"""Ponto de entrada do back-end morphpeetron (Flask).

Desenvolvimento:  python app.py
Produção:         gunicorn app:app
"""
from flask import Flask
from mysql.connector import Error as ErroMySQL

from config import Config
from models import ErroDeValidacao
from routes import registrar_blueprints
from utils.respostas import erro


def create_app():
    """Application Factory: cria e configura a aplicação Flask."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # JSON legível: mantém os acentos e a ordem dos campos definida nos modelos
    app.json.ensure_ascii = False
    app.json.sort_keys = False

    registrar_blueprints(app)
    registrar_tratadores_de_erro(app)
    return app


def registrar_tratadores_de_erro(app):
    """Garante que TODO erro volte em JSON (nunca HTML), facilitando o teste no Postman."""

    @app.errorhandler(ErroDeValidacao)
    def dados_invalidos(exc):
        return erro(str(exc), 400)

    @app.errorhandler(404)
    def rota_inexistente(_exc):
        return erro("Rota não encontrada.", 404)

    @app.errorhandler(405)
    def metodo_nao_permitido(_exc):
        return erro("Método HTTP não permitido para esta rota.", 405)

    @app.errorhandler(ErroMySQL)
    def erro_de_banco(exc):
        app.logger.exception("Erro de banco de dados: %s", exc)
        return erro("Erro ao acessar o banco de dados.", 500)


app = create_app()

if __name__ == "__main__":
    app.run(debug=Config.DEBUG)  # http://127.0.0.1:5000
