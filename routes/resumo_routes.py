"""Rota do painel: números resumidos do sistema para as telas de dashboard e relatórios."""
from datetime import date

from flask import Blueprint, jsonify

from daos import ClienteDAO, EquipamentoDAO, ObraDAO, OrcamentoDAO, UsuarioDAO
from models import Equipamento, Orcamento, Usuario
from utils.auth import token_required

resumo_bp = Blueprint("resumo", __name__, url_prefix="/api")

equipamento_dao = EquipamentoDAO()
obra_dao = ObraDAO()
orcamento_dao = OrcamentoDAO()
cliente_dao = ClienteDAO()
usuario_dao = UsuarioDAO()


@resumo_bp.get("/resumo")
@token_required
def resumo():
    """GET /api/resumo -> contadores e valores agregados (alimentam o painel)."""
    hoje = date.today()

    obras = obra_dao.listar_todos()
    obras_ativas = [o for o in obras if o.data_fim is None or o.data_fim >= hoje]

    equipamentos = equipamento_dao.listar_todos()
    ativos = [e for e in equipamentos if e.status == Equipamento.STATUS_ATIVO]

    orcamentos = orcamento_dao.listar_todos()
    por_status = {status: 0 for status in Orcamento.STATUS_VALIDOS}
    for orcamento in orcamentos:
        por_status[orcamento.status] += 1

    return jsonify({
        "obras": {
            "total": len(obras),
            "ativas": len(obras_ativas),
            "concluidas": len(obras) - len(obras_ativas),
        },
        "equipamentos": {
            "total": len(equipamentos),
            "ativos": len(ativos),
            "em_manutencao": len(equipamentos) - len(ativos),
        },
        "clientes": {"total": len(cliente_dao.listar_todos())},
        "engenheiros": {"total": len(usuario_dao.listar_por_profissao(Usuario.PROFISSAO_ENGENHEIRO))},
        "orcamentos": {
            "total": len(orcamentos),
            "por_status": por_status,
            "valor_total": round(sum(o.valor_total for o in orcamentos), 2),
            "valor_material": round(sum(o.valor_material for o in orcamentos), 2),
            "valor_mao_obra": round(sum(o.valor_mao_obra for o in orcamentos), 2),
            "valor_aprovado": round(sum(o.valor_total for o in orcamentos
                                        if o.status == Orcamento.STATUS_APROVADO), 2),
        },
    })
