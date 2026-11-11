"""Modelo Obra: obra de engenharia com período de execução e engenheiro responsável."""
from .base_model import BaseModel


class Obra(BaseModel):
    """Obra com engenheiro responsável (obrigatório) e cliente (opcional)."""

    def __init__(self, nome, data_inicio, engenheiro_id, descricao=None, data_fim=None,
                 cliente_id=None, id=None, criado_em=None,
                 engenheiro_nome=None, cliente_nome=None):
        self.id = id
        self.nome = self.normalizar_texto(nome) or ""
        self.descricao = self.normalizar_texto(descricao)
        self.data_inicio = self.converter_data(data_inicio, "data_inicio")
        self.data_fim = self.converter_data(data_fim, "data_fim")
        self.engenheiro_id = self.converter_inteiro(engenheiro_id, "engenheiro_id")
        self.cliente_id = self.converter_inteiro(cliente_id, "cliente_id")
        self.criado_em = criado_em
        # Somente leitura: preenchidos pelo JOIN nas consultas (não são colunas de 'obras')
        self.engenheiro_nome = engenheiro_nome
        self.cliente_nome = cliente_nome

    def validar(self):
        erros = []
        if len(self.nome) < 3:
            erros.append("O nome da obra deve ter pelo menos 3 caracteres.")
        if self.data_inicio is None:
            erros.append("'data_inicio' é obrigatória (AAAA-MM-DD).")
        if self.engenheiro_id is None:
            erros.append("'engenheiro_id' é obrigatório.")
        if self.data_inicio and self.data_fim and self.data_fim < self.data_inicio:
            erros.append("'data_fim' não pode ser anterior a 'data_inicio'.")
        return erros
