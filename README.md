# MorphPeetron (M-TRON) — Super App que se transforma por profissão

Aplicação full-stack que funciona como um **super app "camaleão"**: um único
sistema de gestão (autenticação com JWT, equipe, clientes/pacientes, registros
principais, insumos e financeiro) que **muda de identidade, vocabulário e
módulos conforme a profissão** escolhida — engenharia/arquitetura, medicina,
direito, informática, psicologia, farmácia, professor e artes.

- **Back-end:** Python + Flask, POO com padrão DAO, SQL puro parametrizado (`mysql-connector-python`), `flask-cors` habilitado.
- **Front-end:** HTML5 semântico + CSS3 + JavaScript puro (ES6+), consumindo a API via **Fetch API** (`async/await`) com JSON, sem recarregar a página.
- **Banco:** MySQL/MariaDB (XAMPP serve).

```
Requisição → routes/ (controller) → models/ (regras e validação) → daos/ (SQL) → MySQL
```

## Estrutura de pastas

```
morphpeetron/
├── app.py                    # Application Factory + CORS + rotas do front + bootstrap
├── config.py                 # Configurações (lidas do .env)
├── requirements.txt
├── .env.example
├── daos/                     # Acesso a dados (SQL puro, parametrizado)
│   ├── base_dao.py
│   ├── usuario_dao.py
│   ├── cliente_dao.py
│   ├── obra_dao.py
│   ├── equipamento_dao.py
│   └── orcamento_dao.py
├── models/                   # Entidades + regras de negócio/validação
│   ├── base_model.py
│   ├── usuario.py
│   ├── cliente.py
│   ├── obra.py
│   ├── equipamento.py
│   └── orcamento.py
├── routes/                   # Blueprints (controllers da API)
│   ├── auth_routes.py
│   ├── pessoas_routes.py
│   ├── obra_routes.py
│   ├── equipamento_routes.py
│   ├── orcamento_routes.py
│   └── resumo_routes.py
├── database/
│   ├── connection.py         # Pool de conexões
│   ├── schema.sql            # CREATE DATABASE/TABLES (IF NOT EXISTS)
│   └── bootstrap.py          # Cria o banco e popula o SEED automático
├── utils/
│   ├── auth.py               # JWT: gerar_token + token_required
│   └── respostas.py          # Helpers de erro/JSON
└── static/                   # Front-end servido pelo próprio Flask
    ├── index.html            # SPA + script anti-flash do tema (antes do CSS)
    ├── style.css             # Tokens do tema (--color-*) + 8 temas de profissão
    ├── script.js             # SPA (hash router) + temas + MODO_PROFISSAO + motor orbital
    ├── demo-api.js           # Modo demonstração: replica a API no navegador (GitHub Pages)
    ├── mascote.png           # Mascote neutro M-TRON (login sem tema, estados vazios)
    └── mascotes/             # Mascotes por profissão (catálogo orbital/universos)
        ├── arquitetura.png   # Engenheiro de tijolo (blob/etiqueta em CSS)
        ├── medicina.png … artes.png  # Recortes do collage oficial, fundo transparente
        └── mini/             # Miniaturas (112px) para dots, chips e cartões
```

> **`docs/` (no repositório):** cópia do conteúdo de `static/` com os caminhos
> de assets convertidos para relativos — é a pasta que o **GitHub Pages**
> publica (`main:/docs`). Regenerar após alterar o `static/` (ver seção
> GitHub Pages abaixo).

## Como rodar (guia rápido de apresentação)

```bash
# 1. Ambiente virtual
python -m venv venv
venv\Scripts\activate          # Windows (no Linux/macOS: source venv/bin/activate)

# 2. Dependências
pip install -r requirements.txt

# 3. Banco: ligue o MySQL (XAMPP Control Panel → MySQL) e ajuste o .env
#    copie .env.example para .env e confira DB_USER/DB_PASSWORD

# 4. Rode! O bootstrap cria banco/tabelas e popula o seed automaticamente.
python app.py
```

Abra **http://127.0.0.1:5000** — a página inicial pública abre com a seleção de
universos; o login fica em `#/login` (ou no botão "Entrar" do cabeçalho).

**Login de demonstração (criado pelo seed):** `maria@exemplo.com` / `123456`

> O seed só roda em tabelas vazias: reiniciar o servidor nunca duplica dados nem
> apaga o que você cadastrou. Se já existia um banco antigo do `main.sql`,
> use `DROP DATABASE morphpeetron;` antes de rodar para começar limpo.

## Site no GitHub Pages (modo demonstração)

O projeto está publicado (sem servidor) em:
**https://miguelstefanobarbosa23.github.io/MorphPeetron/**

O Pages publica só HTML/CSS/JS — lá não existem Flask nem MySQL. Para o site
continuar navegável, o `demo-api.js` **replica a API completa no navegador**
(mesmas rotas, contratos, códigos HTTP e o mesmo seed do `bootstrap.py`),
salvando os dados no `localStorage` de quem está vendo:

