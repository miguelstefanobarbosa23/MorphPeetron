"""Classe base dos DAOs: centraliza conexão, transação e execução de SQL puro."""
from contextlib import contextmanager
from datetime import date, datetime

from database.connection import Database


class BaseDAO:
    """Todos os DAOs herdam daqui.

    As queries ficam nas subclasses, em SQL puro e SEMPRE parametrizadas (?),
    o que protege contra SQL Injection. Nunca concatene dados do usuário no SQL.
    """

    @contextmanager
    def _cursor(self):
        """Abre conexão + cursor e garante commit/rollback e fechamento."""
        conexao = Database.get_connection()
        cursor = conexao.cursor()
        try:
            yield cursor
            conexao.commit()
        except Exception:
            conexao.rollback()
            raise
        finally:
            cursor.close()
            conexao.close()

    @staticmethod
    def _parametros(params):
        """SQLite não aceita date/datetime diretamente: converte para texto ISO."""
        return tuple(
            valor.isoformat() if isinstance(valor, (date, datetime)) else valor
            for valor in params
        )

    def _buscar_um(self, sql, params=()):
        """SELECT que retorna uma linha (dict) ou None."""
        with self._cursor() as cursor:
            cursor.execute(sql, self._parametros(params))
            linha = cursor.fetchone()
            return dict(linha) if linha is not None else None

    def _buscar_varios(self, sql, params=()):
        """SELECT que retorna uma lista de linhas (dicts)."""
        with self._cursor() as cursor:
            cursor.execute(sql, self._parametros(params))
            return [dict(linha) for linha in cursor.fetchall()]

    def _executar(self, sql, params=()):
        """INSERT/UPDATE/DELETE. Retorna (id_gerado, linhas_afetadas)."""
        with self._cursor() as cursor:
            cursor.execute(sql, self._parametros(params))
            return cursor.lastrowid, cursor.rowcount
