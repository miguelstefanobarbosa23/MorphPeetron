"""Dados de demonstração inseridos apenas quando o banco está vazio."""
from datetime import date, timedelta

from werkzeug.security import generate_password_hash


def _dias(dias):
    return (date.today() + timedelta(days=dias)).isoformat()


def semear(conexao):
    """Cria usuários, clientes, obras e equipamentos de exemplo."""
    if conexao.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]:
        return

    usuarios = [
        ("Miguel Stefano", "admin@morphpeetron.com", "admin123", "Administrador"),
        ("Engenheiro Demo", "engenheiro@morphpeetron.com", "engenheiro123", "Engenheiro"),
        ("Ana Beatriz Lima", "ana@morphpeetron.com", "engenheiro123", "Engenheiro"),
        ("Carlos Mendes", "carlos@morphpeetron.com", "engenheiro123", "Arquiteto"),
    ]

    ids_usuarios = {}
    for nome, email, senha, profissao in usuarios:
        cursor = conexao.execute(
            "INSERT INTO usuarios (nome, email, senha_hash, profissao) VALUES (?, ?, ?, ?)",
            (nome, email, generate_password_hash(senha, method="pbkdf2:sha256"), profissao),
        )
        ids_usuarios[email] = cursor.lastrowid

    clientes = [
        (
            "Construtora Alfa",
            "contato@alfa.com",
            "(19) 99999-0000",
            "12.345.678/0001-90",
            "Av. Paulista, 1000 - São Paulo/SP",
        ),
        (
            "Maria Oliveira",
            "maria.oliveira@email.com",
            "(19) 98888-1111",
            "123.456.789-00",
            "Rua das Flores, 45 - Campinas/SP",
        ),
        (
            "Prefeitura de Campinas",
            "obras@campinas.sp.gov.br",
            "(19) 3777-0000",
            "44.444.444/0001-44",
            "Av. Anchieta, 200 - Campinas/SP",
        ),
        (
            "Logística Norte",
            "contato@logisticanorte.com",
            "(11) 97777-2222",
            "55.555.555/0001-55",
            "Rod. Anhanguera, km 90 - Jundiaí/SP",
        ),
    ]

    ids_clientes = {}
    for nome, email, telefone, documento, endereco in clientes:
        cursor = conexao.execute(
            """INSERT INTO clientes (nome, email, telefone, documento, endereco)
               VALUES (?, ?, ?, ?, ?)""",
            (nome, email, telefone, documento, endereco),
        )
        ids_clientes[nome] = cursor.lastrowid

    engenheiro_demo = ids_usuarios["engenheiro@morphpeetron.com"]
    ana = ids_usuarios["ana@morphpeetron.com"]

    obras = [
        (
            "Residência Moderna",
            "Projeto residencial de 280 m² com estrutura em concreto armado, "
            "piscina e área de convivência integrada.",
            _dias(-320),
            _dias(-45),
            engenheiro_demo,
            ids_clientes["Maria Oliveira"],
        ),
        (
            "Edifício Aurora",
            "Obra residencial de 12 andares com 48 apartamentos e garagem subterrânea.",
            _dias(-240),
            _dias(300),
            ana,
            ids_clientes["Construtora Alfa"],
        ),
        (
            "Reforma da Praça Central",
            "Revitalização completa da praça: calçamento, iluminação em LED, "
            "paisagismo e novo playground.",
            _dias(-100),
            _dias(40),
            engenheiro_demo,
            ids_clientes["Prefeitura de Campinas"],
        ),
        (
            "Galpão Logístico Norte",
            "Galpão de 1.800 m² com pé-direito de 12 m, docas e escritório administrativo.",
            _dias(-30),
            _dias(280),
            ana,
            ids_clientes["Logística Norte"],
        ),
        (
            "Casa de Campo",
            "Residência de campo em alvenaria estrutural, com aproveitamento "
            "de energia solar e captação de água da chuva.",
            _dias(15),
            _dias(220),
            engenheiro_demo,
            ids_clientes["Maria Oliveira"],
        ),
        (
            "Ponte Rio Verde",
            "Recuperação estrutural da ponte e reforço das vigas de sustentação.",
            _dias(-600),
            _dias(-200),
            ana,
            ids_clientes["Prefeitura de Campinas"],
        ),
        (
            "Retrofit do Escritório Central",
            "Modernização das instalações elétricas, climatização e layout "
            "do escritório da construtora.",
            _dias(-180),
            _dias(-10),
            engenheiro_demo,
            ids_clientes["Construtora Alfa"],
        ),
    ]

    conexao.executemany(
        """INSERT INTO obras
               (nome, descricao, data_inicio, data_fim, engenheiro_id, cliente_id)
           VALUES (?, ?, ?, ?, ?, ?)""",
        obras,
    )

    equipamentos = [
        ("Betoneira 400L", "Ativo", _dias(-40), engenheiro_demo),
        ("Andaime Tubular", "Em manutenção", _dias(-5), ana),
        ("Retroescavadeira CAT 416", "Ativo", _dias(-90), engenheiro_demo),
        ("Compactador de Solo", "Em manutenção", _dias(-12), ana),
        ("Grua Torre 40m", "Ativo", _dias(-150), ids_usuarios["admin@morphpeetron.com"]),
        ("Gerador 15 kVA", "Ativo", _dias(-25), engenheiro_demo),
        ("Escora Metálica (conjunto)", "Ativo", None, ids_usuarios["admin@morphpeetron.com"]),
    ]

    conexao.executemany(
        """INSERT INTO equipamentos
               (nome, status, data_ultima_manutencao, responsavel_id)
           VALUES (?, ?, ?, ?)""",
        equipamentos,
    )
