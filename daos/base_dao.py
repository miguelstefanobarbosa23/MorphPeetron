"""Classe base dos DAOs: centraliza conexão, transação e execução de SQL puro."""
from contextlib import contextmanager

from database.connection import Database


class BaseDAO:
    """Todos os DAOs herdam daqui.

    As queries ficam nas subclasses, em SQL puro e SEMPRE parametrizadas (%s),
    o que protege contra SQL Injection. Nunca concatene dados do usuário no SQL.
    """

    @contextmanager
    def _cursor(self):
        """Abre conexão + cursor (linhas como dict) e garante commit/rollback e devolução ao pool."""
        conexao = Database.get_connection()
        cursor = conexao.cursor(dictionary=True)
        try:
            yield cursor
            # Commit também nas leituras: encerra a transação e evita ler um
            # "snapshot" antigo quando a conexão é reutilizada pelo pool.
            conexao.commit()
        except Exception:
            conexao.rollback()
            raise
        finally:
            cursor.close()
            conexao.close()  # devolve a conexão ao pool

    def _buscar_um(self, sql, params=()):
        """SELECT que retorna uma linha (dict) ou None."""
        with self._cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()

    def _buscar_varios(self, sql, params=()):
        """SELECT que retorna uma lista de linhas (dicts)."""
        with self._cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()

    def _executar(self, sql, params=()):
        """INSERT/UPDATE/DELETE. Retorna (id_gerado, linhas_afetadas)."""
        with self._cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.lastrowid, cursor.rowcount
