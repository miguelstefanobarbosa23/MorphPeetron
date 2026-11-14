"""Autenticação por token JWT: geração do token e decorator que protege as rotas."""
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, request

from config import Config
from utils.respostas import erro


def gerar_token(usuario):
    """Cria um JWT assinado, com validade definida em Config.JWT_EXPIRA_HORAS."""
    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario.id),  # o PyJWT exige que 'sub' seja string
        "profissao": usuario.profissao,
        "iat": agora,
        "exp": agora + timedelta(hours=Config.JWT_EXPIRA_HORAS),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def token_required(funcao):
    """Decorator: exige o header 'Authorization: Bearer <token>'.

    Uso (o decorator da rota vem POR CIMA):
        @bp.get("/algo")
        @token_required
        def minha_rota(): ...
    """

    @wraps(funcao)
    def protegida(*args, **kwargs):
        cabecalho = request.headers.get("Authorization", "")
        if not cabecalho.startswith("Bearer "):
            return erro("Token ausente. Envie o header 'Authorization: Bearer <token>'.", 401)

        try:
            payload = jwt.decode(cabecalho[7:].strip(), Config.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return erro("Token expirado. Faça login novamente.", 401)
        except jwt.InvalidTokenError:
            return erro("Token inválido.", 401)

        g.usuario_id = int(payload["sub"])  # disponível dentro das rotas protegidas
        return funcao(*args, **kwargs)

    return protegida
