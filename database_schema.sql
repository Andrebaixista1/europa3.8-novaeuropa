-- =====================================================
-- SCHEMA DO BANCO DE DADOS - SISTEMA DE CHAMADOS
-- =====================================================

-- Tabela principal de chamados
CREATE TABLE chamados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    solicitante VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria ENUM('logins-ferramentas', 'estrategias') NOT NULL,
    status ENUM('aberto', 'em_andamento', 'aguardando', 'concluido', 'cancelado') DEFAULT 'aberto',
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    responsavel VARCHAR(255),
    comentarios JSON
);

-- Tabela para campos específicos de Logins e Ferramentas
CREATE TABLE chamados_logins_ferramentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chamado_id INT NOT NULL,
    tipo_solicitacao ENUM('novo-login', 'alteracao-login', 'inativacao-login', 'alteracao-visao', 'resetar-senha', 'alteracao-equipe', 'renovacao-login', 'alteracao-nome'),
    cargo ENUM('operador', 'supervisor', 'backoffice', 'aceite', 'qualidade', 'gestor', 'consulta'),
    empresa VARCHAR(100),
    ferramentas JSON, -- Array de ferramentas selecionadas
    nome_usuario VARCHAR(255),
    cpf VARCHAR(14),
    supervisor VARCHAR(255),
    arquivo_path VARCHAR(500), -- Caminho do arquivo anexado
    FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
);

-- Tabela para campos específicos de Estratégias
CREATE TABLE chamados_estrategias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chamado_id INT NOT NULL,
    empresa VARCHAR(100),
    empresa_outros VARCHAR(255), -- Para quando empresa = 'outros'
    idade_min INT,
    idade_max INT,
    perfil_cliente JSON, -- Array de perfis selecionados
    canal JSON, -- Array de canais selecionados
    numero_sms VARCHAR(20),
    preferencia_ddb ENUM('sim', 'nao'),
    data_inicial_ddb DATE,
    data_final_ddb DATE,
    renda_min DECIMAL(15,2),
    renda_max DECIMAL(15,2),
    produto JSON, -- Array de produtos selecionados
    banco JSON, -- Array de bancos selecionados
    banco_margem_cartao JSON, -- Array de bancos margem/cartão
    margem_min DECIMAL(15,2),
    margem_max DECIMAL(15,2),
    quantidade INT,
    faixa_taxa DECIMAL(5,2),
    prazo_min INT,
    prazo_max INT,
    parcela_min DECIMAL(15,2),
    parcela_max DECIMAL(15,2),
    especies JSON, -- Array de espécies
    estados JSON, -- Array de estados selecionados
    FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
);

-- =====================================================
-- EXEMPLOS DE INSERT PARA NOVOS CHAMADOS
-- =====================================================

-- 1. INSERT de um chamado de Logins e Ferramentas
INSERT INTO chamados (titulo, solicitante, descricao, categoria) VALUES 
('Solicitação de Novo Login - Sistema Argus', 'João Silva', 'Preciso de acesso ao sistema Argus para análise de dados', 'logins-ferramentas');

-- Inserir campos específicos
INSERT INTO chamados_logins_ferramentas (
    chamado_id, 
    tipo_solicitacao, 
    cargo, 
    empresa, 
    ferramentas, 
    nome_usuario, 
    cpf, 
    supervisor
) VALUES (
    LAST_INSERT_ID(), -- ID do chamado recém inserido
    'novo-login',
    'operador',
    'vieiracred',
    '["argus"]', -- JSON array
    'Maria Santos',
    '123.456.789-01',
    'Carlos Lima'
);

-- 2. INSERT de um chamado de Estratégias
INSERT INTO chamados (titulo, solicitante, descricao, categoria) VALUES 
('Campanha de Marketing - Portabilidade', 'Ana Costa', 'Estratégia para captação de clientes via portabilidade', 'estrategias');

-- Inserir campos específicos
INSERT INTO chamados_estrategias (
    chamado_id,
    empresa,
    idade_min,
    idade_max,
    perfil_cliente,
    canal,
    preferencia_ddb,
    renda_min,
    renda_max,
    produto,
    banco,
    faixa_taxa,
    prazo_min,
    prazo_max,
    especies,
    estados
) VALUES (
    LAST_INSERT_ID(), -- ID do chamado recém inserido
    'vieiracred',
    25,
    65,
    '["tomador", "entrante"]', -- JSON array
    '["mailing", "whatsapp"]', -- JSON array
    'sim',
    2000.00,
    15000.00,
    '["portabilidade", "margem-livre"]', -- JSON array
    '["1-BANCO DO BRASIL", "341-BANCO ITAU", "237-BRADESCO"]', -- JSON array
    1.99,
    12,
    84,
    '["21", "35", "42"]', -- JSON array
    '["SP", "RJ", "MG"]' -- JSON array
);

-- =====================================================
-- QUERIES DE CONSULTA ÚTEIS
-- =====================================================

-- Consultar todos os chamados com seus campos específicos
SELECT 
    c.*,
    clf.tipo_solicitacao,
    clf.cargo,
    clf.empresa as empresa_login,
    clf.ferramentas,
    clf.nome_usuario,
    clf.cpf,
    clf.supervisor,
    ce.empresa as empresa_estrategia,
    ce.idade_min,
    ce.idade_max,
    ce.perfil_cliente,
    ce.canal,
    ce.renda_min,
    ce.renda_max,
    ce.produto,
    ce.banco,
    ce.faixa_taxa,
    ce.especies,
    ce.estados
FROM chamados c
LEFT JOIN chamados_logins_ferramentas clf ON c.id = clf.chamado_id
LEFT JOIN chamados_estrategias ce ON c.id = ce.chamado_id
ORDER BY c.data_abertura DESC;

-- Consultar chamados por categoria
SELECT * FROM chamados WHERE categoria = 'logins-ferramentas';
SELECT * FROM chamados WHERE categoria = 'estrategias';

-- Consultar chamados por empresa (estratégias)
SELECT c.*, ce.empresa, ce.idade_min, ce.idade_max
FROM chamados c
JOIN chamados_estrategias ce ON c.id = ce.chamado_id
WHERE ce.empresa = 'vieiracred';

-- Consultar chamados por status
SELECT * FROM chamados WHERE status = 'aberto';

-- =====================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_chamados_categoria ON chamados(categoria);
CREATE INDEX idx_chamados_status ON chamados(status);
CREATE INDEX idx_chamados_data_abertura ON chamados(data_abertura);
CREATE INDEX idx_chamados_solicitante ON chamados(solicitante);
CREATE INDEX idx_logins_ferramentas_empresa ON chamados_logins_ferramentas(empresa);
CREATE INDEX idx_estrategias_empresa ON chamados_estrategias(empresa);
CREATE INDEX idx_estrategias_idade ON chamados_estrategias(idade_min, idade_max);
CREATE INDEX idx_estrategias_renda ON chamados_estrategias(renda_min, renda_max);
