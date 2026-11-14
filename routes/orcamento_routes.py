"""Rotas de orçamentos: /api/orcamentos (CRUD completo + filtros combináveis)."""
from flask import Blueprint, jsonify, request

from daos import OrcamentoDAO, UsuarioDAO
from models import Orcamento
from utils.auth import token_required
from utils.respostas import erro, obter_json

orcamento_bp = Blueprint("orcamentos", __name__, url_prefix="/api/orcamentos")

orcamento_dao = OrcamentoDAO()
usuario_dao = UsuarioDAO()


def _montar_orcamento(dados):
    """Cria um Orcamento a partir do JSON (levanta ErroDeValidacao se algum campo for inválido)."""
    return Orcamento(
        nome_cliente=dados.get("nome_cliente"),
        engenheiro_id=dados.get("engenheiro_id"),
        descricao=dados.get("descricao"),
        valor_material=dados.get("valor_material"),
        valor_mao_obra=dados.get("valor_mao_obra"),
        status=dados.get("status"),
    )


def _validar_engenheiro(orcamento):
    """Confere no banco se o engenheiro responsável realmente existe."""
    if orcamento.engenheiro_id is not None:
        engenheiro = usuario_dao.buscar_por_id(orcamento.engenheiro_id)
        if engenheiro is None or not engenheiro.eh_engenheiro():
            return ["'engenheiro_id' deve ser o id de um usuário com profissão Engenheiro."]
    return []


@orcamento_bp.get("")
@token_required
def listar_orcamentos():
    """GET /api/orcamentos  (filtros opcionais: ?engenheiro_id=1&status=Enviado)."""
    engenheiro_id = request.args.get("engenheiro_id", type=int)
    status = request.args.get("status")
    if status and status not in Orcamento.STATUS_VALIDOS:
        return erro("Status inválido. Use: " + ", ".join(Orcamento.STATUS_VALIDOS) + ".", 400)
    orcamentos = orcamento_dao.listar_todos(engenheiro_id, status)
    return jsonify([o.to_dict() for o in orcamentos])


@orcamento_bp.post("")
@token_required
def criar_orcamento():
    """POST /api/orcamentos {nome_cliente, engenheiro_id, valor_material, valor_mao_obra, ...}."""
    orcamento = _montar_orcamento(obter_json())
    erros = orcamento.validar() + _validar_engenheiro(orcamento)
    if erros:
        return erro("Dados inválidos.", 400, erros)

    orcamento_dao.inserir(orcamento)
    return jsonify(orcamento_dao.buscar_por_id(orcamento.id).to_dict()), 201


@orcamento_bp.get("/<int:orcamento_id>")
@token_required
def detalhar_orcamento(orcamento_id):
    """GET /api/orcamentos/<id> -> detalhes (com nome do engenheiro)."""
    orcamento = orcamento_dao.buscar_por_id(orcamento_id)
    if orcamento is None:
        return erro("Orçamento não encontrado.", 404)
    return jsonify(orcamento.to_dict())


@orcamento_bp.put("/<int:orcamento_id>")
@token_required
def atualizar_orcamento(orcamento_id):
    """PUT /api/orcamentos/<id>. Campos omitidos no JSON mantêm o valor atual."""
    atual = orcamento_dao.buscar_por_id(orcamento_id)
    if atual is None:
        return erro("Orçamento não encontrado.", 404)

    orcamento = _montar_orcamento({**atual.to_dict(), **obter_json()})
    orcamento.id = orcamento_id
    erros = orcamento.validar() + _validar_engenheiro(orcamento)
    if erros:
        return erro("Dados inválidos.", 400, erros)

    orcamento_dao.atualizar(orcamento)
    return jsonify(orcamento_dao.buscar_por_id(orcamento_id).to_dict())


@orcamento_bp.delete("/<int:orcamento_id>")
@token_required
def deletar_orcamento(orcamento_id):
    """DELETE /api/orcamentos/<id> -> 204."""
    if not orcamento_dao.deletar(orcamento_id):
        return erro("Orçamento não encontrado.", 404)
    return "", 204
