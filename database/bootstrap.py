"""Bootstrap da apresentação: cria o banco/tabelas (schema.sql) e popula dados fictícios.

Executado automaticamente pelo app.py na inicialização:
    python app.py  ->  banco pronto com dados de exemplo, sem nenhum comando manual.

Regras:
- Nunca derruba a aplicação se o MySQL estiver fora do ar (só registra um aviso).
- Os registros de seed são inseridos SOMENTE quando a tabela correspondente está vazia,
  então reiniciar o servidor nunca duplica dados nem apaga o que você cadastrou.
"""
import logging
from pathlib import Path

import mysql.connector
from mysql.connector import Error as ErroMySQL

from config import Config

logger = logging.getLogger("morphpeetron.bootstrap")

CAMINHO_SCHEMA = Path(__file__).resolve().parent / "schema.sql"

SENHA_DEMONSTRACAO = "123456"


def _conectar_sem_banco():
    """Conecta ao servidor MySQL sem escolher banco (necessário para CREATE DATABASE)."""
    return mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        charset="utf8mb4",
    )


def _executar_script(cursor, script_sql):
    """Divide o script em comandos (separados por ';') e executa um a um."""
    linhas = [linha for linha in script_sql.splitlines()
              if not linha.strip().startswith("--")]
    for comando in "\n".join(linhas).split(";"):
        comando = comando.strip()
        if comando:
            cursor.execute(comando)


def criar_banco_e_tabelas():
    """Executa o database/schema.sql: CREATE DATABASE + CREATE TABLE IF NOT EXISTS."""
    conexao = _conectar_sem_banco()
    try:
        cursor = conexao.cursor()
        _executar_script(cursor, CAMINHO_SCHEMA.read_text(encoding="utf-8"))
        conexao.commit()
        cursor.close()
    finally:
        conexao.close()


