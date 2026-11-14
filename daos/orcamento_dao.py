"""DAO da tabela 'orcamentos' (CRUD em SQL puro)."""
from models import Orcamento

from .base_dao import BaseDAO


class OrcamentoDAO(BaseDAO):
    """Acesso a dados de orçamentos. As leituras já trazem o nome do engenheiro (JOIN)."""

    # Parte comum das consultas de leitura (constante: não contém dados do usuário)
    _SELECT_COM_JOIN = """
        SELECT o.*, u.nome AS engenheiro_nome
          FROM orcamentos o
          JOIN usuarios u ON u.id = o.engenheiro_id
    """

    # ------------------------------ CREATE ------------------------------
    def inserir(self, orcamento):
        """Insere o orçamento, preenche orcamento.id e devolve o novo id."""
        sql = """
            INSERT INTO orcamentos (engenheiro_id, nome_cliente, descricao,
                                    valor_material, valor_mao_obra, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        orcamento.id, _ = self._executar(
            sql, (orcamento.engenheiro_id, orcamento.nome_cliente, orcamento.descricao,
                  orcamento.valor_material, orcamento.valor_mao_obra, orcamento.status))
        return orcamento.id

    # ------------------------------- READ -------------------------------
    def buscar_por_id(self, orcamento_id):
        linha = self._buscar_um(self._SELECT_COM_JOIN + " WHERE o.id = %s", (orcamento_id,))
        return Orcamento.from_row(linha)

    def listar_todos(self, engenheiro_id=None, status=None):
        """Lista os orçamentos (mais recentes primeiro). Filtros opcionais combináveis."""
        sql = self._SELECT_COM_JOIN
        filtros = []
        params = []
        if engenheiro_id is not None:
            filtros.append("o.engenheiro_id = %s")
            params.append(engenheiro_id)
        if status:
            filtros.append("o.status = %s")
            params.append(status)
        if filtros:
            sql += " WHERE " + " AND ".join(filtros)
        sql += " ORDER BY o.data_criacao DESC, o.id DESC"
        return [Orcamento.from_row(linha) for linha in self._buscar_varios(sql, tuple(params))]

    # ------------------------------ UPDATE ------------------------------
    def atualizar(self, orcamento):
        """Atualiza todos os campos editáveis. Verifique a existência antes (buscar_por_id)."""
        sql = """
            UPDATE orcamentos
               SET engenheiro_id = %s, nome_cliente = %s, descricao = %s,
                   valor_material = %s, valor_mao_obra = %s, status = %s
             WHERE id = %s
        """
        self._executar(
            sql, (orcamento.engenheiro_id, orcamento.nome_cliente, orcamento.descricao,
                  orcamento.valor_material, orcamento.valor_mao_obra, orcamento.status,
                  orcamento.id))

    # ------------------------------ DELETE ------------------------------
    def deletar(self, orcamento_id):
        """Remove o orçamento. Retorna True se havia um registro para remover."""
        _, linhas = self._executar("DELETE FROM orcamentos WHERE id = %s", (orcamento_id,))
        return linhas > 0
