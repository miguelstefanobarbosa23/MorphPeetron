/* =====================================================================
   MorphPeetron — MODO DEMONSTRAÇÃO (demo-api.js)
   ---------------------------------------------------------------------
   O GitHub Pages publica só o front-end (HTML/CSS/JS) — lá não existe
   Flask nem MySQL. Para o site continuar navegável no Pages, este arquivo
   simula a API EXATA do back-end usando localStorage como "banco":

     * Mesmas rotas, mesmos contratos, mesmos códigos HTTP e mensagens.
     * Mesmo seed do database/bootstrap.py (Maria/Ricardo/Fernanda/Bruno,
       senha 123456, 3 clientes, 4 obras, 5 equipamentos, 4 orçamentos).
     * Os dados ficam salvos APENAS no navegador de quem está vendo.

   Quando o projeto roda com o Flask (python app.py), a API REAL responde
   primeiro e este arquivo nem é acionado — o fallback acontece somente
   quando o fetch falha (Pages/file://) ou devolve um 404 em HTML.
   ===================================================================== */
"use strict";

window.DEMO_API = (function () {

    /* ------------------------- "Banco" (localStorage) ------------------------- */
    const CHAVE_DB = "mp_demo_db";

    const PROFISSOES = ["Engenheiro", "Arquiteto", "Técnico", "Administrador"];
    const STATUS_EQUIPAMENTO = ["Ativo", "Em manutenção"];
    const STATUS_ORCAMENTO = ["Rascunho", "Enviado", "Aprovado", "Rejeitado"];
    const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    /* Seed idêntico ao bootstrap.py (os IDs seguem a ordem de inserção). */
    function seed() {
        return {
            versao: 1,
            seq: { usuarios: 5, clientes: 4, obras: 5, equipamentos: 6, orcamentos: 5 },
            usuarios: [
                { id: 1, nome: "Maria Souza", email: "maria@exemplo.com", profissao: "Engenheiro", senha: "123456", criado_em: "2026-01-05T09:00:00" },
                { id: 2, nome: "Ricardo Almeida", email: "ricardo.almeida@morphpeetron.com", profissao: "Engenheiro", senha: "123456", criado_em: "2026-01-05T09:00:00" },
                { id: 3, nome: "Fernanda Costa", email: "fernanda.costa@morphpeetron.com", profissao: "Engenheiro", senha: "123456", criado_em: "2026-01-05T09:00:00" },
                { id: 4, nome: "Bruno Oliveira", email: "bruno.oliveira@morphpeetron.com", profissao: "Arquiteto", senha: "123456", criado_em: "2026-01-05T09:00:00" },
            ],
            clientes: [
                { id: 1, nome: "Construtora Alfa Ltda", email: "contato@alfa.com.br", telefone: "19 99999-0000", documento: "12.345.678/0001-90", endereco: "Av. das Amoreiras, 500 - Campinas/SP", criado_em: "2026-01-06T10:30:00" },
                { id: 2, nome: "Investimentos Beta S.A.", email: "obras@beta.com.br", telefone: "11 98888-1212", documento: "98.765.432/0001-10", endereco: "Rua XV de Novembro, 1200 - São Paulo/SP", criado_em: "2026-01-06T10:30:00" },
                { id: 3, nome: "Marta Andrade", email: "marta.andrade@gmail.com", telefone: "19 3232-4505", documento: "123.456.789-09", endereco: "Rua dos Ipês, 88 - Paulínia/SP", criado_em: "2026-01-06T10:30:00" },
            ],
            obras: [
                { id: 1, nome: "Edifício Aurora", descricao: "Obra residencial de 12 pavimentos com 96 apartamentos.", data_inicio: "2026-01-15", data_fim: null, engenheiro_id: 1, cliente_id: 1, criado_em: "2026-01-07T08:00:00" },
                { id: 2, nome: "Residencial Bela Vista", descricao: "Condomínio de 8 casas geminadas em fase de fundação.", data_inicio: "2026-03-02", data_fim: "2027-03-02", engenheiro_id: 2, cliente_id: 2, criado_em: "2026-01-07T08:05:00" },
                { id: 3, nome: "Galpão Industrial Delta", descricao: "Estrutura pré-moldada de 4.000 m² para centro logístico.", data_inicio: "2025-06-10", data_fim: "2026-02-28", engenheiro_id: 3, cliente_id: 1, criado_em: "2026-01-07T08:10:00" },
                { id: 4, nome: "Reforma Loja Central", descricao: "Modernização de piso, fachada e iluminação da loja âncora.", data_inicio: "2026-10-05", data_fim: null, engenheiro_id: 1, cliente_id: 3, criado_em: "2026-01-07T08:15:00" },
            ],
            equipamentos: [
                { id: 1, nome: "Betoneira 400L", status: "Ativo", data_ultima_manutencao: "2026-09-20", responsavel_id: 1, criado_em: "2026-01-08T09:00:00" },
                { id: 2, nome: "Plataforma Elevatória 8m", status: "Em manutenção", data_ultima_manutencao: "2026-11-02", responsavel_id: 2, criado_em: "2026-01-08T09:05:00" },
                { id: 3, nome: "Rompedor MK-100", status: "Ativo", data_ultima_manutencao: "2026-08-11", responsavel_id: 3, criado_em: "2026-01-08T09:10:00" },
                { id: 4, nome: "Compressor de Ar 25 Pés", status: "Ativo", data_ultima_manutencao: "2026-10-05", responsavel_id: null, criado_em: "2026-01-08T09:15:00" },
                { id: 5, nome: "Vibrador de Imersão 40mm", status: "Em manutenção", data_ultima_manutencao: "2026-10-30", responsavel_id: null, criado_em: "2026-01-08T09:20:00" },
            ],
            orcamentos: [
                { id: 1, nome_cliente: "Construtora Alfa Ltda", engenheiro_id: 1, descricao: "Estrutura e alvenaria do Edifício Aurora (2 primeiros pavimentos).", valor_material: 145000.0, valor_mao_obra: 82000.0, status: "Enviado", data_criacao: "2026-01-20T14:00:00" },
                { id: 2, nome_cliente: "Investimentos Beta S.A.", engenheiro_id: 2, descricao: "Fundação e cobertura das 8 casas da Bela Vista.", valor_material: 98000.0, valor_mao_obra: 64000.0, status: "Aprovado", data_criacao: "2026-02-10T11:30:00" },
                { id: 3, nome_cliente: "Construtora Alfa Ltda", engenheiro_id: 3, descricao: "Pré-moldados e instalações do Galpão Delta.", valor_material: 210000.0, valor_mao_obra: 130000.0, status: "Rejeitado", data_criacao: "2026-03-05T16:45:00" },
                { id: 4, nome_cliente: "Marta Andrade", engenheiro_id: 1, descricao: "Reforma completa da Loja Central (piso, fachada e iluminação).", valor_material: 27500.0, valor_mao_obra: 18000.0, status: "Rascunho", data_criacao: "2026-10-06T10:00:00" },
            ],
        };
    }

    function carregar() {
        try {
            const bruto = localStorage.getItem(CHAVE_DB);
            if (bruto) {
                const db = JSON.parse(bruto);
                if (db && db.versao === 1) return db;
            }
        } catch (e) { /* corrompido: recria o seed */ }
        const db = seed();
        salvar(db);
        return db;
    }

    function salvar(db) {
        try { localStorage.setItem(CHAVE_DB, JSON.stringify(db)); } catch (e) { /* quota cheia: segue em memória */ }
    }

    /* --------------------- Helpers de conversão ( BaseModel ) --------------------- */

    const normalizar = (valor) => {
        if (valor === null || valor === undefined) return null;
        const texto = String(valor).trim();
        return texto || null;
    };

    const hojeISO = () => {
        const d = new Date(), p = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };

    const agoraISO = () => {
        const d = new Date(), p = (n) => String(n).padStart(2, "0");
        return `${hojeISO()}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };

    /* round() do Python (o Flask devolve números com 2 casas). */
    const moeda2 = (numero) => Math.round((numero + Number.EPSILON) * 100) / 100;

    class ErroDeValidacao extends Error { } // espelha a exceção do back-end (vira HTTP 400)

    function converterData(valor, campo) {
        if (valor === null || valor === undefined || valor === "") return null;
        const texto = String(valor).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(texto))) return texto;
        throw new ErroDeValidacao(`'${campo}' deve estar no formato AAAA-MM-DD.`);
    }

    function converterInteiro(valor, campo) {
        if (valor === null || valor === undefined || valor === "") return null;
        if (typeof valor === "boolean") throw new ErroDeValidacao(`'${campo}' deve ser um número inteiro.`);
        const numero = Number(valor);
        if (!Number.isFinite(numero) || Math.trunc(numero) !== numero) {
            throw new ErroDeValidacao(`'${campo}' deve ser um número inteiro.`);
        }
        return Math.trunc(numero);
    }

    /* Espelha Orcamento._converter_moeda: aceita número ou '1.250,90' / 'R$ 1.250,90'. */
    function converterMoeda(valor, campo) {
        if (valor === null || valor === undefined || valor === "") return 0.0;
        if (typeof valor === "boolean") throw new ErroDeValidacao(`'${campo}' deve ser um valor monetário.`);
        if (typeof valor === "string") {
            const texto = valor.trim().replace("R$", "").replace(/\s/g, "");
            valor = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
        }
        const numero = Number(valor);
        if (Number.isNaN(numero)) throw new ErroDeValidacao(`'${campo}' deve ser um valor monetário válido.`);
        if (numero < 0) throw new ErroDeValidacao(`'${campo}' não pode ser negativo.`);
        return moeda2(numero);
    }

    /* ----------------------------- "Rotas" da API ----------------------------- */

    const Erro = (mensagem, status = 400, detalhes = null) => {
        const corpo = { erro: mensagem };
        if (detalhes && detalhes.length) corpo.detalhes = detalhes;
        return { status, corpo };
    };

    /* Espelha utils/auth.py: valida o "token" demo e devolve o id do usuário. */
    function usuarioDoToken(token) {
        const db = carregar();
        const ehDemo = typeof token === "string" && token.startsWith("demo.");
        const id = ehDemo ? converterInteiro(token.split(".")[1], "token") : null;
        const usuario = id !== null ? db.usuarios.find((u) => u.id === id) : null;
        if (!usuario) return null;
        return usuario;
    }

    function semSessao() {
        return Erro("Token ausente. Envie o header 'Authorization: Bearer <token>'.", 401);
    }

    /* Serialização idêntica aos to_dict() dos modelos (senha_hash nunca sai). */
    const serializarUsuario = (u) => ({
        id: u.id, nome: u.nome, email: u.email, profissao: u.profissao, criado_em: u.criado_em,
    });

    const serializarObra = (o, db) => {
        const eng = db.usuarios.find((u) => u.id === o.engenheiro_id);
        const cli = o.cliente_id != null ? db.clientes.find((c) => c.id === o.cliente_id) : null;
        return { ...o, engenheiro_nome: eng ? eng.nome : null, cliente_nome: cli ? cli.nome : null };
    };

    const serializarOrcamento = (o, db) => {
        const eng = db.usuarios.find((u) => u.id === o.engenheiro_id);
        return { ...o, engenheiro_nome: eng ? eng.nome : null, valor_total: moeda2(o.valor_material + o.valor_mao_obra) };
    };

    /* Validações espelhando models/*.py (mesma ordem e mesma redação das mensagens). */
    function validarUsuario(dados) {
        const erros = [];
        const nome = normalizar(dados.nome) || "";
        const email = (normalizar(dados.email) || "").toLowerCase();
        const profissao = normalizar(dados.profissao);
        if (nome.length < 3) erros.push("O nome deve ter pelo menos 3 caracteres.");
        if (!EMAIL_REGEX.test(email)) erros.push("E-mail inválido.");
        if (!PROFISSOES.includes(profissao)) {
            erros.push("Profissão inválida. Opções: " + PROFISSOES.join(", ") + ".");
        }
        return { erros, nome, email, profissao };
    }

    function validarCliente(dados) {
        const erros = [];
        const nome = normalizar(dados.nome) || "";
        const email = normalizar(dados.email);
        if (nome.length < 3) erros.push("O nome do cliente deve ter pelo menos 3 caracteres.");
        if (email && !EMAIL_REGEX.test(email)) erros.push("E-mail inválido.");
        return {
            erros,
            cliente: {
                nome,
                email: email ? email.toLowerCase() : null,
                telefone: normalizar(dados.telefone),
                documento: normalizar(dados.documento),
                endereco: normalizar(dados.endereco),
            },
        };
    }

    function validarObra(dados, db) {
        const erros = [];
        const obra = {
            nome: normalizar(dados.nome) || "",
            descricao: normalizar(dados.descricao),
            data_inicio: converterData(dados.data_inicio, "data_inicio"),
            data_fim: converterData(dados.data_fim, "data_fim"),
            engenheiro_id: converterInteiro(dados.engenheiro_id, "engenheiro_id"),
            cliente_id: converterInteiro(dados.cliente_id, "cliente_id"),
        };
        if (obra.nome.length < 3) erros.push("O nome da obra deve ter pelo menos 3 caracteres.");
        if (obra.data_inicio === null) erros.push("'data_inicio' é obrigatória (AAAA-MM-DD).");
        if (obra.engenheiro_id === null) erros.push("'engenheiro_id' é obrigatório.");
        if (obra.data_inicio && obra.data_fim && obra.data_fim < obra.data_inicio) {
            erros.push("'data_fim' não pode ser anterior a 'data_inicio'.");
        }
        if (obra.engenheiro_id !== null) {
            const eng = db.usuarios.find((u) => u.id === obra.engenheiro_id);
            if (!eng || eng.profissao !== "Engenheiro") {
                erros.push("'engenheiro_id' deve ser o id de um usuário com profissão Engenheiro.");
            }
        }
        if (obra.cliente_id !== null && !db.clientes.find((c) => c.id === obra.cliente_id)) {
            erros.push("'cliente_id' não encontrado.");
        }
        return { erros, obra };
    }

    function validarEquipamento(dados, db) {
        const erros = [];
        const equipamento = {
            nome: normalizar(dados.nome) || "",
            status: normalizar(dados.status) || "Ativo",
            data_ultima_manutencao: converterData(dados.data_ultima_manutencao, "data_ultima_manutencao"),
            responsavel_id: converterInteiro(dados.responsavel_id, "responsavel_id"),
        };
        if (equipamento.nome.length < 2) erros.push("O nome do equipamento é obrigatório.");
        if (!STATUS_EQUIPAMENTO.includes(equipamento.status)) {
            erros.push("Status inválido. Use: " + STATUS_EQUIPAMENTO.join(", ") + ".");
        }
        if (equipamento.responsavel_id !== null && !db.usuarios.find((u) => u.id === equipamento.responsavel_id)) {
            erros.push("'responsavel_id' não corresponde a um usuário existente.");
        }
        return { erros, equipamento };
    }

    function validarOrcamento(dados, db) {
        const erros = [];
        const orcamento = {
            nome_cliente: normalizar(dados.nome_cliente) || "",
            descricao: normalizar(dados.descricao),
            engenheiro_id: converterInteiro(dados.engenheiro_id, "engenheiro_id"),
            valor_material: converterMoeda(dados.valor_material, "valor_material"),
            valor_mao_obra: converterMoeda(dados.valor_mao_obra, "valor_mao_obra"),
            status: normalizar(dados.status) || "Rascunho",
        };
        if (orcamento.nome_cliente.length < 3) {
            erros.push("O nome do cliente do orçamento deve ter pelo menos 3 caracteres.");
        }
        if (orcamento.engenheiro_id === null) erros.push("'engenheiro_id' é obrigatório.");
        if (!STATUS_ORCAMENTO.includes(orcamento.status)) {
            erros.push("Status inválido. Use: " + STATUS_ORCAMENTO.join(", ") + ".");
        }
        if (orcamento.engenheiro_id !== null) {
            const eng = db.usuarios.find((u) => u.id === orcamento.engenheiro_id);
            if (!eng || eng.profissao !== "Engenheiro") {
                erros.push("'engenheiro_id' deve ser o id de um usuário com profissão Engenheiro.");
            }
        }
        return { erros, orcamento };
    }

    /* GET /api/resumo — números agregados exatamente como em resumo_routes.py. */
    function montarResumo(db) {
        const hoje = hojeISO();
        const obrasAtivas = db.obras.filter((o) => o.data_fim === null || o.data_fim >= hoje);
        const equipAtivos = db.equipamentos.filter((e) => e.status === "Ativo");
        const porStatus = {};
        for (const status of STATUS_ORCAMENTO) porStatus[status] = 0;
        for (const o of db.orcamentos) porStatus[o.status] += 1;

        const soma = (campo, filtro) => moeda2(
            db.orcamentos.filter(filtro || (() => true)).reduce((t, o) => t + o[campo], 0));

        return {
            obras: {
                total: db.obras.length,
                ativas: obrasAtivas.length,
                concluidas: db.obras.length - obrasAtivas.length,
            },
            equipamentos: {
                total: db.equipamentos.length,
                ativos: equipAtivos.length,
                em_manutencao: db.equipamentos.length - equipAtivos.length,
            },
            clientes: { total: db.clientes.length },
            engenheiros: { total: db.usuarios.filter((u) => u.profissao === "Engenheiro").length },
            orcamentos: {
                total: db.orcamentos.length,
                por_status: porStatus,
                valor_total: moeda2(db.orcamentos.reduce(
                    (t, o) => t + o.valor_material + o.valor_mao_obra, 0)),
                valor_material: soma("valor_material"),
                valor_mao_obra: soma("valor_mao_obra"),
                valor_aprovado: moeda2(db.orcamentos
                    .filter((o) => o.status === "Aprovado")
                    .reduce((t, o) => t + o.valor_material + o.valor_mao_obra, 0)),
            },
        };
    }

    /* ---------------------------- Despacho de rotas ---------------------------- */

    function requisicao(metodo, caminho, corpo) {
        try {
            return despachar(metodo.toUpperCase(), caminho, corpo || {});
        } catch (excecao) {
            if (excecao instanceof ErroDeValidacao) return Erro(excecao.message, 400);
            return Erro("Erro inesperado no modo demonstração: " + excecao.message, 500);
        }
    }

    function despachar(metodo, caminho, corpo) {
        const db = carregar();
        const [rota, queryString] = caminho.split("?");
        const query = new URLSearchParams(queryString || "");
        const partes = rota.split("/").filter(Boolean); // "obras/3/status" -> ["obras","3","status"]
        const token = DEMO_API_tokenAtual;

        /* ---------- públicas ---------- */
        if (rota === "/profissoes" && metodo === "GET") {
            return { status: 200, corpo: { profissoes: PROFISSOES } };
        }
        if (rota === "/cadastro" && metodo === "POST") {
            const { erros, nome, email, profissao } = validarUsuario(corpo);
            const senha = typeof corpo.senha === "string" ? corpo.senha : "";
            if (typeof corpo.senha !== "string" || senha.length < 6) {
                erros.push("A senha deve ter pelo menos 6 caracteres.");
            }
            if (erros.length) return Erro("Dados inválidos.", 400, erros);
            if (db.usuarios.find((u) => u.email === email)) {
                return Erro("Este e-mail já está cadastrado.", 409);
            }
            const usuario = {
                id: db.seq.usuarios++, nome, email, profissao,
                senha, criado_em: agoraISO(),
            };
            db.usuarios.push(usuario);
            salvar(db);
            return { status: 201, corpo: serializarUsuario(usuario) };
        }
        if (rota === "/login" && metodo === "POST") {
            if (typeof corpo.email !== "string" || typeof corpo.senha !== "string") {
                return Erro("Informe 'email' e 'senha'.", 400);
            }
            const email = corpo.email.trim().toLowerCase();
            const usuario = db.usuarios.find((u) => u.email === email);
            if (!usuario || usuario.senha !== corpo.senha) {
                return Erro("E-mail ou senha incorretos.", 401);
            }
            return {
                status: 200,
                corpo: { token: `demo.${usuario.id}.${Date.now()}`, usuario: serializarUsuario(usuario) },
            };
        }

        /* ---------- protegidas (exigem token demo) ---------- */
        const usuario = usuarioDoToken(token);
        if (!usuario) return semSessao();

        if (rota === "/resumo" && metodo === "GET") {
            return { status: 200, corpo: montarResumo(db) };
        }

        if (rota === "/engenheiros" && metodo === "GET") {
            const lista = db.usuarios
                .filter((u) => u.profissao === "Engenheiro")
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map(serializarUsuario);
            return { status: 200, corpo: lista };
        }

        /* ------------------------------ clientes ------------------------------ */
        if (partes[0] === "clientes") {
            if (partes.length === 1 && metodo === "GET") {
                const lista = [...db.clientes]
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
                return { status: 200, corpo: lista };
            }
            if (partes.length === 1 && metodo === "POST") {
                const { erros, cliente } = validarCliente(corpo);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                if (cliente.documento && db.clientes.find((c) => c.documento === cliente.documento)) {
                    return Erro("Já existe um cliente com este documento.", 409);
                }
                cliente.id = db.seq.clientes++;
                cliente.criado_em = agoraISO();
                db.clientes.push(cliente);
                salvar(db);
                return { status: 201, corpo: cliente };
            }
            const id = converterInteiro(partes[1], "id");
            const indice = db.clientes.findIndex((c) => c.id === id);
            if (indice === -1) return Erro("Cliente não encontrado.", 404);

            if (partes.length === 2 && metodo === "GET") {
                return { status: 200, corpo: db.clientes[indice] };
            }
            if (partes.length === 2 && metodo === "PUT") {
                const mesclado = { ...db.clientes[indice], ...corpo };
                const { erros, cliente } = validarCliente(mesclado);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                const duplicado = db.clientes.find(
                    (c) => c.documento && c.documento === cliente.documento && c.id !== id);
                if (duplicado) return Erro("Já existe um cliente com este documento.", 409);
                cliente.id = id;
                cliente.criado_em = db.clientes[indice].criado_em;
                db.clientes[indice] = cliente;
                salvar(db);
                return { status: 200, corpo: cliente };
            }
            if (partes.length === 2 && metodo === "DELETE") {
                db.clientes.splice(indice, 1);
                // Equivalente ao ON DELETE SET NULL do schema: obras ficam sem cliente.
                for (const obra of db.obras) {
                    if (obra.cliente_id === id) obra.cliente_id = null;
                }
                salvar(db);
                return { status: 204, corpo: "" };
            }
        }

        /* ------------------------------- obras ------------------------------- */
        if (partes[0] === "obras") {
            if (partes.length === 1 && metodo === "GET") {
                // No Flask, ?engenheiro_id inválido vira None (sem filtro) — replicado aqui.
                let filtroEng = null;
                try {
                    if (query.has("engenheiro_id")) {
                        filtroEng = converterInteiro(query.get("engenheiro_id"), "engenheiro_id");
                    }
                } catch (e) { filtroEng = null; }
                const lista = db.obras
                    .filter((o) => filtroEng === null || o.engenheiro_id === filtroEng)
                    .sort((a, b) => // data_inicio DESC (nulos por último), id DESC
                        String(b.data_inicio || "").localeCompare(String(a.data_inicio || ""))
                        || b.id - a.id)
                    .map((o) => serializarObra(o, db));
                return { status: 200, corpo: lista };
            }
            if (partes.length === 1 && metodo === "POST") {
                const { erros, obra } = validarObra(corpo, db);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                obra.id = db.seq.obras++;
                obra.criado_em = agoraISO();
                db.obras.push(obra);
                salvar(db);
                return { status: 201, corpo: serializarObra(obra, db) };
            }
            const id = converterInteiro(partes[1], "id");
            const indice = db.obras.findIndex((o) => o.id === id);
            if (indice === -1) return Erro("Obra não encontrada.", 404);

            if (partes.length === 2 && metodo === "GET") {
                return { status: 200, corpo: serializarObra(db.obras[indice], db) };
            }
            if (partes.length === 2 && metodo === "PUT") {
                const mesclado = { ...serializarObra(db.obras[indice], db), ...corpo };
                const { erros, obra } = validarObra(mesclado, db);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                obra.id = id;
                obra.criado_em = db.obras[indice].criado_em;
                db.obras[indice] = obra;
                salvar(db);
                return { status: 200, corpo: serializarObra(obra, db) };
            }
            if (partes.length === 2 && metodo === "DELETE") {
                db.obras.splice(indice, 1);
                salvar(db);
                return { status: 204, corpo: "" };
            }
        }

        /* ---------------------------- equipamentos ---------------------------- */
        if (partes[0] === "equipamentos") {
            if (partes.length === 1 && metodo === "GET") {
                const filtroStatus = query.get("status");
                if (filtroStatus && !STATUS_EQUIPAMENTO.includes(filtroStatus)) {
                    return Erro("Status inválido. Use: " + STATUS_EQUIPAMENTO.join(", ") + ".", 400);
                }
                const lista = db.equipamentos
                    .filter((e) => !filtroStatus || e.status === filtroStatus)
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
                return { status: 200, corpo: lista };
            }
            if (partes.length === 1 && metodo === "POST") {
                const { erros, equipamento } = validarEquipamento(corpo, db);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                equipamento.id = db.seq.equipamentos++;
                equipamento.criado_em = agoraISO();
                db.equipamentos.push(equipamento);
                salvar(db);
                return { status: 201, corpo: equipamento };
            }
            const id = converterInteiro(partes[1], "id");
            const indice = db.equipamentos.findIndex((e) => e.id === id);
            if (indice === -1) return Erro("Equipamento não encontrado.", 404);

            if (partes.length === 2 && metodo === "GET") {
                return { status: 200, corpo: db.equipamentos[indice] };
            }
            if (partes.length === 2 && metodo === "PUT") {
                const mesclado = { ...db.equipamentos[indice], ...corpo };
                const { erros, equipamento } = validarEquipamento(mesclado, db);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                equipamento.id = id;
                equipamento.criado_em = db.equipamentos[indice].criado_em;
                db.equipamentos[indice] = equipamento;
                salvar(db);
                return { status: 200, corpo: equipamento };
            }
            if (partes.length === 3 && partes[2] === "status" && (metodo === "PUT" || metodo === "PATCH")) {
                const atual = db.equipamentos[indice];
                const novoStatus = normalizar(corpo.status);
                if (!STATUS_EQUIPAMENTO.includes(novoStatus)) {
                    throw new ErroDeValidacao("Status inválido. Use: " + STATUS_EQUIPAMENTO.join(", ") + ".");
                }
                const novaData = converterData(corpo.data_ultima_manutencao, "data_ultima_manutencao");
                atual.status = novoStatus;
                if (novaData !== null) atual.data_ultima_manutencao = novaData;
                salvar(db);
                return { status: 200, corpo: atual };
            }
            if (partes.length === 2 && metodo === "DELETE") {
                db.equipamentos.splice(indice, 1);
                salvar(db);
                return { status: 204, corpo: "" };
            }
        }

        /* ----------------------------- orçamentos ----------------------------- */
        if (partes[0] === "orcamentos") {
            if (partes.length === 1 && metodo === "GET") {
                let filtroEng = null;
                try {
                    if (query.has("engenheiro_id")) {
                        filtroEng = converterInteiro(query.get("engenheiro_id"), "engenheiro_id");
                    }
                } catch (e) { filtroEng = null; }
                const filtroStatus = query.get("status");
                if (filtroStatus && !STATUS_ORCAMENTO.includes(filtroStatus)) {
                    return Erro("Status inválido. Use: " + STATUS_ORCAMENTO.join(", ") + ".", 400);
                }
                const lista = db.orcamentos
                    .filter((o) => (filtroEng === null || o.engenheiro_id === filtroEng)
                        && (!filtroStatus || o.status === filtroStatus))
                    .sort((a, b) => b.data_criacao.localeCompare(a.data_criacao) || b.id - a.id)
                    .map((o) => serializarOrcamento(o, db));
                return { status: 200, corpo: lista };
            }
            if (partes.length === 1 && metodo === "POST") {
                const { erros, orcamento } = validarOrcamento(corpo, db);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                orcamento.id = db.seq.orcamentos++;
                orcamento.data_criacao = agoraISO();
                db.orcamentos.push(orcamento);
                salvar(db);
                return { status: 201, corpo: serializarOrcamento(orcamento, db) };
            }
            const id = converterInteiro(partes[1], "id");
            const indice = db.orcamentos.findIndex((o) => o.id === id);
            if (indice === -1) return Erro("Orçamento não encontrado.", 404);

            if (partes.length === 2 && metodo === "GET") {
                return { status: 200, corpo: serializarOrcamento(db.orcamentos[indice], db) };
            }
            if (partes.length === 2 && metodo === "PUT") {
                const mesclado = { ...serializarOrcamento(db.orcamentos[indice], db), ...corpo };
                const { erros, orcamento } = validarOrcamento(mesclado, db);
                if (erros.length) return Erro("Dados inválidos.", 400, erros);
                orcamento.id = id;
                orcamento.data_criacao = db.orcamentos[indice].data_criacao;
                db.orcamentos[indice] = orcamento;
                salvar(db);
                return { status: 200, corpo: serializarOrcamento(orcamento, db) };
            }
            if (partes.length === 2 && metodo === "DELETE") {
                db.orcamentos.splice(indice, 1);
                salvar(db);
                return { status: 204, corpo: "" };
            }
        }

        /* ---------- rota inexistente (mesma resposta do Flask) ---------- */
        return Erro("Rota não encontrada.", 404);
    }

    /* O api() do script.js informa o token da sessão antes de chamar o demo. */
    let DEMO_API_tokenAtual = null;

    return {
        /** Processa uma chamada como se fosse o back-end: devolve {status, corpo}. */
        requisicao,
        /** Chamado pelo script.js a cada requisição (define o "usuário logado"). */
        definirToken(token) { DEMO_API_tokenAtual = token; },
        /** Limpa os dados de demonstração deste navegador (volta ao seed). */
        reiniciar() { localStorage.removeItem(CHAVE_DB); },
    };
})();
