CREATE DATABASE IF NOT EXISTS morphpeetron;
USE morphpeetron;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    funcao ENUM('engenheiro', 'admin', 'cliente') DEFAULT 'engenheiro',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    quantidade_estoque INT DEFAULT 0,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    ponto_pedido INT DEFAULT 10,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE pedidos_reposicao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    engenheiro_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade_solicitada INT NOT NULL,
    status ENUM('pendente', 'aprovado', 'entregue', 'cancelado') DEFAULT 'pendente',
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (engenheiro_id) REFERENCES usuarios(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE TABLE orcamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    engenheiro_id INT NOT NULL,
    nome_cliente VARCHAR(150) NOT NULL,
    valor_total DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('rascunho', 'enviado', 'aprovado', 'rejeitado') DEFAULT 'rascunho',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (engenheiro_id) REFERENCES usuarios(id)
);

CREATE TABLE itens_orcamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orcamento_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    preco_aplicado DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);
