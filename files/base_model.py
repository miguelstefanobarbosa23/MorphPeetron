"""Classe base dos modelos: serialização para JSON e conversões de dados de entrada."""
import re
from datetime import date, datetime

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ErroDeValidacao(ValueError):
    """Dado de entrada com formato inválido. O app.py converte esta exceção em HTTP 400."""


class BaseModel:
    """Comportamento comum a todas as entidades do domínio (herança)."""

    _campos_ocultos = ()  # atributos que NÃO saem no JSON (ex.: senha_hash)

    # ------------------------- Serialização -------------------------
    def to_dict(self):
        """Converte o objeto em dict serializável (datas viram texto ISO 'AAAA-MM-DD')."""
        dados = {}
        for chave, valor in self.__dict__.items():
            if chave in self._campos_ocultos:
                continue
            if isinstance(valor, (date, datetime)):
                valor = valor.isoformat()
            dados[chave] = valor
        return dados

    @classmethod
    def from_row(cls, linha):
        """Monta o objeto a partir de uma linha do banco (dict). Devolve None se não houver linha.

        As colunas do SELECT têm o mesmo nome dos parâmetros do __init__ de cada modelo.
        """
        return cls(**linha) if linha else None

    def validar(self):
        """Devolve a lista de erros de validação (vazia = válido). Sobrescrito nas subclasses."""
        return []

    # --------------- Conversões reutilizadas por modelos e rotas ---------------
    @staticmethod
    def normalizar_texto(valor):
        """Remove espaços das pontas; texto vazio vira None."""
        if valor is None:
            return None
        texto = str(valor).strip()
        return texto or None

    @staticmethod
    def converter_data(valor, campo="data"):
        """Aceita date, datetime ou 'AAAA-MM-DD' e devolve date (ou None)."""
        if valor in (None, ""):
            return None
        if isinstance(valor, datetime):  # datetime vem antes: ele é subclasse de date
            return valor.date()
        if isinstance(valor, date):
            return valor
        try:
            return datetime.strptime(str(valor), "%Y-%m-%d").date()
        except ValueError:
            raise ErroDeValidacao(f"'{campo}' deve estar no formato AAAA-MM-DD.") from None

    @staticmethod
    def converter_inteiro(valor, campo="valor"):
        """Converte para int (ou None). Levanta ErroDeValidacao se não for inteiro."""
        if valor in (None, ""):
            return None
        if isinstance(valor, bool):
            raise ErroDeValidacao(f"'{campo}' deve ser um número inteiro.")
        try:
            return int(valor)
        except (TypeError, ValueError):
            raise ErroDeValidacao(f"'{campo}' deve ser um número inteiro.") from None