- Como funciona: quando o `fetch` para `/api/...` falha (ou o servidor responde
  algo que não é JSON), o `script.js` cai automaticamente no modo demonstração
  e um aviso informa que os dados ficam apenas naquele navegador;
- Com o Flask rodando (`python app.py`), a API **real** responde primeiro e o
  modo demonstração nem é acionado — nada muda no comportamento local;
- A conta de demonstração também funciona no Pages: `maria@exemplo.com` / `123456`.

### Como regenerar a pasta `docs/` (deploy do front)

O Pages está configurado para publicar a branch `main`, pasta `/docs`. Após
qualquer mudança no `static/`, copie o conteúdo para `docs/` e troque os
caminhos `/static/...` por relativos (o Flask serve na raiz; o Pages, em
`/MorphPeetron/`):

1. Copie todo o conteúdo de `static/` para `docs/`;
2. Em `docs/index.html` e `docs/script.js`, substitua `/static/` por nada
   (`/static/style.css` → `style.css`, `/static/mascotes/...` → `mascotes/...`);
3. Envie para a branch `main` — o GitHub Pages recompila sozinho.


## Identidade visual e experiência

- **Logo oficial M-TRON:** o "M" usa um gradiente fixo azul → turquesa → verde
  (`#1E7FC2 → #17A398 → #27AE60`) em SVG, igual na sidebar, nas páginas públicas
  e no favicon (o favicon **não** acompanha o tema; o `theme-color` sim).
  A wordmark "M-TRON" é navy (`#1b2a4a`) em fundos claros e branca na sidebar.
- **Página inicial (#/inicio) — catálogo orbital 3D:** os 8 mascotes (Arquitetura,
  Medicina, Direito, Informática, Psicologia, Farmácia, Professor e Artes)
  circulam em uma **órbita elíptica real** ao redor do conteúdo central, com
  profundidade de verdade: quem está na frente aparece maior, nítido e destacado;
  quem passa atrás fica menor e discreto. Sempre em corpo inteiro e na vertical
  (o mascote não gira sobre o próprio eixo).
  - **Hover/foco** pausa a rotação, ilumina o mascote e mostra o nome;
  - **Clique** traz o mascote para a frente e abre o cartão de confirmação
    (nome, descrição e botão "Entrar no universo …"); confirmar aplica a
    identidade visual, salva a escolha e navega para `#/universo/<id>`;
  - **Controles discretos** abaixo da órbita: anterior/próximo, seleção direta
    pelos dots (miniaturas) e pausar/continuar; indicador no topo mostra a
    profissão em destaque;
  - **Auto-pausa** quando o mouse está sobre um mascote, a aba fica oculta ou o
    palco sai da vista (economia de bateria);
  - **Teclado:** ←/→ (e ↑/↓) navegam, Esc fecha o cartão;
  - **Responsivo:** elipse e mascotes se reescalam em tablet/celular sem cortar
    os personagens, navegação por toque nos dots; respeita `prefers-reduced-motion`
    (rotação automática desligada, saltos instantâneos).

### Sistema de temas por profissão

Um único site com oito identidades visuais. A cor ativa vive no atributo
`data-tema` do `<html>` e todos os componentes consomem **tokens CSS globais**
(`--color-primary`, `--color-surface`, `--color-border`, …) — nenhum hex
espalhado pelas telas. Nomes antigos (`--laranja`, `--creme`, …) viram uma
ponte para os tokens, então o CSS existente recolore sem duplicação.

- **Paletas:** Arquitetura (terracota), Medicina (azul/turquesa), Direito
  (azul-marinho/dourado), Informática (azul elétrico/ciano), Psicologia
  (roxo/lavanda), Farmácia (verde/menta), Professor (azul/amarelo) e Artes
  (rosa/magenta). Sem tema escolhido, vale a identidade neutra da M-TRON.
- **Persistência:** `localStorage["mp_tema"]`, aplicado por um script inline
  no `<head>` **antes do CSS** — zero flash de cor errada ao carregar/atualizar.
  A home mantém o tema salvo (usuário que retorna vê a sua profissão); o estado
  neutro só vale enquanto nenhuma escolha foi feita.
- **Vinculação ao perfil:** ao entrar sem tema escolhido, a profissão do
  cadastro define o tema (Engenheiro/Arquiteto → arquitetura, Técnico →
  informática, Administrador → direito). A escolha explícita do usuário
  prevalece e atravessa o login. Sem escolha prévia, o login direto oferece
  o seletor de universos antes de entrar.

### Super App por profissão (o camaleão)

A adaptação é **100% de interface** (`MODO_PROFISSAO` no `script.js`): as mesmas
rotas, tabelas e módulos mudam de nome, rótulo e tom conforme o universo ativo —
a API, o banco e a estrutura continuam idênticos.

