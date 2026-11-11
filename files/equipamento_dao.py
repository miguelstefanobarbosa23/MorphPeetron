"""DAO da tabela 'equipamentos' (CRUD em SQL puro)."""
from models import Equipamento

from .base_dao import BaseDAO


class EquipamentoDAO(BaseDAO):
    """Acesso a dados de equipamentos."""

    # ------------------------------ CREATE ------------------------------
    def inserir(self, equipamento):
        """Insere o equipamento, preenche equipamento.id e devolve o novo id."""
        sql = """
            INSERT INTO equipamentos (nome, status, data_ultima_manutencao, responsavel_id)
            VALUES (%s, %s, %s, %s)
        """
        equipamento.id, _ = self._executar(
            sql, (equipamento.nome, equipamento.status,
                  equipamento.data_ultima_manutencao, equipamento.responsavel_id))
        return equipamento.id

    # ------------------------------- READ -------------------------------
    def buscar_por_id(self, equipamento_id):
        linha = self._buscar_um("SELECT * FROM equipamentos WHERE id = %s", (equipamento_id,))
        return Equipamento.from_row(linha)

    def listar_todos(self, status=None):
        """Lista os equipamentos. Filtro opcional por status ('Ativo' / 'Em manutenção')."""
        sql = "SELECT * FROM equipamentos"
        params = ()
        if status:
            sql += " WHERE status = %s"
            params = (status,)
        sql += " ORDER BY nome"
        return [Equipamento.from_row(linha) for linha in self._buscar_varios(sql, params)]

    # ------------------------------ UPDATE ------------------------------
    def atualizar(self, equipamento):
        """Atualiza todos os campos editáveis. Verifique a existência antes (buscar_por_id)."""
        sql = """
            UPDATE equipamentos
               SET nome = %s, status = %s, data_ultima_manutencao = %s, responsavel_id = %s
             WHERE id = %s
        """
        self._executar(
            sql, (equipamento.nome, equipamento.status, equipamento.data_ultima_manutencao,
                  equipamento.responsavel_id, equipamento.id))

    def atualizar_status(self, equipamento_id, status, data_ultima_manutencao):
        """Atualiza somente status e data da última manutenção (usado pela tela de equipamentos)."""
        sql = """
            UPDATE equipamentos
               SET status = %s, data_ultima_manutencao = %s
             WHERE id = %s
        """
        self._executar(sql, (status, data_ultima_manutencao, equipamento_id))

    # ------------------------------ DELETE ------------------------------
    def deletar(self, equipamento_id):
        """Remove o equipamento. Retorna True se havia um registro para remover."""
        _, linhas = self._executar("DELETE FROM equipamentos WHERE id = %s", (equipamento_id,))
        return linhas > 0
