"""Ponto de entrada do MorphPeetron (Flask + SQLite).

Desenvolvimento:  python app.py
Produção:         gunicorn app:app
"""
import sqlite3
import threading
import webbrowser
from datetime import date

from flask import Flask, flash, g, redirect, render_template, request, url_for

from config import Config
from database.connection import Database
from models import ErroDeValidacao
from routes import registrar_blueprints
from utils.csrf import csrf_token
from utils.formatacao import data_iso, formatar_data, iniciais, status_obra
from utils.respostas import erro


def create_app():
    """Application Factory: cria e configura a aplicação Flask."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # JSON legível: mantém os acentos e a ordem dos campos definida nos modelos
    app.json.ensure_ascii = False
    app.json.sort_keys = False

    # Garante que o banco SQLite exista antes da primeira requisição
    Database.inicializar()

    registrar_blueprints(app)
    registrar_tratadores_de_erro(app)
    registrar_contexto(app)
    return app


def _quer_json():
    return request.path.startswith("/api")


def registrar_tratadores_de_erro(app):
    """Respostas JSON para a API e páginas amigáveis para o site."""

    @app.errorhandler(ErroDeValidacao)
    def dados_invalidos(exc):
        if _quer_json():
            return erro(str(exc), 400)
        flash(str(exc), "error")
        return redirect(request.referrer or url_for("web.dashboard"))

    @app.errorhandler(400)
    def requisicao_invalida(exc):
        mensagem = getattr(exc, "description", None) or "Não foi possível processar a solicitação."
        if _quer_json():
            return erro(mensagem, 400)
        return (
            render_template(
                "erro.html",
                codigo=400,
                titulo="Não foi possível continuar",
                mensagem=mensagem,
            ),
            400,
        )

    @app.errorhandler(403)
    def acesso_negado(_exc):
        if _quer_json():
            return erro("Você não tem permissão para acessar este recurso.", 403)
        return (
            render_template(
                "erro.html",
                codigo=403,
                titulo="Acesso negado",
                mensagem="Você não tem permissão para abrir esta página.",
            ),
            403,
        )

    @app.errorhandler(404)
    def rota_inexistente(_exc):
        if _quer_json():
            return erro("Rota não encontrada.", 404)
        return (
            render_template(
                "erro.html",
                codigo=404,
                titulo="Página não encontrada",
                mensagem="O endereço que você procurou não existe ou foi movido.",
            ),
            404,
        )

    @app.errorhandler(405)
    def metodo_nao_permitido(_exc):
        if _quer_json():
            return erro("Método HTTP não permitido para esta rota.", 405)
        return (
            render_template(
                "erro.html",
                codigo=405,
                titulo="Ação não permitida",
                mensagem="Este endereço não aceita esse tipo de requisição.",
            ),
            405,
        )

    @app.errorhandler(sqlite3.Error)
    def erro_de_banco(exc):
        app.logger.exception("Erro de banco de dados: %s", exc)
        if _quer_json():
            return erro("Erro ao acessar o banco de dados.", 500)
        return (
            render_template(
                "erro.html",
                codigo=500,
                titulo="Erro no banco de dados",
                mensagem="Não foi possível acessar os dados. Tente novamente em instantes.",
            ),
            500,
        )

    @app.errorhandler(500)
    def erro_interno(exc):
        app.logger.exception("Erro interno: %s", exc)
        if _quer_json():
            return erro("Erro interno do servidor.", 500)
        return (
            render_template(
                "erro.html",
                codigo=500,
                titulo="Algo deu errado",
                mensagem="Ocorreu um erro inesperado. Tente novamente em instantes.",
            ),
            500,
        )


def registrar_contexto(app):
    """Deixa helpers e o usuário logado disponíveis em todos os templates."""
    app.jinja_env.globals.update(
        data_iso=data_iso,
        formatar_data=formatar_data,
        iniciais=iniciais,
        status_obra=status_obra,
        csrf_token=csrf_token,
    )

    @app.context_processor
    def injetar_usuario():
        return {
            "usuario_logado": getattr(g, "usuario", None),
            "ano_atual": date.today().year,
        }


app = create_app()


def _url_local():
    host = Config.HOST
    if host in ("0.0.0.0", "::", ""):
        host = "127.0.0.1"
    return f"http://{host}:{Config.PORT}"


if __name__ == "__main__":
    endereco = _url_local()
    print()
    print("  MorphPeetron iniciado")
    print(f"  Abra no navegador: {endereco}")
    print("  Conta demo: engenheiro@morphpeetron.com / engenheiro123")
    print()

    if Config.AUTO_OPEN_BROWSER:
        threading.Timer(1.2, lambda: webbrowser.open(endereco)).start()

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        use_reloader=False,
    )