def popular_dados_iniciais():
    """Popula as tabelas vazias com registros fictícios realistas (seed da apresentação)."""
    from daos import (ClienteDAO, EquipamentoDAO, ObraDAO, OrcamentoDAO, UsuarioDAO)
    from models import Cliente, Equipamento, Obra, Orcamento, Usuario

    # ------------------------------- usuários -------------------------------
    usuario_dao = UsuarioDAO()
    if not usuario_dao.listar_todos():
        logger.info("Tabela 'usuarios' vazia: inserindo usuários de demonstração...")
        usuarios = [
            Usuario(nome="Maria Souza", email="maria@exemplo.com", profissao="Engenheiro"),
            Usuario(nome="Ricardo Almeida", email="ricardo.almeida@morphpeetron.com", profissao="Engenheiro"),
            Usuario(nome="Fernanda Costa", email="fernanda.costa@morphpeetron.com", profissao="Engenheiro"),
            Usuario(nome="Bruno Oliveira", email="bruno.oliveira@morphpeetron.com", profissao="Arquiteto"),
        ]
        for usuario in usuarios:
            usuario.definir_senha(SENHA_DEMONSTRACAO)  # guarda apenas o hash
            usuario_dao.inserir(usuario)
        logger.info("Login de demonstração criado: maria@exemplo.com / %s", SENHA_DEMONSTRACAO)

    por_email = {u.email: u for u in usuario_dao.listar_todos()}
    maria = por_email.get("maria@exemplo.com")
    ricardo = por_email.get("ricardo.almeida@morphpeetron.com")
    fernanda = por_email.get("fernanda.costa@morphpeetron.com")

    # -------------------------------- clientes -------------------------------
    cliente_dao = ClienteDAO()
    if not cliente_dao.listar_todos():
        logger.info("Tabela 'clientes' vazia: inserindo clientes de demonstração...")
        clientes = [
            Cliente(nome="Construtora Alfa Ltda", email="contato@alfa.com.br",
                    telefone="19 99999-0000", documento="12.345.678/0001-90",
                    endereco="Av. das Amoreiras, 500 - Campinas/SP"),
            Cliente(nome="Investimentos Beta S.A.", email="obras@beta.com.br",
                    telefone="11 98888-1212", documento="98.765.432/0001-10",
                    endereco="Rua XV de Novembro, 1200 - São Paulo/SP"),
            Cliente(nome="Marta Andrade", email="marta.andrade@gmail.com",
                    telefone="19 3232-4505", documento="123.456.789-09",
                    endereco="Rua dos Ipês, 88 - Paulínia/SP"),
        ]
        for cliente in clientes:
            cliente_dao.inserir(cliente)

    clientes_por_nome = {c.nome: c for c in cliente_dao.listar_todos()}
    alfa = clientes_por_nome.get("Construtora Alfa Ltda")
    beta = clientes_por_nome.get("Investimentos Beta S.A.")
    marta = clientes_por_nome.get("Marta Andrade")

    # --------------------------------- obras ---------------------------------
    obra_dao = ObraDAO()
    if not obra_dao.listar_todos():
        logger.info("Tabela 'obras' vazia: inserindo obras de demonstração...")
        obras = [
            Obra(nome="Edifício Aurora",
                 descricao="Obra residencial de 12 pavimentos com 96 apartamentos.",
                 data_inicio="2026-01-15", data_fim=None,
                 engenheiro_id=maria.id, cliente_id=alfa.id),
            Obra(nome="Residencial Bela Vista",
                 descricao="Condomínio de 8 casas geminadas em fase de fundação.",
                 data_inicio="2026-03-02", data_fim="2027-03-02",
                 engenheiro_id=ricardo.id, cliente_id=beta.id),
            Obra(nome="Galpão Industrial Delta",
                 descricao="Estrutura pré-moldada de 4.000 m² para centro logístico.",
                 data_inicio="2025-06-10", data_fim="2026-02-28",
                 engenheiro_id=fernanda.id, cliente_id=alfa.id),
            Obra(nome="Reforma Loja Central",
                 descricao="Modernização de piso, fachada e iluminação da loja âncora.",
                 data_inicio="2026-10-05", data_fim=None,
                 engenheiro_id=maria.id, cliente_id=marta.id),
        ]
        for obra in obras:
            obra_dao.inserir(obra)

    # ------------------------------ equipamentos ------------------------------
    equipamento_dao = EquipamentoDAO()
    if not equipamento_dao.listar_todos():
        logger.info("Tabela 'equipamentos' vazia: inserindo equipamentos de demonstração...")
        equipamentos = [
            Equipamento(nome="Betoneira 400L", status="Ativo",
                        data_ultima_manutencao="2026-09-20", responsavel_id=maria.id),
            Equipamento(nome="Plataforma Elevatória 8m", status="Em manutenção",
                        data_ultima_manutencao="2026-11-02", responsavel_id=ricardo.id),
            Equipamento(nome="Rompedor MK-100", status="Ativo",
                        data_ultima_manutencao="2026-08-11", responsavel_id=fernanda.id),
            Equipamento(nome="Compressor de Ar 25 Pés", status="Ativo",
                        data_ultima_manutencao="2026-10-05"),
            Equipamento(nome="Vibrador de Imersão 40mm", status="Em manutenção",
                        data_ultima_manutencao="2026-10-30"),
        ]
        for equipamento in equipamentos:
            equipamento_dao.inserir(equipamento)

    # -------------------------------- orçamentos -------------------------------
    orcamento_dao = OrcamentoDAO()
    if not orcamento_dao.listar_todos():
        logger.info("Tabela 'orcamentos' vazia: inserindo orçamentos de demonstração...")
        orcamentos = [
            Orcamento(nome_cliente="Construtora Alfa Ltda", engenheiro_id=maria.id,
                      descricao="Estrutura e alvenaria do Edifício Aurora (2 primeiros pavimentos).",
                      valor_material="145.000,00", valor_mao_obra="82.000,00", status="Enviado"),
            Orcamento(nome_cliente="Investimentos Beta S.A.", engenheiro_id=ricardo.id,
                      descricao="Fundação e cobertura das 8 casas da Bela Vista.",
                      valor_material="98.000,00", valor_mao_obra="64.000,00", status="Aprovado"),
            Orcamento(nome_cliente="Construtora Alfa Ltda", engenheiro_id=fernanda.id,
                      descricao="Pré-moldados e instalações do Galpão Delta.",
                      valor_material="210.000,00", valor_mao_obra="130.000,00", status="Rejeitado"),
            Orcamento(nome_cliente="Marta Andrade", engenheiro_id=maria.id,
                      descricao="Reforma completa da Loja Central (piso, fachada e iluminação).",
                      valor_material="27.500,00", valor_mao_obra="18.000,00", status="Rascunho"),
        ]
        for orcamento in orcamentos:
            orcamento_dao.inserir(orcamento)


def inicializar_banco():
    """Prepara o banco para a apresentação. Nunca interrompe a inicialização do Flask."""
    try:
        criar_banco_e_tabelas()
        popular_dados_iniciais()
        logger.info("Banco '%s' pronto (tabelas garantidas + dados de demonstração quando vazio).",
                    Config.DB_NAME)
    except ErroMySQL as exc:
        logger.warning(
            "MySQL indisponível ou sem permissão (%s). "
            "A API vai responder 500 até o banco ficar acessível: "
            "confira se o MySQL está ligado e as credenciais no .env (DB_USER/DB_PASSWORD).",
            exc,
        )
