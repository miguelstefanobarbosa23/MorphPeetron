"""Helpers para padronizar as respostas e a leitura do JSON da API."""
from flask import jsonify, request


def erro(mensagem, status=400, detalhes=None):
    """Resposta de erro padronizada: {"erro": "...", "detalhes": [...]}."""
    corpo = {"erro": mensagem}
    if detalhes:
        corpo["detalhes"] = detalhes
    return jsonify(corpo), status


def obter_json():
    """Lê o corpo JSON da requisição. Se estiver ausente ou inválido, devolve {}.

    force=True evita falhas quando o Postman/Insomnia não envia o header Content-Type.
    """
    dados = request.get_json(force=True, silent=True)
    return dados if isinstance(dados, dict) else {}
