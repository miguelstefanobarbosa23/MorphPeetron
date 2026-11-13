<p align="center">
  <img src="static/img/morphpeetron.png" alt="MorphPeetron" width="520">
</p>

<h1 align="center">MorphPeetron</h1>

<p align="center">
  Sistema web de gestão de obras, clientes, equipamentos e equipe — feito com <strong>Flask</strong> e <strong>SQLite</strong>.
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white">
  <img alt="Flask" src="https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white">
</p>

---

## O que o sistema faz

- Login e cadastro de usuários com senha protegida por hash (PBKDF2).
- Painel com resumo de obras, clientes e equipamentos.
- Cadastro, edição, exclusão e busca de **obras**.
- Cadastro, edição, exclusão e busca de **clientes**.
- Controle de **equipamentos** com status *Ativo* / *Em manutenção*.
- Página da equipe de engenheiros e perfil do usuário.
- API REST em JSON (a mesma base de código usada pelo site).
- Banco **SQLite** criado automaticamente — não precisa instalar MySQL.
- O navegador **abre sozinho** quando você roda `python app.py`.

## Como rodar no seu computador

Pré-requisito: **Python 3.10 ou superior** instalado ([python.org](https://www.python.org/downloads/)).

```bash
# 1. Entre na pasta do projeto
cd MorphPeetron

# 2. Crie e ative um ambiente virtual
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# Windows (Prompt de Comando)
.venv\Scripts\activate.bat
# Linux / macOS
source .venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt

# 4. Rode o sistema
python app.py
```

O navegador abre automaticamente em **http://127.0.0.1:5000**.

> Se o navegador não abrir, acesse o endereço manualmente. Para desativar a abertura automática, use `AUTO_OPEN_BROWSER=0` no `.env`.

### Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@morphpeetron.com` | `admin123` |
| Engenheiro | `engenheiro@morphpeetron.com` | `engenheiro123` |

Na tela de login também há botões que preenchem essas contas automaticamente.

## Banco de dados

O arquivo `instance/morphpeetron.db` é criado na primeira execução, junto com as tabelas e os dados de exemplo.

- **Ver o banco:** abra o arquivo com o [DB Browser for SQLite](https://sqlitebrowser.org/).
- **Recomeçar do zero:** pare o servidor e apague a pasta `instance/`.
- **Desativar dados de exemplo:** defina `SEED_DEMO=0` no `.env` antes da primeira execução.

## Estrutura do projeto

```text
MorphPeetron/
├── app.py                  # ponto de entrada (cria o app e abre o navegador)
├── config.py               # configurações e variáveis de ambiente
├── requirements.txt
├── render.yaml             # configuração de deploy no Render
├── Procfile
├── database/
│   ├── connection.py       # conexão SQLite + criação automática
│   ├── schema.sql          # tabelas
│   └── seed.py             # dados de demonstração
├── models/                 # entidades e validações
├── daos/                   # acesso ao banco (SQL parametrizado)
├── routes/
│   ├── web_routes.py       # páginas HTML
│   └── *_routes.py         # API REST
├── templates/              # páginas Jinja2
├── static/                 # CSS, JS e imagens
├── files/                  # versão anterior da API (histórico)
├── Banco/                  # scripts e diagramas do banco MySQL original
└── Parte 1/                # documentação e PDFs do projeto
```

## Rotas do site

| Rota | Tela |
|---|---|
| `/login` | Entrar |
| `/cadastro` | Criar conta |
| `/` | Painel inicial |
| `/obras` | Lista de obras |
| `/obras/nova` | Cadastrar obra |
| `/obras/<id>` | Detalhes da obra |
| `/clientes` | Lista de clientes |
| `/equipamentos` | Lista de equipamentos |
| `/engenheiros` | Equipe técnica |
| `/perfil` | Meu perfil |

## API REST (JSON)

As rotas da API continuam disponíveis em `/api`:

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/profissoes` | Profissões disponíveis |
| POST | `/api/cadastro` | Cadastra usuário |
| POST | `/api/login` | Login e token JWT |
| GET | `/api/engenheiros` | Lista engenheiros |
| GET, POST | `/api/clientes` | Lista / cria clientes |
| GET, PUT, DELETE | `/api/clientes/<id>` | Detalha / atualiza / remove |
| GET, POST | `/api/obras` | Lista / cria obras |
| GET, PUT, DELETE | `/api/obras/<id>` | Detalha / atualiza / remove |
| GET, POST | `/api/equipamentos` | Lista / cria equipamentos |
| GET, PUT, DELETE | `/api/equipamentos/<id>` | Detalha / atualiza / remove |
| PUT, PATCH | `/api/equipamentos/<id>/status` | Atualiza o status |

Rotas protegidas usam `Authorization: Bearer <token>` (token devolvido por `/api/login`).

## Publicar na internet (link público)

> **Importante:** o **GitHub Pages não executa Python/Flask**. Ele só serve arquivos estáticos (HTML, CSS e JS). Para ter um site Flask funcionando, é preciso um serviço que rode Python — o mais simples e gratuito é o **Render**.

### Passo a passo no Render

1. Crie uma conta em [render.com](https://render.com) e conecte sua conta do GitHub.
2. Clique em **New → Blueprint**.
3. Escolha o repositório `miguelstefanobarbosa23/MorphPeetron`.
4. O Render lê o arquivo `render.yaml` e configura tudo sozinho. Clique em **Apply**.
5. Aguarde o deploy. O link será algo como `https://morphpeetron.onrender.com`.

No plano gratuito, o serviço “dorme” depois de alguns minutos sem acesso e demora alguns segundos para acordar.

### Deploy automático a cada push (opcional)

O repositório já tem o workflow `.github/workflows/deploy-render.yml`.

1. No Render, abra o serviço → **Settings → Deploy Hook** e copie a URL.
2. No GitHub, abra **Settings → Secrets and variables → Actions**.
3. Crie o secret `RENDER_DEPLOY_HOOK` com essa URL.

A partir daí, todo push na branch `main` dispara um novo deploy.

### Sobre os dados no Render

O SQLite é um arquivo. No plano gratuito do Render, ele fica em um disco temporário e pode ser reiniciado a cada deploy. Para um trabalho acadêmico isso é suficiente. Se precisar de dados permanentes, use um disco persistente (pago) ou migre para PostgreSQL.

## Segurança

Antes de publicar de verdade:

- Troque a `SECRET_KEY` no `.env` (ou use a gerada pelo Render).
- Defina `SEED_DEMO=0` para não criar contas de demonstração.
- Em HTTPS, defina `SESSION_COOKIE_SECURE=1`.
- Nunca envie o arquivo `.env` para o GitHub (ele já está no `.gitignore`).

## Observação sobre a pasta `files/`

A pasta `files/` guarda a versão anterior da API, enviada ao repositório antes desta interface. A versão executável e atualizada é a que está na **raiz do projeto** (`app.py` + `templates/` + `static/`).

---

Feito por **Miguel Stefano** · M-TRON Engenharia
