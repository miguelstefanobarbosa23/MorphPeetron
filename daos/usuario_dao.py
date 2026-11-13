"""DAO da tabela 'usuarios' (CRUD em SQL puro)."""
from models import Usuario

from .base_dao import BaseDAO


class UsuarioDAO(BaseDAO):
    """Acesso a dados de usuários."""

    # ------------------------------ CREATE ------------------------------
    def inserir(self, usuario):
        """Insere o usuário, preenche usuario.id e devolve o novo id."""
        sql = """
            INSERT INTO usuarios (nome, email, senha_hash, profissao)
            VALUES (?, ?, ?, ?)
        """
        usuario.id, _ = self._executar(
            sql, (usuario.nome, usuario.email, usuario.senha_hash, usuario.profissao))
        return usuario.id

    # ------------------------------- READ -------------------------------
    def buscar_por_id(self, usuario_id):
        linha = self._buscar_um("SELECT * FROM usuarios WHERE id = ?", (usuario_id,))
        return Usuario.from_row(linha)

    def buscar_por_email(self, email):
        linha = self._buscar_um("SELECT * FROM usuarios WHERE email = ?", (email,))
        return Usuario.from_row(linha)

    def listar_todos(self):
        linhas = self._buscar_varios("SELECT * FROM usuarios ORDER BY nome")
        return [Usuario.from_row(linha) for linha in linhas]

    def listar_por_profissao(self, profissao):
        """Ex.: listar_por_profissao('Engenheiro') para a tela de Gestão de Pessoas."""
        linhas = self._buscar_varios(
            "SELECT * FROM usuarios WHERE profissao = ? ORDER BY nome", (profissao,))
        return [Usuario.from_row(linha) for linha in linhas]

    # ------------------------------ UPDATE ------------------------------
    def atualizar(self, usuario):
        """Atualiza todos os campos editáveis. Verifique a existência antes (buscar_por_id)."""
        sql = """
            UPDATE usuarios
               SET nome = ?, email = ?, senha_hash = ?, profissao = ?
             WHERE id = ?
        """
        self._executar(
            sql, (usuario.nome, usuario.email, usuario.senha_hash, usuario.profissao, usuario.id))

    # ------------------------------ DELETE ------------------------------
    def deletar(self, usuario_id):
        """Remove o usuário. Retorna True se havia um registro para remover."""
        _, linhas = self._executar("DELETE FROM usuarios WHERE id = ?", (usuario_id,))
        return linhas > 0
