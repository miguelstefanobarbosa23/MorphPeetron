# morphpeetron — Back-end (Flask + MySQL)

API REST em **Flask**, organizada em **POO** + padrão **DAO** (SQL puro com `mysql-connector-python`).

```
Requisição → routes/ (controller) → models/ (regras e validação) → daos/ (SQL) → MySQL
```

## Como rodar

```bash
python -m venv venv
source venv/bin/activate              # Windows: venv\Scripts\activate
pip install -r requirements.txt

mysql -u root -p < database/schema.sql   # cria o banco e as tabelas
cp .env.example .env                      # ajuste usuário/senha do MySQL e a SECRET_KEY

python app.py                             # http://127.0.0.1:5000
```

## Autenticação

`/api/cadastro`, `/api/login` e `/api/profissoes` são públicas. Todas as outras exigem o header
`Authorization: Bearer <token>` (Postman/Insomnia: aba **Auth → Bearer Token**).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/profissoes` | Opções da tela de seleção de profissão |
| POST | `/api/cadastro` | Cadastra usuário |
| POST | `/api/login` | Autentica e devolve o token JWT |
| GET | `/api/engenheiros` | Lista engenheiros |
| GET, POST | `/api/clientes` | Lista / cria clientes |
| GET, PUT, DELETE | `/api/clientes/<id>` | Detalha / atualiza / remove cliente |
| GET, POST | `/api/obras` | Lista (`?engenheiro_id=`) / cria obras |
| GET, PUT, DELETE | `/api/obras/<id>` | Detalha / atualiza / remove obra |
| GET, POST | `/api/equipamentos` | Lista (`?status=`) / cria equipamentos |
| GET, PUT, DELETE | `/api/equipamentos/<id>` | Detalha / atualiza / remove equipamento |
| PUT, PATCH | `/api/equipamentos/<id>/status` | Atualiza o status do equipamento |

Nos `PUT`, campos omitidos no JSON mantêm o valor atual. Erros sempre voltam em JSON:
`{"erro": "mensagem", "detalhes": ["..."]}`.

## Roteiro de teste (Postman / Insomnia)

Use **Body → raw → JSON** e siga esta ordem.

**1. `POST /api/cadastro`**
```json
{ "nome": "Maria Souza", "email": "maria@exemplo.com", "senha": "123456", "profissao": "Engenheiro" }
```

**2. `POST /api/login`** — copie o `token` da resposta e use como Bearer Token nas próximas chamadas.
```json
{ "email": "maria@exemplo.com", "senha": "123456" }
```

**3. `POST /api/clientes`**
```json
{ "nome": "Construtora Alfa", "email": "contato@alfa.com", "telefone": "19 99999-0000", "documento": "12.345.678/0001-90" }
```

**4. `POST /api/obras`** (use os ids devolvidos nos passos anteriores)
```json
{
  "nome": "Edifício Aurora",
  "descricao": "Obra residencial de 12 andares",
  "data_inicio": "2026-12-01",
  "data_fim": "2027-12-01",
  "engenheiro_id": 1,
  "cliente_id": 1
}
```

**5. `POST /api/equipamentos`**
```json
{ "nome": "Betoneira 400L", "status": "Ativo", "data_ultima_manutencao": "2026-10-15" }
```

**6. `PUT /api/equipamentos/1/status`**
```json
{ "status": "Em manutenção", "data_ultima_manutencao": "2026-11-11" }
```

**7. Consultas:** `GET /api/obras`, `GET /api/obras/1`, `GET /api/equipamentos?status=Em manutenção`.

## Trocar para PostgreSQL

Só mudam: o driver (`psycopg2`) em `database/connection.py`, o cursor de dicionário (`RealDictCursor`),
o `lastrowid` (use `RETURNING id`) e o `schema.sql` (`SERIAL` no lugar de `AUTO_INCREMENT`, e `CHECK`
no lugar do `ENUM`). Os placeholders `%s` dos DAOs são os mesmos nos dois drivers.