- **Menu lateral:** em Medicina vira Painel / Atendimentos / Especialistas /
  Pacientes / Insumos e exames / Faturas; em Direito, Processos / Equipe
  jurídica / Clientes / Documentos / Honorários; em Professor, Turmas / Alunos /
  Escolas / Materiais didáticos / Mensalidades — e assim por diante.
- **Painel geral = gerenciamento:** KPIs no idioma da profissão (com os
  subtítulos adaptados), grade "Gerenciamento" (os cinco módulos-base) e
  "Módulos do universo" — módulos exclusivos por profissão em três tipos:
  **rota** (abrem a página adaptada), **breve** ("Em breve") e **restrito**
  (prontuários médico/psicológico/histórico farmacêutico com selo
  "Acesso restrito · LGPD e sigilo"). Sem seletor de profissões dentro do app:
  a troca de identidade acontece no catálogo orbital da home, e um chip com o
  mascote indica o universo ativo no topo.
- **Tudo acompanha:** colunas de tabelas, filtros, botões de ação, títulos e
  subtítulos de modais, estados vazios (com o mascote do tema) e gráficos —
  os mesmos componentes falam o idioma de cada ofício.

- **Login/cadastro glassmorphism:** cartão de vidro translúcido com formulário
  à esquerda e **mascote grande** do universo à direita (em qualquer estado —
  sem tema, aparece o mascote neutro M-TRON com o selo "Universo M-TRON"),
  sobre um cenário com bolhas, partículas e o mascote ampliado e desfocado.
  Senha com mostrar/ocultar, "Esqueceu minha senha?" como modal de demonstração
  (que preenche a conta demo), feedback de erro com tremida do cartão, entrada
  em cascata e layout responsivo (mascote empilha acima do formulário em telas
  menores).
- **Sem sublinhados:** nenhum link recebe linha sublinhada — o feedback de
  hover é feito com cor e peso.

- **Paleta M-TRON (tema padrão):** laranja `#ED6B18`, verde `#55BE45`,
  azul-marinho `#1F3E6B`, creme `#FAF5EA`, marrom `#A6732F` e escuro `#17202B`.
  A marca (logo "M" + favicon) usa o gradiente oficial azul → verde em todas
  as telas, independente do tema.
- **Design plano:** listas, tabelas e indicadores ficam direto no fundo creme,
  com filetes divisórios — sem caixas brancas. Ícones sempre em SVG inline.
- **Mascote:** o tijolinho M-TRON (capacete + prancheta) é o mascote neutro —
  aparece no login/cadastro sem profissão escolhida e nos estados vazios de
  qualquer tema.
- **Animação 3D no scroll:** KPIs, linhas e blocos entram subindo com leve
  inclinação em perspectiva (IntersectionObserver, em cascata). Respeita
  `prefers-reduced-motion` e tem rede de segurança para nunca esconder conteúdo.
- **Velocidade:** buscas em paralelo por tela + cache em memória com validade
  curta (invalidado a cada alteração), pré-aquecido após o login.
- **Responsivo:** menu lateral off-canvas com máscara no mobile, tabelas com
  rolagem horizontal, indicadores e linhas que se reorganizam por largura.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/profissoes` | Opções da tela de seleção de profissão (pública) |
| POST | `/api/cadastro` | Cadastra usuário (pública) |
| POST | `/api/login` | Autentica e devolve o token JWT (pública) |
| GET | `/api/resumo` | Contadores/valores do painel |
| GET | `/api/engenheiros` | Lista engenheiros |
| GET, POST | `/api/clientes` | Lista / cria clientes |
| GET, PUT, DELETE | `/api/clientes/<id>` | Detalha / atualiza / remove cliente |
| GET, POST | `/api/obras` | Lista (`?engenheiro_id=`) / cria obras |
| GET, PUT, DELETE | `/api/obras/<id>` | Detalha / atualiza / remove obra |
| GET, POST | `/api/equipamentos` | Lista (`?status=`) / cria equipamentos |
| GET, PUT, DELETE | `/api/equipamentos/<id>` | Detalha / atualiza / remove equipamento |
| PUT, PATCH | `/api/equipamentos/<id>/status` | Atualiza o status do equipamento |
| GET, POST | `/api/orcamentos` | Lista (`?status=`, `?engenheiro_id=`) / cria orçamentos |
| GET, PUT, DELETE | `/api/orcamentos/<id>` | Detalha / atualiza / remove orçamento |

- Todas as rotas (exceto `/profissoes`, `/cadastro` e `/login`) exigem o header
  `Authorization: Bearer <token>`.
- Status HTTP adequados: `200`, `201`, `204`, `400`, `401`, `404`, `409`, `500`.
- Erros sempre em JSON: `{"erro": "mensagem", "detalhes": ["..."]}`.
- Nos `PUT`, campos omitidos no JSON mantêm o valor atual.
- O valor total do orçamento é **calculado** (material + mão de obra), nunca digitado.
