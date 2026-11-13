"""Proteção CSRF simples para os formulários HTML (sessão + token)."""
import hmac
import secrets

from flask import abort, request, session

METODOS_PROTEGIDOS = {"POST", "PUT", "PATCH", "DELETE"}


def csrf_token():
    """Devolve o token da sessão, criando-o na primeira chamada."""
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


def csrf_protegido():
    """Interrompe requisições de escrita sem o token correto."""
    if request.method not in METODOS_PROTEGIDOS:
        return

    esperado = session.get("_csrf_token")
    enviado = request.form.get("_csrf_token", "")
    if not esperado or not hmac.compare_digest(esperado, enviado):
        abort(
            400,
            description="Sua sessão expirou. Atualize a página e tente novamente.",
        )
