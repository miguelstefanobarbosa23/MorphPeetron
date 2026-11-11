"""Rotas de equipamentos: /api/equipamentos (listar, criar, atualizar status, CRUD)."""
from flask import Blueprint, jsonify, request

from daos import EquipamentoDAO, UsuarioDAO
from models import Equipamento
from utils.auth import token_required
from utils.respostas import erro, obter_json

equipamento_bp = Blueprint("equipamentos", __name__, url_prefix="/api/equipamentos")

equipamento_dao = EquipamentoDAO()
usuario_dao = UsuarioDAO()


def _montar_equipamento(dados):
    """Cria um Equipamento a partir do JSON (só lê os campos permitidos)."""
    return Equipamento(
        nome=dados.get("nome"),
        status=dados.get("status"),
        data_ultima_manutencao=dados.get("data_ultima_manutencao"),
        responsavel_id=dados.get("responsavel_id"),
    )


def _validar_responsavel(equipamento):
    """Se um responsável foi informado, ele precisa existir em 'usuarios'."""
    if (equipamento.responsavel_id is not None
            and usuario_dao.buscar_por_id(equipamento.responsavel_id) is None):
        return ["'responsavel_id' não corresponde a um usuário existente."]
    return []


@equipamento_bp.get("")
@token_required
def listar_equipamentos():
    """GET /api/equipamentos  (filtro opcional: ?status=Ativo ou ?status=Em manutenção)."""
    status = request.args.get("status")
    if status and status not in Equipamento.STATUS_VALIDOS:
        return erro("Status inválido. Use: " + ", ".join(Equipamento.STATUS_VALIDOS) + ".", 400)
    return jsonify([e.to_dict() for e in equipamento_dao.listar_todos(status)])


@equipamento_bp.post("")
@token_required
def criar_equipamento():
    """POST /api/equipamentos  {nome, status?, data_ultima_manutencao?, responsavel_id?}."""
    equipamento = _montar_equipamento(obter_json())
    erros = equipamento.validar() + _validar_responsavel(equipamento)
    if erros:
        return erro("Dados inválidos.", 400, erros)

    equipamento_dao.inserir(equipamento)
    return jsonify(equipamento_dao.buscar_por_id(equipamento.id).to_dict()), 201


@equipamento_bp.get("/<int:equipamento_id>")
@token_required
def detalhar_equipamento(equipamento_id):
    """GET /api/equipamentos/<id>."""
    equipamento = equipamento_dao.buscar_por_id(equipamento_id)
    if equipamento is None:
        return erro("Equipamento não encontrado.", 404)
    return jsonify(equipamento.to_dict())


@equipamento_bp.put("/<int:equipamento_id>")
@token_required
def atualizar_equipamento(equipamento_id):
    """PUT /api/equipamentos/<id>. Campos omitidos no JSON mantêm o valor atual."""
    atual = equipamento_dao.buscar_por_id(equipamento_id)
    if atual is None:
        return erro("Equipamento não encontrado.", 404)

    equipamento = _montar_equipamento({**atual.to_dict(), **obter_json()})
    equipamento.id = equipamento_id
    erros = equipamento.validar() + _validar_responsavel(equipamento)
    if erros:
        return erro("Dados inválidos.", 400, erros)

    equipamento_dao.atualizar(equipamento)
    return jsonify(equipamento_dao.buscar_por_id(equipamento_id).to_dict())


@equipamento_bp.route("/<int:equipamento_id>/status", methods=["PUT", "PATCH"])
@token_required
def atualizar_status_equipamento(equipamento_id):
    """PUT/PATCH /api/equipamentos/<id>/status  {status, data_ultima_manutencao?}."""
    equipamento = equipamento_dao.buscar_por_id(equipamento_id)
    if equipamento is None:
        return erro("Equipamento não encontrado.", 404)

    dados = obter_json()
    # A regra de negócio fica no modelo (levanta ErroDeValidacao se o status for inválido)
    equipamento.alterar_status(dados.get("status"), dados.get("data_ultima_manutencao"))
    equipamento_dao.atualizar_status(
        equipamento.id, equipamento.status, equipamento.data_ultima_manutencao)
    return jsonify(equipamento.to_dict())


@equipamento_bp.delete("/<int:equipamento_id>")
@token_required
def deletar_equipamento(equipamento_id):
    """DELETE /api/equipamentos/<id> -> 204."""
    if not equipamento_dao.deletar(equipamento_id):
        return erro("Equipamento não encontrado.", 404)
    return "", 204
