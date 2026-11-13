"""Rotas de obras: /api/obras e /api/obras/<id> (CRUD completo)."""
from flask import Blueprint, jsonify, request

from daos import ClienteDAO, ObraDAO, UsuarioDAO
from models import Obra
from utils.auth import token_required
from utils.respostas import erro, obter_json

obra_bp = Blueprint("obras", __name__, url_prefix="/api/obras")

obra_dao = ObraDAO()
usuario_dao = UsuarioDAO()
cliente_dao = ClienteDAO()


def _montar_obra(dados):
    """Cria um Obra a partir do JSON (levanta ErroDeValidacao se algum campo tiver formato inválido)."""
    return Obra(
        nome=dados.get("nome"),
        descricao=dados.get("descricao"),
        data_inicio=dados.get("data_inicio"),
        data_fim=dados.get("data_fim"),
        engenheiro_id=dados.get("engenheiro_id"),
        cliente_id=dados.get("cliente_id"),
    )


def _validar_referencias(obra):
    """Confere no banco se o engenheiro (e o cliente, se informado) realmente existem."""
    erros = []
    if obra.engenheiro_id is not None:
        engenheiro = usuario_dao.buscar_por_id(obra.engenheiro_id)
        if engenheiro is None or not engenheiro.eh_engenheiro():
            erros.append("'engenheiro_id' deve ser o id de um usuário com profissão Engenheiro.")
    if obra.cliente_id is not None and cliente_dao.buscar_por_id(obra.cliente_id) is None:
        erros.append("'cliente_id' não encontrado.")
    return erros


@obra_bp.get("")
@token_required
def listar_obras():
    """GET /api/obras  (filtro opcional: ?engenheiro_id=1)."""
    engenheiro_id = request.args.get("engenheiro_id", type=int)
    obras = obra_dao.listar_todos(engenheiro_id)
    return jsonify([o.to_dict() for o in obras])


@obra_bp.post("")
@token_required
def criar_obra():
    """POST /api/obras  {nome, data_inicio, engenheiro_id, descricao?, data_fim?, cliente_id?}."""
    obra = _montar_obra(obter_json())
    erros = obra.validar() + _validar_referencias(obra)
    if erros:
        return erro("Dados inválidos.", 400, erros)

    obra_dao.inserir(obra)
    return jsonify(obra_dao.buscar_por_id(obra.id).to_dict()), 201


@obra_bp.get("/<int:obra_id>")
@token_required
def detalhar_obra(obra_id):
    """GET /api/obras/<id> -> detalhes da obra (com nome do engenheiro e do cliente)."""
    obra = obra_dao.buscar_por_id(obra_id)
    if obra is None:
        return erro("Obra não encontrada.", 404)
    return jsonify(obra.to_dict())


@obra_bp.put("/<int:obra_id>")
@token_required
def atualizar_obra(obra_id):
    """PUT /api/obras/<id>. Campos omitidos no JSON mantêm o valor atual."""
    atual = obra_dao.buscar_por_id(obra_id)
    if atual is None:
        return erro("Obra não encontrada.", 404)

    obra = _montar_obra({**atual.to_dict(), **obter_json()})
    obra.id = obra_id
    erros = obra.validar() + _validar_referencias(obra)
    if erros:
        return erro("Dados inválidos.", 400, erros)

    obra_dao.atualizar(obra)
    return jsonify(obra_dao.buscar_por_id(obra_id).to_dict())


@obra_bp.delete("/<int:obra_id>")
@token_required
def deletar_obra(obra_id):
    """DELETE /api/obras/<id> -> 204."""
    if not obra_dao.deletar(obra_id):
        return erro("Obra não encontrada.", 404)
    return "", 204
