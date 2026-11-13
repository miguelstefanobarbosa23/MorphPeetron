"""Rotas de autenticação: /api/profissoes, /api/cadastro e /api/login."""
from flask import Blueprint, jsonify

from database import IntegrityError

from daos import UsuarioDAO
from models import Usuario
from utils.auth import gerar_token
from utils.respostas import erro, obter_json

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

usuario_dao = UsuarioDAO()


@auth_bp.get("/profissoes")
def listar_profissoes():
    """GET /api/profissoes -> opções da tela 'Seleção de Profissão'."""
    return jsonify({"profissoes": list(Usuario.PROFISSOES_VALIDAS)})


@auth_bp.post("/cadastro")
def cadastro():
    """POST /api/cadastro  {nome, email, senha, profissao} -> 201 com o usuário criado."""
    dados = obter_json()
    usuario = Usuario(
        nome=dados.get("nome"),
        email=dados.get("email"),
        profissao=dados.get("profissao"),
    )
    senha = dados.get("senha")

    erros = usuario.validar() + Usuario.validar_senha(senha)
    if erros:
        return erro("Dados inválidos.", 400, erros)

    usuario.definir_senha(senha)  # guarda apenas o hash
    try:
        usuario_dao.inserir(usuario)
    except IntegrityError:  # UNIQUE do e-mail (vale também em requisições simultâneas)
        return erro("Este e-mail já está cadastrado.", 409)

    return jsonify(usuario_dao.buscar_por_id(usuario.id).to_dict()), 201


@auth_bp.post("/login")
def login():
    """POST /api/login  {email, senha} -> 200 com {token, usuario}."""
    dados = obter_json()
    email = dados.get("email")
    senha = dados.get("senha")
    if not isinstance(email, str) or not isinstance(senha, str):
        return erro("Informe 'email' e 'senha'.", 400)

    usuario = usuario_dao.buscar_por_email(email.strip().lower())
    # Mesma mensagem para e-mail inexistente e senha errada (não revela qual dos dois falhou)
    if usuario is None or not usuario.verificar_senha(senha):
        return erro("E-mail ou senha incorretos.", 401)

    return jsonify({"token": gerar_token(usuario), "usuario": usuario.to_dict()})
