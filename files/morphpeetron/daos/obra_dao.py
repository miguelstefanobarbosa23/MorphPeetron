"""DAO da tabela 'obras' (CRUD em SQL puro)."""
from models import Obra

from .base_dao import BaseDAO


class ObraDAO(BaseDAO):
    """Acesso a dados de obras. As leituras já trazem o nome do engenheiro e do cliente (JOIN)."""

    # Parte comum das consultas de leitura (constante: não contém dados do usuário)
    _SELECT_COM_JOIN = """
        SELECT o.*, u.nome AS engenheiro_nome, c.nome AS cliente_nome
          FROM obras o
          JOIN usuarios u      ON u.id = o.engenheiro_id
          LEFT JOIN clientes c ON c.id = o.cliente_id
    """

    # ------------------------------ CREATE ------------------------------
    def inserir(self, obra):
        """Insere a obra, preenche obra.id e devolve o novo id."""
        sql = """
            INSERT INTO obras (nome, descricao, data_inicio, data_fim, engenheiro_id, cliente_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        obra.id, _ = self._executar(
            sql, (obra.nome, obra.descricao, obra.data_inicio, obra.data_fim,
                  obra.engenheiro_id, obra.cliente_id))
        return obra.id

    # ------------------------------- READ -------------------------------
    def buscar_por_id(self, obra_id):
        linha = self._buscar_um(self._SELECT_COM_JOIN + " WHERE o.id = %s", (obra_id,))
        return Obra.from_row(linha)

    def listar_todos(self, engenheiro_id=None):
        """Lista as obras (mais recentes primeiro). Filtro opcional por engenheiro."""
        sql = self._SELECT_COM_JOIN
        params = ()
        if engenheiro_id is not None:
            sql += " WHERE o.engenheiro_id = %s"
            params = (engenheiro_id,)
        sql += " ORDER BY o.data_inicio DESC, o.id DESC"
        return [Obra.from_row(linha) for linha in self._buscar_varios(sql, params)]

    # ------------------------------ UPDATE ------------------------------
    def atualizar(self, obra):
        """Atualiza todos os campos editáveis. Verifique a existência antes (buscar_por_id)."""
        sql = """
            UPDATE obras
               SET nome = %s, descricao = %s, data_inicio = %s, data_fim = %s,
                   engenheiro_id = %s, cliente_id = %s
             WHERE id = %s
        """
        self._executar(
            sql, (obra.nome, obra.descricao, obra.data_inicio, obra.data_fim,
                  obra.engenheiro_id, obra.cliente_id, obra.id))

    # ------------------------------ DELETE ------------------------------
    def deletar(self, obra_id):
        """Remove a obra. Retorna True se havia um registro para remover."""
        _, linhas = self._executar("DELETE FROM obras WHERE id = %s", (obra_id,))
        return linhas > 0
