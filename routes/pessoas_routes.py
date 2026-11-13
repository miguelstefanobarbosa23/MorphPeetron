"""Rotas de 'Gestão de Pessoas': listagem de engenheiros e CRUD de clientes."""
from flask import Blueprint, jsonify

from database import IntegrityError

from daos import ClienteDAO, UsuarioDAO
from models import Cliente, Usuario
from utils.auth import token_required
from utils.respostas import erro, obter_json

pessoas_bp = Blueprint("pessoas", __name__, url_prefix="/api")

usuario_dao = UsuarioDAO()
cliente_dao = ClienteDAO()


def _montar_cliente(dados):
    """Cria um Cliente a partir do JSON (só lê os campos permitidos)."""
    return Cliente(
        nome=dados.get("nome"),
        email=dados.get("email"),
        telefone=dados.get("telefone"),
        documento=dados.get("documento"),
        endereco=dados.get("endereco"),
    )


# ------------------------------ Engenheiros ------------------------------
@pessoas_bp.get("/engenheiros")
@token_required
def listar_engenheiros():
    """GET /api/engenheiros -> usuários com profissão Engenheiro."""
    engenheiros = usuario_dao.listar_por_profissao(Usuario.PROFISSAO_ENGENHEIRO)
    return jsonify([e.to_dict() for e in engenheiros])


# ------------------------------- Clientes --------------------------------
@pessoas_bp.get("/clientes")
@token_required
def listar_clientes():
    """GET /api/clientes -> todos os clientes."""
    return jsonify([c.to_dict() for c in cliente_dao.listar_todos()])


@pessoas_bp.post("/clientes")
@token_required
def criar_cliente():
    """POST /api/clientes  {nome, email?, telefone?, documento?, endereco?}."""
    cliente = _montar_cliente(obter_json())
    erros = cliente.validar()
    if erros:
        return erro("Dados inválidos.", 400, erros)

    try:
        cliente_dao.inserir(cliente)
    except IntegrityError:  # UNIQUE do documento
        return erro("Já existe um cliente com este documento.", 409)
    return jsonify(cliente_dao.buscar_por_id(cliente.id).to_dict()), 201


@pessoas_bp.get("/clientes/<int:cliente_id>")
@token_required
def detalhar_cliente(cliente_id):
    """GET /api/clientes/<id>."""
    cliente = cliente_dao.buscar_por_id(cliente_id)
    if cliente is None:
        return erro("Cliente não encontrado.", 404)
    return jsonify(cliente.to_dict())


@pessoas_bp.put("/clientes/<int:cliente_id>")
@token_required
def atualizar_cliente(cliente_id):
    """PUT /api/clientes/<id>. Campos omitidos no JSON mantêm o valor atual."""
    atual = cliente_dao.buscar_por_id(cliente_id)
    if atual is None:
        return erro("Cliente não encontrado.", 404)

    cliente = _montar_cliente({**atual.to_dict(), **obter_json()})
    cliente.id = cliente_id
    erros = cliente.validar()
    if erros:
        return erro("Dados inválidos.", 400, erros)

    try:
        cliente_dao.atualizar(cliente)
    except IntegrityError:
        return erro("Já existe um cliente com este documento.", 409)
    return jsonify(cliente_dao.buscar_por_id(cliente_id).to_dict())


@pessoas_bp.delete("/clientes/<int:cliente_id>")
@token_required
def deletar_cliente(cliente_id):
    """DELETE /api/clientes/<id> -> 204. As obras do cliente ficam sem cliente (SET NULL)."""
    if not cliente_dao.deletar(cliente_id):
        return erro("Cliente não encontrado.", 404)
    return "", 204
