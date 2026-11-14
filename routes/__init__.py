"""Registro dos Blueprints (controllers) da API."""
from .auth_routes import auth_bp
from .equipamento_routes import equipamento_bp
from .obra_routes import obra_bp
from .orcamento_routes import orcamento_bp
from .pessoas_routes import pessoas_bp
from .resumo_routes import resumo_bp


def registrar_blueprints(app):
    """Anexa todos os Blueprints à aplicação."""
    for blueprint in (auth_bp, pessoas_bp, obra_bp, equipamento_bp, orcamento_bp, resumo_bp):
        app.register_blueprint(blueprint)
