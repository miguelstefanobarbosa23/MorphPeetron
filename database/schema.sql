-- =====================================================================
-- morphpeetron - Script de criação do banco (MySQL 8.0.16+ / MariaDB do XAMPP)
-- Uso manual: mysql -u root -p < database/schema.sql
-- (o app.py também cria tudo sozinho, via database/bootstrap.py)
-- =====================================================================
CREATE DATABASE IF NOT EXISTS morphpeetron
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE morphpeetron;

-- ---------------------------------------------------------------------
-- USUARIOS (engenheiros e demais profissionais)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT          NOT NULL AUTO_INCREMENT,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(150) NOT NULL,
    senha_hash  VARCHAR(255) NOT NULL,                  -- nunca guardar senha em texto puro
    profissao   VARCHAR(50)  NOT NULL DEFAULT 'Engenheiro',
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id          INT          NOT NULL AUTO_INCREMENT,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(150) NULL,
    telefone    VARCHAR(20)  NULL,
    documento   VARCHAR(18)  NULL,                      -- CPF ou CNPJ (único quando informado)
    endereco    VARCHAR(255) NULL,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_clientes_documento (documento)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- OBRAS  (engenheiro responsável obrigatório; cliente opcional)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obras (
    id             INT          NOT NULL AUTO_INCREMENT,
    nome           VARCHAR(150) NOT NULL,
    descricao      TEXT         NULL,
    data_inicio    DATE         NOT NULL,
    data_fim       DATE         NULL,
    engenheiro_id  INT          NOT NULL,
    cliente_id     INT          NULL,
    criado_em      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- Não permite apagar um engenheiro que ainda tem obras
    CONSTRAINT fk_obras_engenheiro
        FOREIGN KEY (engenheiro_id) REFERENCES usuarios (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    -- Se o cliente for apagado, a obra continua existindo (sem cliente)
    CONSTRAINT fk_obras_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ck_obras_datas
        CHECK (data_fim IS NULL OR data_fim >= data_inicio)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- EQUIPAMENTOS  (responsável opcional: usuário que responde pelo item)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipamentos (
    id                      INT          NOT NULL AUTO_INCREMENT,
    nome                    VARCHAR(120) NOT NULL,
    status                  ENUM('Ativo', 'Em manutenção') NOT NULL DEFAULT 'Ativo',
    data_ultima_manutencao  DATE         NULL,
    responsavel_id          INT          NULL,
    criado_em               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_equipamentos_responsavel
        FOREIGN KEY (responsavel_id) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ORÇAMENTOS  (material + mão de obra; o total é sempre calculado)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamentos (
    id              INT           NOT NULL AUTO_INCREMENT,
    engenheiro_id   INT           NOT NULL,
    nome_cliente    VARCHAR(150)  NOT NULL,
    descricao       VARCHAR(255)  NULL,
    valor_material  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    valor_mao_obra  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status          ENUM('Rascunho', 'Enviado', 'Aprovado', 'Rejeitado') NOT NULL DEFAULT 'Rascunho',
    data_criacao    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_orcamentos_engenheiro
        FOREIGN KEY (engenheiro_id) REFERENCES usuarios (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
