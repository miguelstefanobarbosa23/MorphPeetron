"""Modelo Equipamento: controle de status e da última manutenção."""
from .base_model import BaseModel, ErroDeValidacao


class Equipamento(BaseModel):
    """Equipamento com status (Ativo / Em manutenção) e responsável opcional."""

    STATUS_ATIVO = "Ativo"
    STATUS_EM_MANUTENCAO = "Em manutenção"
    STATUS_VALIDOS = (STATUS_ATIVO, STATUS_EM_MANUTENCAO)

    def __init__(self, nome, status="Ativo", data_ultima_manutencao=None,
                 responsavel_id=None, id=None, criado_em=None):
        self.id = id
        self.nome = self.normalizar_texto(nome) or ""
        self.status = self.normalizar_texto(status) or self.STATUS_ATIVO
        self.data_ultima_manutencao = self.converter_data(
            data_ultima_manutencao, "data_ultima_manutencao")
        self.responsavel_id = self.converter_inteiro(responsavel_id, "responsavel_id")
        self.criado_em = criado_em

    def alterar_status(self, novo_status, data_ultima_manutencao=None):
        """Regra de negócio: troca o status e, se informada, a data da última manutenção."""
        if novo_status not in self.STATUS_VALIDOS:
            raise ErroDeValidacao("Status inválido. Use: " + ", ".join(self.STATUS_VALIDOS) + ".")
        data = self.converter_data(data_ultima_manutencao, "data_ultima_manutencao")
        self.status = novo_status
        if data is not None:
            self.data_ultima_manutencao = data

    def validar(self):
        erros = []
        if len(self.nome) < 2:
            erros.append("O nome do equipamento é obrigatório.")
        if self.status not in self.STATUS_VALIDOS:
            erros.append("Status inválido. Use: " + ", ".join(self.STATUS_VALIDOS) + ".")
        return erros
