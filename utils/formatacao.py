"""Filtros e helpers usados pelos templates HTML."""
from datetime import date, datetime


def formatar_data(valor):
    """Converte date/datetime/texto ISO em 'DD/MM/AAAA'."""
    if not valor:
        return "—"
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y")
    if isinstance(valor, date):
        return valor.strftime("%d/%m/%Y")
    try:
        return date.fromisoformat(str(valor)[:10]).strftime("%d/%m/%Y")
    except ValueError:
        return str(valor)


def data_iso(valor):
    """Devolve 'AAAA-MM-DD' para preencher inputs type=date."""
    if not valor:
        return ""
    if isinstance(valor, (date, datetime)):
        return valor.isoformat()[:10]
    return str(valor)[:10]


def iniciais(nome):
    """Devolve até duas iniciais para o avatar (ex.: 'Ana Beatriz' -> 'AB')."""
    partes = [parte for parte in (nome or "").split() if parte]
    if not partes:
        return "?"
    if len(partes) == 1:
        return partes[0][:2].upper()
    return (partes[0][0] + partes[-1][0]).upper()


def status_obra(obra):
    """Classifica a obra pelo prazo para exibir o selo de status."""
    hoje = date.today()
    if obra.data_fim and obra.data_fim < hoje:
        return {"rotulo": "Concluída", "classe": "concluida"}
    if obra.data_inicio and obra.data_inicio > hoje:
        return {"rotulo": "Planejada", "classe": "planejada"}
    return {"rotulo": "Em andamento", "classe": "andamento"}
