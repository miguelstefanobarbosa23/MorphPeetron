"""Modelo Cliente: pessoa ou empresa para a qual as obras são executadas."""
from .base_model import EMAIL_REGEX, BaseModel


class Cliente(BaseModel):
    """Cliente. Apenas o nome é obrigatório; os demais campos são opcionais."""

    def __init__(self, nome, email=None, telefone=None, documento=None, endereco=None,
                 id=None, criado_em=None):
        self.id = id
        self.nome = self.normalizar_texto(nome) or ""
        email = self.normalizar_texto(email)
        self.email = email.lower() if email else None
        self.telefone = self.normalizar_texto(telefone)
        self.documento = self.normalizar_texto(documento)  # CPF/CNPJ ("" vira None: UNIQUE aceita vários NULL)
        self.endereco = self.normalizar_texto(endereco)
        self.criado_em = criado_em

    def validar(self):
        erros = []
        if len(self.nome) < 3:
            erros.append("O nome do cliente deve ter pelo menos 3 caracteres.")
        if self.email and not EMAIL_REGEX.match(self.email):
            erros.append("E-mail inválido.")
        return erros
