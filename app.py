"""Ponto de entrada do back-end morphpeetron (Flask).

Desenvolvimento:  python app.py   ->  http://127.0.0.1:5000  (API + front-end na mesma origem)
Produção:         gunicorn app:app
"""
import logging

from flask import Flask, send_from_directory
from flask_cors import CORS
from mysql.connector import Error as ErroMySQL

from config import Config
from database.bootstrap import inicializar_banco
from models import ErroDeValidacao
from routes import registrar_blueprints
from utils.respostas import erro

logging.basicConfig(  # mostra os avisos do bootstrap/seed direto no console
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)


def create_app():
    """Application Factory: cria e configura a aplicação Flask."""
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    app.config.from_object(Config)

    # JSON legível: mantém os acentos e a ordem dos campos definida nos modelos
    app.json.ensure_ascii = False
    app.json.sort_keys = False

    # CORS liberado para a API: permite testar o front-end por outro endereço/porta
    # (ex.: Live Server na 5500) durante o desenvolvimento. Em produção, restringir origens.
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    registrar_blueprints(app)
    registrar_tratadores_de_erro(app)
    registrar_rotas_do_front(app)

    # Cria o banco/tabelas e popula os dados de demonstração (só se estiverem vazios)
    inicializar_banco()
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


def registrar_rotas_do_front(app):
    """Serve a interface (static/index.html) na raiz: uma única origem, zero problema de CORS."""

    @app.get("/")
    def front():
        return send_from_directory(app.static_folder, "index.html")


app = create_app()

if __name__ == "__main__":
    app.run(debug=Config.DEBUG)  # http://127.0.0.1:5000
