"""Modelo Usuario: engenheiros e demais profissionais que acessam o sistema."""
from werkzeug.security import check_password_hash, generate_password_hash

from .base_model import EMAIL_REGEX, BaseModel


class Usuario(BaseModel):
    """Usuário do sistema. A senha nunca é guardada em texto puro, apenas o hash."""

    # Opções da tela "Seleção de Profissão" (ajuste conforme o seu wireframe)
    PROFISSOES_VALIDAS = ("Engenheiro", "Arquiteto", "Técnico", "Administrador")
    PROFISSAO_ENGENHEIRO = "Engenheiro"
    TAMANHO_MIN_SENHA = 6

    _campos_ocultos = ("senha_hash",)  # o hash nunca vai para o JSON

    def __init__(self, nome, email, senha_hash=None, profissao="Engenheiro",
                 id=None, criado_em=None):
        self.id = id
        self.nome = self.normalizar_texto(nome) or ""
        self.email = (self.normalizar_texto(email) or "").lower()
        self.senha_hash = senha_hash
        self.profissao = self.normalizar_texto(profissao)
        self.criado_em = criado_em

    # ------------------------------ Senha ------------------------------
    def definir_senha(self, senha):
        """Gera e guarda o hash da senha (PBKDF2, compatível com qualquer sistema)."""
        self.senha_hash = generate_password_hash(senha, method="pbkdf2:sha256")

    def verificar_senha(self, senha):
        """True se a senha informada confere com o hash armazenado."""
        return bool(self.senha_hash) and check_password_hash(self.senha_hash, senha)

    @classmethod
    def validar_senha(cls, senha):
        """Valida a senha em texto puro (antes de gerar o hash). Devolve lista de erros."""
        if not isinstance(senha, str) or len(senha) < cls.TAMANHO_MIN_SENHA:
            return [f"A senha deve ter pelo menos {cls.TAMANHO_MIN_SENHA} caracteres."]
        return []

    # ------------------------------ Regras ------------------------------
    def eh_engenheiro(self):
        return self.profissao == self.PROFISSAO_ENGENHEIRO

    def validar(self):
        erros = []
        if len(self.nome) < 3:
            erros.append("O nome deve ter pelo menos 3 caracteres.")
        if not EMAIL_REGEX.match(self.email):
            erros.append("E-mail inválido.")
        if self.profissao not in self.PROFISSOES_VALIDAS:
            erros.append("Profissão inválida. Opções: " + ", ".join(self.PROFISSOES_VALIDAS) + ".")
        return erros
