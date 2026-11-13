"""DAO da tabela 'clientes' (CRUD em SQL puro)."""
from models import Cliente

from .base_dao import BaseDAO


class ClienteDAO(BaseDAO):
    """Acesso a dados de clientes."""

    # ------------------------------ CREATE ------------------------------
    def inserir(self, cliente):
        """Insere o cliente, preenche cliente.id e devolve o novo id."""
        sql = """
            INSERT INTO clientes (nome, email, telefone, documento, endereco)
            VALUES (?, ?, ?, ?, ?)
        """
        cliente.id, _ = self._executar(
            sql, (cliente.nome, cliente.email, cliente.telefone, cliente.documento, cliente.endereco))
        return cliente.id

    # ------------------------------- READ -------------------------------
    def buscar_por_id(self, cliente_id):
        linha = self._buscar_um("SELECT * FROM clientes WHERE id = ?", (cliente_id,))
        return Cliente.from_row(linha)

    def listar_todos(self):
        linhas = self._buscar_varios("SELECT * FROM clientes ORDER BY nome")
        return [Cliente.from_row(linha) for linha in linhas]

    # ------------------------------ UPDATE ------------------------------
    def atualizar(self, cliente):
        """Atualiza todos os campos editáveis. Verifique a existência antes (buscar_por_id)."""
        sql = """
            UPDATE clientes
               SET nome = ?, email = ?, telefone = ?, documento = ?, endereco = ?
             WHERE id = ?
        """
        self._executar(
            sql, (cliente.nome, cliente.email, cliente.telefone, cliente.documento,
                  cliente.endereco, cliente.id))

    # ------------------------------ DELETE ------------------------------
    def deletar(self, cliente_id):
        """Remove o cliente. Retorna True se havia um registro para remover."""
        _, linhas = self._executar("DELETE FROM clientes WHERE id = ?", (cliente_id,))
        return linhas > 0
