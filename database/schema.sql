-- =====================================================================
-- MorphPeetron - Banco de dados SQLite
-- Criado automaticamente na primeira execução (database/connection.py)
-- =====================================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    senha_hash  TEXT    NOT NULL,
    profissao   TEXT    NOT NULL DEFAULT 'Engenheiro',
    criado_em   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT    NOT NULL,
    email       TEXT,
    telefone    TEXT,
    documento   TEXT    UNIQUE,
    endereco    TEXT,
    criado_em   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS obras (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nome           TEXT    NOT NULL,
    descricao      TEXT,
    data_inicio    TEXT    NOT NULL,
    data_fim       TEXT,
    engenheiro_id  INTEGER NOT NULL,
    cliente_id     INTEGER,
    criado_em      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (engenheiro_id) REFERENCES usuarios (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE TABLE IF NOT EXISTS equipamentos (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                    TEXT    NOT NULL,
    status                  TEXT    NOT NULL DEFAULT 'Ativo'
        CHECK (status IN ('Ativo', 'Em manutenção')),
    data_ultima_manutencao  TEXT,
    responsavel_id          INTEGER,
    criado_em               TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_obras_engenheiro ON obras (engenheiro_id);
CREATE INDEX IF NOT EXISTS idx_obras_cliente    ON obras (cliente_id);
CREATE INDEX IF NOT EXISTS idx_equip_status     ON equipamentos (status);
