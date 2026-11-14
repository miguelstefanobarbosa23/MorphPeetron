/* =====================================================================
   MorphPeetron — front-end (JavaScript puro, ES6+)
   Comunicação com a API Flask EXCLUSIVAMENTE via Fetch API (async/await),
   trocando JSON, sem recarregar a página.
   Ícones: SVG inline (nenhum emoji), paleta oficial M-TRON.
   ===================================================================== */
"use strict";

/* ------------------------------ Constantes ------------------------------ */
const CHAVE_TOKEN = "mp_token";
const CHAVE_USUARIO = "mp_usuario";

/* Se o front for aberto pelo Live Server (porta 5500), aponta direto para a API do Flask */
const API_BASE = ["5500", "3000"].includes(location.port)
    ? "http://127.0.0.1:5000/api"
    : "/api";

const State = {
    token: localStorage.getItem(CHAVE_TOKEN) || null,
    usuario: JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "null"),
    cache: {},
    tema: "mtron",
};

/* ================= SISTEMA DE TEMA POR PROFISSÃO ==========================
   Um único site, oito identidades visuais. O tema ativo vive no atributo
   data-tema do <html> e os componentes consomem variáveis CSS globais
   (--color-primary, --color-surface, ...) — nada de hex solto nas telas.
   Persistência: localStorage "mp_tema" (aplicado antes do CSS, no index.html,
   para não haver flash de cor errada). */
const CHAVE_TEMA = "mp_tema";
const TEMA_PADRAO = "mtron"; /* identidade original da M-TRON */
const IDS_TEMA = new Set([
    "arquitetura", "medicina", "direito", "informatica",
    "psicologia", "farmacia", "professor", "artes",
]);

/* Profissão do perfil (backend) -> universo visual */
const TEMA_POR_PROFISSAO = {
    Engenheiro: "arquitetura",
    Arquiteto: "arquitetura",
    "Técnico": "informatica",
    Administrador: "direito",
};

const temaAtivo = () => document.documentElement.getAttribute("data-tema") || TEMA_PADRAO;

const temaSalvo = () => {
    try { return localStorage.getItem(CHAVE_TEMA); } catch { return null; }
};

/* Favicon e cor do navegador acompanham o tema (lendo as variáveis do CSS:
   as cores só existem em um lugar — a folha de estilo). */
/* Logo oficial M-TRON: o "M" com gradiente azul → turquesa → verde
   (identidade fixa da marca, independente do tema de profissão). */
const GRADIENTE_MTRON = `<defs><linearGradient id="g-mtron" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#1E7FC2"/><stop offset=".52" stop-color="#17A398"/><stop offset="1" stop-color="#27AE60"/>
</linearGradient></defs>`;

function atualizarCromeDoTema() {
    const estilo = getComputedStyle(document.documentElement);
    const fundo = estilo.getPropertyValue("--color-background").trim() || "#faf5ea";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${GRADIENTE_MTRON}<path d="M10 52 V26 Q10 12 22 18 L32 38 L42 18 Q54 12 54 26 V52" stroke="url(%23g-mtron)" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) meta.setAttribute("content", fundo);
}

function aplicarTema(id, { salvar = true, animar = true } = {}) {
    if (id && id !== TEMA_PADRAO && !IDS_TEMA.has(id)) return;
    if (!id || id === TEMA_PADRAO) {
        document.documentElement.removeAttribute("data-tema");
        if (salvar) { try { localStorage.removeItem(CHAVE_TEMA); } catch { /* ok */ } }
    } else {
        document.documentElement.setAttribute("data-tema", id);
        if (salvar) { try { localStorage.setItem(CHAVE_TEMA, id); } catch { /* ok */ } }
    }
    State.tema = id || TEMA_PADRAO;
    atualizarCromeDoTema();

    /* Transição suave de recolorimento global (desligada p/ reduced-motion) */
    if (animar && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        clearTimeout(aplicarTema._timer);
        document.documentElement.classList.add("trocando-tema");
        aplicarTema._timer = setTimeout(
            () => document.documentElement.classList.remove("trocando-tema"), 700);
    }
}

/* Tema inicial: o salvo no dispositivo (o atributo já veio do index.html,
   aqui só sincroniza o State e o favicon) */
aplicarTema(temaSalvo(), { salvar: false, animar: false });

/* ---------------- Cache em memória (velocidade percebida) ----------------
   Listas de apoio (engenheiros, clientes, profissões) são guardadas por um
   tempo curto: alternar de tela não repete as mesmas buscas, e qualquer
   alteração invalida o cache correspondente. */
const VALIDADE_PADRAO = 60_000;      /* 60 segundos */
const VALIDADE_PROFISSOES = 600_000; /* 10 minutos  */

const lembrar = (chave, validadeMs = VALIDADE_PADRAO) => {
    const entrada = State.cache[chave];
    if (entrada && Date.now() - entrada.quando < validadeMs) return entrada.dados;
    return null;
};

const memorizar = (chave, dados) => {
    State.cache[chave] = { dados, quando: Date.now() };
    return dados;
};

const esquecer = (...chaves) => {
    for (const chave of chaves) delete State.cache[chave];
};

/* Consulta que responde do cache quando possível; senão busca na API */
function apiCache(chave, caminho, validadeMs = VALIDADE_PADRAO) {
    const emMemoria = lembrar(chave, validadeMs);
    return emMemoria
        ? Promise.resolve(emMemoria)
        : api(caminho).then((dados) => memorizar(chave, dados));
}

/* ------------------------------ Ícones (SVG) ---------------------------- */
const ICONES = {
    painel: `<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/>
             <rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/>
             <rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/>
             <rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>`,
    obras: `<path d="M4.5 20V7.2A1.7 1.7 0 0 1 6.2 5.5h5.1a1.7 1.7 0 0 1 1.7 1.7V20"/>
            <path d="M13 10h4.8a1.7 1.7 0 0 1 1.7 1.7V20"/>
            <path d="M3 20h18"/>
            <path d="M7.3 9.3h1.3M7.3 12.5h1.3M7.3 15.7h1.3M15.6 13.4h1.3M15.6 16.6h1.3"/>`,
    engenheiros: `<circle cx="12" cy="8.2" r="3.1"/>
                  <path d="M8.6 5.7a3.4 3.4 0 0 1 6.8 0"/>
                  <path d="M5 20c.8-3.3 3.7-5.1 7-5.1s6.2 1.8 7 5.1"/>`,
    clientes: `<circle cx="9" cy="8.5" r="3"/>
               <path d="M3.5 19c.7-2.9 3-4.4 5.5-4.4s4.8 1.5 5.5 4.4"/>
               <path d="M15.4 5.6a3 3 0 0 1 0 5.8"/>
               <path d="M16.6 14.9c2 .5 3.5 1.9 3.9 4.1"/>`,
    equipamentos: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
    orcamentos: `<path d="M7 3.5h7L18.5 8v10.5A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 3.5z"/>
                 <path d="M13.5 3.5V8h5"/>
                 <path d="M8.5 12.5h7M8.5 16h5"/>`,
    caixa: `<path d="M12 3.2 20 7.7v8.6L12 20.8 4 16.3V7.7z"/>
            <path d="M4 7.7l8 4.5 8-4.5M12 12.2v8.6"/>`,
    capacete: `<path d="M4.6 15.6a7.4 7.4 0 0 1 14.8 0"/>
               <path d="M3 15.6h18v1.9a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.5z"/>
               <path d="M10 9.3V6.1a2 2 0 0 1 4 0v3.2"/>`,
    compasso: `<circle cx="12" cy="4.8" r="1.4"/>
               <path d="M10.8 6.1 5.2 19.2M13.2 6.1l5.6 13.1M7.4 14.4a9.6 9.6 0 0 0 9.2 0"/>`,
    prancheta: `<rect x="5" y="4.5" width="14" height="16.5" rx="1.8"/>
                <path d="M9.2 4.5V3.4A1.4 1.4 0 0 1 10.6 2h2.8a1.4 1.4 0 0 1 1.4 1.4v1.1"/>
                <path d="M9 11.5h6M9 15h4"/>`,
    mala: `<rect x="3.5" y="7.8" width="17" height="12.2" rx="2"/>
           <path d="M9.3 7.8V6.4a1.9 1.9 0 0 1 1.9-1.9h1.6a1.9 1.9 0 0 1 1.9 1.9v1.4"/>
           <path d="M3.5 12.6h17"/>`,
    mais: `<path d="M12 5.5v13M5.5 12h13"/>`,
    editar: `<path d="M16.7 3.8a2.2 2.2 0 0 1 3.1 3.1L7.6 19.1 3.4 20.6l1.5-4.2z"/>
             <path d="M14.6 5.9l3 3"/>`,
    excluir: `<path d="M4.5 7h15"/>
              <path d="M9.5 7V5.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/>
              <path d="M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>
              <path d="M10 11v5.5M14 11v5.5"/>`,
    fechar: `<path d="M6 6l12 12M18 6L6 18"/>`,
    menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
    sair: `<path d="M12 3.5v7.5"/>
           <path d="M7.2 6.2a7.4 7.4 0 1 0 9.6 0"/>`,
    buscar: `<circle cx="11" cy="11" r="6.5"/>
             <path d="M20 20l-4.2-4.2"/>`,
    alerta: `<path d="M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/>
             <path d="M12 9.5V14"/>
             <path d="M12 17.1h.01"/>`,
    sucesso: `<circle cx="12" cy="12" r="8.5"/>
              <path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>`,
    info: `<circle cx="12" cy="12" r="8.5"/>
           <path d="M12 11.2v5"/>
           <path d="M12 8h.01"/>`,
    alternar: `<path d="M3.5 8a8.5 8.5 0 0 1 14.6-2.9l2.4 2.4"/>
               <path d="M20.5 3.5v4h-4"/>
               <path d="M20.5 16a8.5 8.5 0 0 1-14.6 2.9l-2.4-2.4"/>
               <path d="M3.5 20.5v-4h4"/>`,
    /* --- Ícones dos universos profissionais --- */
    estetoscopio: `<path d="M6 3v5a4 4 0 0 0 8 0V3"/>
                   <path d="M10 12v2.6a5.4 5.4 0 0 0 10.8 0V13"/>
                   <circle cx="20.8" cy="10.6" r="1.7"/>`,
    cruz: `<path d="M9.8 4h4.4a1 1 0 0 1 1 1v4.8H20a1 1 0 0 1 1 1v4.4a1 1 0 0 1-1 1h-4.8V20a1 1 0 0 1-1 1H9.8a1 1 0 0 1-1-1v-4.8H4a1 1 0 0 1-1-1v-4.4a1 1 0 0 1 1-1h4.8V5a1 1 0 0 1 1-1z"/>`,
    balanca: `<path d="M12 4v16M8.5 20h7"/>
              <path d="M5 7h14"/>
              <path d="M7 7l-2.6 5.4a2.9 2.9 0 0 0 5.2 0z"/>
              <path d="M17 7l-2.6 5.4a2.9 2.9 0 0 0 5.2 0z"/>`,
    martelo: `<path d="m13.6 3.2 7.2 7.2-2.6 2.6-7.2-7.2z"/>
              <path d="m11.5 8.7-8 8 2.3 2.3 8-8"/>
              <path d="M3.2 20.8h6.4"/>`,
    chip: `<rect x="7" y="7" width="10" height="10" rx="2"/>
           <path d="M10 2.8V7M14 2.8V7M10 17v4.2M14 17v4.2M2.8 10H7M2.8 14H7M17 10h4.2M17 14h4.2"/>`,
    codigo: `<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.2 5.5l-2.4 13"/>`,
    conversa: `<path d="M3.5 6.2A2.2 2.2 0 0 1 5.7 4h8.1a2.2 2.2 0 0 1 2.2 2.2v4.6a2.2 2.2 0 0 1-2.2 2.2H9.3l-4.4 3.4V13h-.9a2.2 2.2 0 0 1-.5-4.4z"/>
               <path d="M19.6 9.2c1 .6 1.9 1.7 1.9 3.2 0 1-.4 1.9-1 2.5l.4 2.3-2.3-1.2c-.5.2-1 .3-1.5.3"/>`,
    coracao: `<path d="M12 20.2S4.6 15.9 2.9 11.5C1.6 8.2 3.6 5.2 6.5 5.2c2 0 3.5 1.2 4.1 2.4l1.4 2.5 1.4-2.5c.6-1.2 2.1-2.4 4.1-2.4 2.9 0 4.9 3 3.6 6.3-1.7 4.4-9.1 8.7-9.1 8.7z"/>`,
    matraz: `<path d="M9 3h6M10.2 3v5.1L5.4 16.9a2.7 2.7 0 0 0 2.4 4h8.4a2.7 2.7 0 0 0 2.4-4l-4.8-8.8V3"/>
             <path d="M7.6 13.6h8.8"/>`,
    pastilha: `<rect x="3" y="8.4" width="18" height="7.2" rx="3.6"/>
               <path d="M12 8.4v7.2"/>`,
    livro: `<path d="M12 6.2C10.2 4.9 8 4.2 5.5 4.2v13.2c2.5 0 4.7.7 6.5 2 1.8-1.3 4-2 6.5-2V4.2c-2.5 0-4.7.7-6.5 2z"/>
            <path d="M12 6.2v13.2"/>`,
    lapis: `<path d="m14.6 4.4 5 5L8.2 20.8l-5.6 1 1-5.6z"/>
            <path d="m12.6 6.4 5 5"/>`,
    pincel: `<path d="M20.4 3.6c-3.2 0-7.6 2.6-10 6l4 4c3.4-2.4 6-6.8 6-10z"/>
             <path d="M9.6 10.4c-2.1 0-4.6 1.5-4.6 4.5 0 1.5-1 2.5-2.5 3 1.5 1 3.5 1.5 5 1 2.5-.8 4-3 3.5-5.5"/>`,
    paleta: `<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.1-.9 2.1-2 0-1.2-1-1.6-1-2.6 0-.9.7-1.4 1.8-1.4h2.1a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/>
             <circle cx="7.4" cy="10.6" r="1.05"/>
             <circle cx="10.8" cy="7.4" r="1.05"/>
             <circle cx="15" cy="7.4" r="1.05"/>`,
    olho: `<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/>
           <circle cx="12" cy="12" r="2.9"/>`,
    "olho-fechado": `<path d="M4 4.5 20 19.5"/>
           <path d="M9.9 6.2A9.4 9.4 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-2.8 3.4"/>
           <path d="M6.6 7.9A16.6 16.6 0 0 0 2.5 12S6 18.2 12 18.2c1 0 1.9-.2 2.8-.5"/>
           <path d="M10.2 10.4a2.9 2.9 0 0 0 4 4"/>`,
    seta: `<path d="M4.5 12h15M13.5 6l6 6-6 6"/>`,
    "seta-voltar": `<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>`,
    pausa: `<rect x="6.5" y="4.5" width="3.6" height="15" rx="1.2"/>
            <rect x="13.9" y="4.5" width="3.6" height="15" rx="1.2"/>`,
    continuar: `<path d="M7 4.8v14.4"/><path d="M8.4 12 18.6 5.6v12.8z" fill="currentColor" stroke="none"/>`,
};

const icone = (nome, classe = "") =>
    `<svg class="icone ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" focusable="false">${ICONES[nome] ?? ""}</svg>`;

/* ------------------------------ Utilidades ------------------------------ */
const $ = (seletor, base = document) => base.querySelector(seletor);

const escapar = (texto) => String(texto ?? "")
    .replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[caractere]));

const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor ?? 0);

const formatarData = (iso) => {
    if (!iso) return "—";
    const soData = String(iso).slice(0, 10);
    const data = new Date(`${soData}T00:00:00`);
    return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
};

const dataHojeISO = () => new Date().toISOString().slice(0, 10);

const dataBonita = () => {
    const texto = new Date().toLocaleDateString("pt-BR",
        { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const iniciais = (nome) => String(nome || "?").trim()
    .split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();

/* Primeiro nome da pessoa logada, para cumprimentos descontraídos */
const primeiroNome = () => {
    const partes = String(State.usuario?.nome ?? "").trim().split(/\s+/);
    return partes[0] || "chefe";
};

/* Mascote do tema ativo (usado na sidebar, painel e estados vazios):
   cada profissão mostra o seu personagem — nada de engenheiro na psicologia. */
function mascoteAtual() {
    const u = UNIVERSOS.find((x) => x.id === temaAtivo());
    if (!u) return `<img src="/static/mascote.png" width="520" height="485" alt="">`;
    return `<img src="${u.mascote}" width="${u.largura}" height="${u.altura}" alt="">`;
}

const msgErro = (excecao) => (excecao instanceof Error ? excecao.message : String(excecao));

/* ----------------------- Cliente HTTP (Fetch API) ----------------------- */
/* No GitHub Pages (docs/) não existe back-end: quando o fetch falha ou o
   GitHub responde 404 em HTML para /api/..., a chamada cai no MODO
   DEMONSTRAÇÃO (demo-api.js), que replica a API Flask no navegador. Com o
   Flask rodando, a API REAL responde primeiro e o demo não é acionado. */
let _avisouDemo = false;

function avisarDemo() {
    if (_avisouDemo) return;
    _avisouDemo = true;
    aviso("Modo demonstração: os dados ficam salvos apenas neste navegador (sem servidor Flask).", "info", 7000);
}

async function pedirAoDemo(metodo, caminho, corpo) {
    DEMO_API.definirToken(State.token);
    const resultado = DEMO_API.requisicao(metodo, caminho, corpo);
    avisarDemo();
    if (resultado.status === 204) return null;
    if (resultado.status >= 400) {
        const detalhes = resultado.corpo?.detalhes?.length ? ` (${resultado.corpo.detalhes.join(" • ")})` : "";
        throw new Error((resultado.corpo?.erro || `Falha na requisição (HTTP ${resultado.status}).`) + detalhes);
    }
    return resultado.corpo;
}

async function api(caminho, { metodo = "GET", corpo } = {}) {
    const opcoes = { method: metodo, headers: {} };

    if (State.token) opcoes.headers.Authorization = `Bearer ${State.token}`;
    if (corpo !== undefined) {
        opcoes.headers["Content-Type"] = "application/json";
        opcoes.body = JSON.stringify(corpo);
    }

    let resposta;
    try {
        resposta = await fetch(`${API_BASE}${caminho}`, opcoes);
    } catch (erroRede) {
        // Sem servidor no endereço (GitHub Pages, file://...): modo demonstração.
        return pedirAoDemo(metodo, caminho, corpo);
    }

    const texto = await resposta.text();
    let dados = null;
    if (texto) {
        try { dados = JSON.parse(texto); } catch { dados = null; }
    }

    if (!resposta.ok) {
        if (dados === null) {
            // Corpo não-JSON: quem respondeu não foi a API (GitHub Pages/servidor
            // de arquivos devolvem 404/501 em HTML) — cai no modo demonstração.
            return pedirAoDemo(metodo, caminho, corpo);
        }
        if (resposta.status === 401 && State.token) sair(true);
        const detalhes = dados?.detalhes?.length ? ` (${dados.detalhes.join(" • ")})` : "";
        throw new Error((dados?.erro || `Falha na requisição (HTTP ${resposta.status}).`) + detalhes);
    }
    return dados;
}

/* ------------------------------- Sessão --------------------------------- */
function guardarSessao(dados) {
    State.token = dados.token;
    State.usuario = dados.usuario;
    localStorage.setItem(CHAVE_TOKEN, dados.token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(dados.usuario));
    State.cache = {}; // sessão nova: cache do usuário anterior não vale mais
}

function sair(expirada = false) {
    State.token = null;
    State.usuario = null;
    State.cache = {};
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
    if (expirada) aviso("Sua sessão expirou. Entre novamente.", "erro");
    irPara("#/inicio");
}

function irPara(hash) {
    if (location.hash === hash) rotear(); // mesmo hash: o 'hashchange' não dispara
    else location.hash = hash;
}

/* ------------------------------ Avisos (toasts) ------------------------- */
function aviso(mensagem, tipo = "sucesso", tempo = 4500) {
    const area = $("#avisos");
    const avisoEl = document.createElement("div");
    avisoEl.className = `aviso ${tipo}`;
    avisoEl.setAttribute("role", "status");
    avisoEl.innerHTML = `
        <span class="aviso-icone">${icone(tipo === "erro" ? "alerta" : tipo === "info" ? "info" : "sucesso")}</span>
        <span>${escapar(mensagem)}</span>
        <button type="button" aria-label="Fechar aviso">${icone("fechar")}</button>`;

    const remover = () => {
        avisoEl.classList.add("saindo");
        setTimeout(() => avisoEl.remove(), 300);
    };
    avisoEl.querySelector("button").addEventListener("click", remover);
    area.appendChild(avisoEl);
    setTimeout(remover, tempo);
}

/* --------------------- Estados de botão (carregando) -------------------- */
function ocuparBotao(botao, ocupado = true) {
    if (!botao) return;
    if (ocupado) {
        botao.dataset.texto = botao.innerHTML;
        botao.classList.add("ocupado");
        botao.disabled = true;
    } else {
        botao.innerHTML = botao.dataset.texto ?? botao.innerHTML;
        botao.classList.remove("ocupado");
        botao.disabled = false;
    }
}

/* --------------------------- Modais (<dialog>) -------------------------- */
function abrirModalFormulario({ titulo, subtitulo = "", corpoHTML, aoEnviar, textoBotao = "Salvar" }) {
    const modal = $("#modal");
    modal.innerHTML = `
        <button type="button" class="botao-icone modal-fechar" aria-label="Fechar">${icone("fechar")}</button>
        <form id="form-modal" class="modal-conteudo">
            <div>
                <h2 class="modal-titulo">${escapar(titulo)}</h2>
                ${subtitulo ? `<p class="modal-sub">${escapar(subtitulo)}</p>` : ""}
            </div>
            ${corpoHTML}
            <menu class="modal-acoes">
                <button type="button" class="botao" data-fechar>Cancelar</button>
                <button type="submit" class="botao botao-primario" data-salvar>${escapar(textoBotao)}</button>
            </menu>
        </form>`;

    modal.querySelector(".modal-fechar").addEventListener("click", () => modal.close());
    modal.querySelector("[data-fechar]").addEventListener("click", () => modal.close());
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) modal.close(); // clique fora fecha o modal
    }, { once: true });

    const form = $("#form-modal", modal);
    form.addEventListener("submit", async (evento) => {
        evento.preventDefault(); // validação nativa já bloqueou campos inválidos
        const botao = form.querySelector("[data-salvar]");
        try {
            await aoEnviar(Object.fromEntries(new FormData(form)), form);
        } catch (excecao) {
            aviso(msgErro(excecao), "erro");
            ocuparBotao(botao, false);
        }
    });

    modal.showModal();
    const primeiro = form.querySelector("input, select, textarea");
    if (primeiro) primeiro.focus();
}

function confirmarExclusao(mensagem) {
    return new Promise((resolve) => {
        const modal = $("#confirmacao");
        const sim = $("#confirmar-sim");
        const nao = $("#confirmar-nao");
        $("#confirmar-texto").textContent = mensagem;

        const encerrar = (valor) => {
            sim.removeEventListener("click", aoClicarSim);
            nao.removeEventListener("click", aoClicarNao);
            modal.removeEventListener("click", aoClicarFora);
            modal.close();
            resolve(valor);
        };
        const aoClicarSim = () => encerrar(true);
        const aoClicarNao = () => encerrar(false);
        const aoClicarFora = (evento) => { if (evento.target === modal) encerrar(false); };

        sim.addEventListener("click", aoClicarSim);
        nao.addEventListener("click", aoClicarNao);
        modal.addEventListener("click", aoClicarFora);
        modal.showModal();
    });
}

/* --------------------- Construtores de campos (HTML) -------------------- */
function campoTexto(nome, rotulo, valor = "", { tipo = "text", obrigatorio = false,
    placeholder = "", passo = null, minimo = null, lista = null } = {}) {
    return `
        <div class="campo">
            <label for="f-${nome}">${escapar(rotulo)}${obrigatorio ? " *" : ""}</label>
            <input id="f-${nome}" name="${nome}" type="${tipo}" value="${escapar(valor)}"
                ${obrigatorio ? "required" : ""}
                ${tipo === "number" && passo !== null ? `step="${passo}"` : ""}
                ${tipo === "number" && minimo !== null ? `min="${minimo}"` : ""}
                ${lista ? `list="${lista}"` : ""}
                ${tipo === "email" ? 'autocomplete="email"' : ""}
                placeholder="${escapar(placeholder)}">
            <small class="campo-erro"></small>
        </div>`;
}

function campoData(nome, rotulo, valor = "", obrigatorio = false) {
    return `
        <div class="campo">
            <label for="f-${nome}">${escapar(rotulo)}${obrigatorio ? " *" : ""}</label>
            <input id="f-${nome}" name="${nome}" type="date" value="${escapar(valor ?? "")}"
                ${obrigatorio ? "required" : ""}>
        </div>`;
}

function campoTextoLongo(nome, rotulo, valor = "", obrigatorio = false) {
    return `
        <div class="campo">
            <label for="f-${nome}">${escapar(rotulo)}${obrigatorio ? " *" : ""}</label>
            <textarea id="f-${nome}" name="${nome}" ${obrigatorio ? "required" : ""}
                placeholder="Descreva aqui...">${escapar(valor ?? "")}</textarea>
        </div>`;
}

function campoSelecao(nome, rotulo, opcoesHTML, obrigatorio = false) {
    return `
        <div class="campo">
            <label for="f-${nome}">${escapar(rotulo)}${obrigatorio ? " *" : ""}</label>
            <select id="f-${nome}" name="${nome}" ${obrigatorio ? "required" : ""}>
                ${opcoesHTML}
            </select>
        </div>`;
}

function opcoesEntidades(registros, valorSelecionado, textoVazio) {
    return [`<option value="">${escapar(textoVazio)}</option>`]
        .concat(registros.map((registro) => `
            <option value="${registro.id}" ${registro.id === Number(valorSelecionado) ? "selected" : ""}>
                ${escapar(registro.nome)}
            </option>`))
        .join("");
}

/* Dados do formulário: strings vazias de campos opcionais viram null para a API */
function normalizar(valores) {
    const dados = {};
    for (const [chave, valor] of Object.entries(valores)) {
        if (typeof valor === "string") {
            const aparado = valor.trim();
            dados[chave] = aparado === "" ? null : aparado;
        } else {
            dados[chave] = valor;
        }
    }
    return dados;
}

/* =============================== AUTENTICAÇÃO ============================ */
function formasFundo() {
    return `
        <div class="formas" aria-hidden="true">
            <svg class="forma-1" data-parallax="0.04" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="currentColor"/></svg>
            <svg class="forma-2" data-parallax="0.06" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="28" fill="currentColor"/></svg>
            <svg class="forma-3" data-parallax="0.09" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="9"/></svg>
            <svg class="forma-4" data-parallax="0.05" viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="20" fill="currentColor"/></svg>
        </div>`;
}

/* ================== TELAS DE AUTENTICAÇÃO (casca de vidro) =================
   Estrutura única reaproveitada por login e cadastro: cartão glassmorphism
   com formulário à esquerda e mascote do universo ativo à direita, sobre um
   cenário com bolhas, partículas e o mascote desfocado ao fundo. */
const ICONES_DO_UNIVERSO = {
    arquitetura: ["capacete", "compasso"],
    medicina: ["estetoscopio", "cruz"],
    direito: ["balanca", "martelo"],
    informatica: ["chip", "codigo"],
    psicologia: ["conversa", "coracao"],
    farmacia: ["matraz", "pastilha"],
    professor: ["livro", "lapis"],
    artes: ["pincel", "paleta"],
};

const universoDoTema = () => UNIVERSOS.find((x) => x.id === temaAtivo()) ?? null;

function conteudoDoPalco(u) {
    const flutuantes = (ICONES_DO_UNIVERSO[u.id] ?? []).map((nome, i) =>
        `<span class="login-flutuante f${i + 1}">${icone(nome)}</span>`).join("");
    return `
        <span class="login-brilho" aria-hidden="true"></span>
        <figure class="login-mascote">${figuroUniverso(u)}</figure>
        <div class="login-flutuantes" aria-hidden="true">${flutuantes}</div>
        <span class="login-selo">Universo ${escapar(u.nome)}</span>`;
}

function telaAutenticacao({ conteudo }) {
    /* Universo ativo ou, na ausência de escolha, o mascote neutro M-TRON:
       o palco (e o mascote grande) existem no login/cadastro em qualquer estado. */
    const u = universoDoTema() ?? {
        id: "mtron", nome: "M-TRON",
        mascote: "/static/mascote.png", largura: 520, altura: 520,
    };
    const palco = `
        <aside class="login-palco" id="login-palco">${conteudoDoPalco(u)}</aside>`;
    const fantasma = `<img class="login-fantasma" src="${u.mascote}" alt="">`;
    return `
        <div class="login-pagina">
            <div class="login-cenario" aria-hidden="true">
                ${fantasma}
                <span class="login-bolha b1"></span>
                <span class="login-bolha b2"></span>
                <span class="login-bolha b3"></span>
                <span class="login-anel"></span>
                <span class="login-particulas"></span>
            </div>
            ${formasFundo()}
            <main class="login-cartao">
                <section class="login-forma">${conteudo}</section>
                ${palco}
            </main>
        </div>`;
}

/* Campo de senha com botão de mostrar/ocultar (olho) */
function campoSenhaComOlho(nome = "senha", rotulo = "Senha") {
    return `
        <div class="campo">
            <label for="f-${nome}">${escapar(rotulo)} *</label>
            <div class="campo-senha">
                <input id="f-${nome}" name="${nome}" type="password" required
                    autocomplete="current-password" placeholder="Sua senha">
                <button type="button" class="olho-senha" aria-label="Mostrar senha" aria-pressed="false"
                    data-alvo="f-${nome}">${icone("olho")}</button>
            </div>
            <small class="campo-erro"></small>
        </div>`;
}

function ligarOlhoSenha() {
    const botao = $(".olho-senha");
    if (!botao) return;
    botao.addEventListener("click", () => {
        const entrada = document.getElementById(botao.dataset.alvo);
        const mostrando = entrada.type === "text";
        entrada.type = mostrando ? "password" : "text";
        botao.innerHTML = icone(mostrando ? "olho" : "olho-fechado");
        botao.setAttribute("aria-pressed", String(!mostrando));
        botao.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
        entrada.focus({ preventScroll: true });
    });
}

function preencherDemo() {
    const email = $("#f-email");
    const senha = $("#f-senha");
    if (!email || !senha) return;
    email.value = "maria@exemplo.com";
    senha.value = "123456";
    senha.focus({ preventScroll: true });
    aviso("Dados de demonstração preenchidos.", "info");
}

/* "Esqueceu sua senha?": modal honesto (o backend de recuperação não existe
   na demo) que oferece a conta de demonstração em vez de um botão morto. */
function modalEsqueciSenha() {
    const modal = document.createElement("dialog");
    modal.className = "modal";
    modal.innerHTML = `
        <button type="button" class="botao-icone modal-fechar" aria-label="Fechar">${icone("fechar")}</button>
        <div class="modal-conteudo">
            <h2 class="modal-titulo">Recuperar acesso</h2>
            <p class="confirmar-texto">Nesta demonstração a recuperação por e-mail ainda não está conectada.
                Você pode explorar a plataforma inteira com a conta de demonstração.</p>
            <menu class="modal-acoes">
                <button type="button" class="botao" data-fechar>Fechar</button>
                <button type="button" class="botao botao-primario" data-demo>Usar conta demo</button>
            </menu>
        </div>`;
    /* O dialog precisa estar no documento para showModal() funcionar */
    document.body.appendChild(modal);
    const fechar = () => modal.remove(); // sai do DOM: nada se acumula
    modal.querySelector(".modal-fechar").addEventListener("click", fechar);
    modal.querySelector("[data-fechar]").addEventListener("click", fechar);
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) fechar();
    }, { once: true });
    modal.querySelector("[data-demo]").addEventListener("click", () => {
        preencherDemo();
        fechar();
    });
    modal.showModal();
}

/* Seletor compacto de universos: troca a identidade visual na hora,
   sem perder o que a pessoa já digitou no formulário. */
function miniBotaoUniverso(u) {
    const ativo = u.id === temaAtivo();
    return `
        <button type="button" class="mini-uni ${ativo ? "ativo" : ""}" data-universo="${u.id}"
            title="Universo ${escapar(u.nome)}" aria-label="Identidade visual ${escapar(u.nome)}"
            aria-pressed="${ativo}">
            <img src="/static/mascotes/mini/${u.id}.png" alt="" width="44" height="44" loading="lazy">
        </button>`;
}

function seletorUniversosHTML() {
    return `
        <div class="login-universos">
            <p class="login-universos-rotulo">Seu universo profissional</p>
            <div class="login-universos-linha" id="seletor-universos" role="group"
                aria-label="Escolher a identidade visual da plataforma">
                ${UNIVERSOS.map(miniBotaoUniverso).join("")}
            </div>
        </div>`;
}

function trocarUniversoNoLogin(id) {
    aplicarTema(id);
    const palco = $("#login-palco");
    if (palco) {
        palco.classList.add("trocando");
        setTimeout(() => {
            const u = universoDoTema();
            if (u) palco.innerHTML = conteudoDoPalco(u);
            palco.classList.remove("trocando");
        }, 170);
    }
    document.querySelectorAll("#seletor-universos .mini-uni").forEach((botao) => {
        const ativo = botao.dataset.universo === temaAtivo();
        botao.classList.toggle("ativo", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
    });
}

function viewLogin() {
    document.title = "M-TRON — Entrar";
    const conteudo = `
        <a class="login-marca" href="#/inicio" aria-label="M-TRON — página inicial">
            ${logotipoSVG()}
            <span class="login-marca-texto">
                <span class="marca-nome">M-TRON</span>
                <span class="marca-slogan">MorphPeetron</span>
            </span>
        </a>
        <div class="login-cabecalho">
            <h1 class="titulo-login">Bem-vindo de volta!</h1>
            <p class="login-sub">Entre na sua conta e continue sua jornada profissional.</p>
        </div>
        <form id="form-login" class="login-form">
            <div class="campo">
                <label for="f-email">E-mail *</label>
                <input id="f-email" name="email" type="email" required autocomplete="email"
                    placeholder="voce@exemplo.com">
                <small class="campo-erro"></small>
            </div>
            ${campoSenhaComOlho()}
            <div class="login-linha">
                <button type="button" class="link-suave" id="esqueci-senha">Esqueceu sua senha?</button>
            </div>
            <button type="submit" class="botao botao-primario botao-login">${icone("seta")}Entrar</button>
        </form>
        <p class="login-demo">Conta de demonstração:
            <button type="button" id="preencher-demo" class="login-demo-chip">maria@exemplo.com · 123456</button>
        </p>
        <p class="login-troca">Ainda não tem uma conta? <a href="#/cadastro">Cadastre-se</a></p>
        ${seletorUniversosHTML()}`;

    $("#app").innerHTML = telaAutenticacao({ conteudo });

    $("#form-login").addEventListener("submit", aoEntrar);
    ligarOlhoSenha();
    $("#esqueci-senha").addEventListener("click", modalEsqueciSenha);
    $("#preencher-demo").addEventListener("click", preencherDemo);
    $("#seletor-universos").addEventListener("click", (evento) => {
        const botao = evento.target.closest(".mini-uni");
        if (botao) trocarUniversoNoLogin(botao.dataset.universo);
    });
}

async function aoEntrar(evento) {
    evento.preventDefault();
    const form = evento.target;
    const botao = form.querySelector("button[type=submit]");
    ocuparBotao(botao, true);
    try {
        const valores = Object.fromEntries(new FormData(form));
        const dados = await api("/login", { metodo: "POST", corpo: normalizar(valores) });
        guardarSessao(dados);

        /* Identidade visual vinculada ao perfil: se a pessoa ainda não escolheu
           um universo, o tema vem da profissão cadastrada (Engenheiro ->
           arquitetura, Técnico -> informática, Administrador -> direito).
           Se já escolheu um universo, a escolha dela prevalece e atravessa o login. */
        if (!temaSalvo()) {
            const temaDoPerfil = TEMA_POR_PROFISSAO[dados.usuario.profissao];
            if (temaDoPerfil) aplicarTema(temaDoPerfil);
        }

        aviso(`Bem-vindo(a), ${dados.usuario.nome.split(" ")[0]}!`);
        irPara("#/painel");
        /* Pré-aquece o cache em segundo plano: as próximas telas abrem na hora */
        apiCache("engenheiros", "/engenheiros").catch(() => {});
        apiCache("clientes", "/clientes").catch(() => {});
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
        ocuparBotao(botao, false);
        const cartao = $(".login-cartao");
        if (cartao) {
            cartao.classList.remove("erro");
            void cartao.offsetWidth; // reinicia a animação de tremor
            cartao.classList.add("erro");
        }
    }
}

/* Cadastro em 2 etapas (dados -> escolha da profissão, como no FIGMA) */
const Cadastro = { etapa: 1, dados: null };

const ICONES_PROFISSAO = {
    Engenheiro: "capacete",
    Arquiteto: "compasso",
    Técnico: "prancheta",
    Administrador: "mala",
};
const DESCRICOES_PROFISSAO = {
    Engenheiro: "Responsável técnico pelas obras",
    Arquiteto: "Projetos e detalhamento",
    Técnico: "Apoio técnico de campo",
    Administrador: "Gestão geral do sistema",
};

function viewCadastro() {
    if (Cadastro.etapa === 2) {
        viewCadastroProfissao();
        return;
    }
    document.title = "M-TRON — Criar conta";
    const conteudo = `
        <a class="login-marca" href="#/inicio" aria-label="M-TRON — página inicial">
            ${logotipoSVG()}
            <span class="login-marca-texto">
                <span class="marca-nome">M-TRON</span>
                <span class="marca-slogan">MorphPeetron</span>
            </span>
        </a>
        <div class="login-cabecalho">
            <span class="passo-chip">Passo 1 de 2</span>
            <h1 class="titulo-login">Criar sua conta</h1>
            <p class="login-sub">Primeiro, seus dados de acesso. Depois você escolhe o seu universo.</p>
        </div>
        <form id="form-cadastro" class="login-form">
            ${campoTexto("nome", "Nome completo", Cadastro.dados?.nome ?? "", { obrigatorio: true, placeholder: "Maria Souza" })}
            ${campoTexto("email", "E-mail", Cadastro.dados?.email ?? "", { tipo: "email", obrigatorio: true, placeholder: "voce@exemplo.com" })}
            ${campoTexto("senha", "Senha (mínimo 6 caracteres)", Cadastro.dados?.senha ?? "", { tipo: "password", obrigatorio: true, placeholder: "••••••" })}
            <button type="submit" class="botao botao-primario botao-login">${icone("seta")}Continuar</button>
        </form>
        <p class="login-troca">Já tem conta? <a href="#/login">Entrar</a></p>`;

    $("#app").innerHTML = telaAutenticacao({ conteudo });

    $("#form-cadastro").addEventListener("submit", (evento) => {
        evento.preventDefault();
        Cadastro.dados = normalizar(Object.fromEntries(new FormData(evento.target)));
        if ((Cadastro.dados.senha ?? "").length < 6) {
            aviso("A senha deve ter pelo menos 6 caracteres.", "erro");
            return;
        }
        Cadastro.etapa = 2;
        viewCadastroProfissao();
    });
}

async function viewCadastroProfissao() {
    document.title = "M-TRON — Escolha sua profissão";
    const conteudo = `
        <a class="login-marca" href="#/inicio" aria-label="M-TRON — página inicial">
            ${logotipoSVG()}
            <span class="login-marca-texto">
                <span class="marca-nome">M-TRON</span>
                <span class="marca-slogan">MorphPeetron</span>
            </span>
        </a>
        <div class="login-cabecalho">
            <span class="passo-chip">Passo 2 de 2</span>
            <h1 class="titulo-login">Escolha sua profissão</h1>
            <p class="login-sub">Isso personaliza o sistema para o seu papel.</p>
        </div>
        <p class="mascote-fala">${icone("capacete")}Oi! Aqui é o M-TRON. Qual é o seu papel no trabalho?</p>
        <div id="profissoes" class="profissoes-grid">
            <div class="carregando"><span class="giro"></span>Carregando opções…</div>
        </div>
        <p class="login-troca"><a href="#" id="voltar-dados">${icone("seta-voltar")}Voltar para os dados</a></p>`;

    $("#app").innerHTML = telaAutenticacao({ conteudo });

    $("#voltar-dados").addEventListener("click", (evento) => {
        evento.preventDefault();
        Cadastro.etapa = 1;
        viewCadastro();
    });

    try {
        const resposta = await apiCache("profissoes", "/profissoes", VALIDADE_PROFISSOES);
        const profissoes = resposta.profissoes ?? resposta; // aceita {profissoes:[...]} ou [...]
        $("#profissoes").innerHTML = profissoes.map((profissao) => `
            <button type="button" class="profissao-cartao" data-profissao="${escapar(profissao)}">
                <span class="profissao-icone">${icone(ICONES_PROFISSAO[profissao] ?? "mala")}</span>
                <span>${escapar(profissao)}<small>${escapar(DESCRICOES_PROFISSAO[profissao] ?? "Acesso ao sistema")}</small></span>
            </button>`).join("");

        $("#profissoes").addEventListener("click", aoEscolherProfissao);
    } catch (excecao) {
        $("#profissoes").innerHTML = `<p class="campo-erro">${escapar(msgErro(excecao))}</p>`;
    }
}

async function aoEscolherProfissao(evento) {
    const cartao = evento.target.closest(".profissao-cartao");
    if (!cartao) return;

    const profissao = cartao.dataset.profissao;
    try {
        await api("/cadastro", { metodo: "POST", corpo: { ...Cadastro.dados, profissao } });
        const dados = await api("/login", { metodo: "POST", corpo: Cadastro.dados });
        guardarSessao(dados);
        /* Primeira sessão: a identidade visual acompanha a profissão escolhida */
        if (!temaSalvo()) {
            const temaDoPerfil = TEMA_POR_PROFISSAO[profissao];
            if (temaDoPerfil) aplicarTema(temaDoPerfil);
        }
        Cadastro.etapa = 1;
        Cadastro.dados = null;
        aviso("Conta criada com sucesso!");
        irPara("#/painel");
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
        Cadastro.etapa = 1; // volta para corrigir (ex.: e-mail já cadastrado)
        viewCadastro();
    }
}

/* =================== MODO PROFISSÃO (Super App adaptável) =================
   A MorphPeetron é um camaleão: as MESMAS rotas, módulos e tabelas mudam de
   nome, de rótulo e de jeito de falar conforme o universo (profissão) ativo.
   A adaptação é 100% de interface — a API e a estrutura continuam as mesmas. */
const GERENCIAMENTO_BASE = [
    { hash: "#/obras", icone: "obras", desc: "Cadastre, edite e acompanhe cada registro" },
    { hash: "#/engenheiros", icone: "engenheiros", desc: "Equipe, acessos e desempenho" },
    { hash: "#/clientes", icone: "clientes", desc: "Contatos, documentos e histórico" },
    { hash: "#/equipamentos", icone: "equipamentos", desc: "Inventário, status e responsáveis" },
    { hash: "#/orcamentos", icone: "orcamentos", desc: "Valores, status e aprovações" },
];

const MODO_PROFISSAO = {
    mtron: {
        nome: "M-TRON",
        painelIntro: "Um painel de gestão completo, pronto para qualquer área.",
        t: { obras: "Obras", obra: "obra", obraDe: "da obra", engenheiros: "Engenheiros", engenheiroDe: "do engenheiro", clientes: "Clientes", cliente: "cliente", equipamentos: "Equipamentos", orcamentos: "Orçamentos", orcamentoDe: "do orçamento" },
        colunas: { obras: ["Obra", "Engenheiro", "Cliente", "Início", "Conclusão"], recentes: "Obras mais recentes", finA: "Material", finB: "Mão de obra" },
        kpi: { ativos: "Obras ativas", ativosExtra: "de # no total", concluidas: "Obras concluídas", concluidasExtra: "entregues ao cliente", equipe: "Engenheiros", equipeExtra: "no quadro técnico", pessoas: "Clientes", pessoasExtra: "empresas e pessoas", insumos: "Equipamentos", insumosExtra: "em manutenção de #", destaque: "Orçamentos aprovados", destaqueExtra: "de # orçados" },
        acao: { novo: "Nova obra", adicionar: "Adicionar engenheiro", novoCliente: "Novo cliente", novoEquipamento: "Novo equipamento", novoOrcamento: "Novo orçamento" },
        modulos: [
            { icone: "obras", nome: "Obras e etapas", desc: "Cronograma, status e histórico de cada registro.", tipo: "rota", hash: "#/obras" },
            { icone: "clientes", nome: "Clientes", desc: "Cadastro, documentos e histórico de contato.", tipo: "rota", hash: "#/clientes" },
            { icone: "orcamentos", nome: "Financeiro", desc: "Orçamentos, custos e aprovações.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "alternar", nome: "Agenda e calendário", desc: "Compromissos e prazos da equipe.", tipo: "breve" },
            { icone: "caixa", nome: "Marketplace", desc: "Materiais, serviços e fornecedores.", tipo: "breve" },
            { icone: "buscar", nome: "Mural de oportunidades", desc: "Vagas e projetos da sua área.", tipo: "breve" },
        ],
    },
    arquitetura: {
        nome: "Arquitetura",
        painelIntro: "Projetos, obras, materiais e equipe — do primeiro traço à entrega das chaves.",
        t: { obras: "Projetos", obra: "projeto", obraDe: "do projeto", engenheiros: "Equipe", engenheiroDe: "do profissional", clientes: "Clientes", cliente: "cliente", equipamentos: "Materiais", orcamentos: "Orçamentos", orcamentoDe: "do orçamento" },
        colunas: { obras: ["Projeto", "Responsável", "Cliente", "Início", "Entrega"], recentes: "Projetos mais recentes", finA: "Materiais", finB: "Mão de obra" },
        kpi: { ativos: "Projetos em andamento", ativosExtra: "de # no total", concluidas: "Projetos entregues", concluidasExtra: "chave entregue ao cliente", equipe: "Profissionais da equipe", equipeExtra: "do escritório ao canteiro", pessoas: "Clientes", pessoasExtra: "empresas e pessoas", insumos: "Materiais", insumosExtra: "em reposição de #", destaque: "Orçamentos aprovados", destaqueExtra: "de # orçados" },
        acao: { novo: "Novo projeto", adicionar: "Adicionar profissional", novoCliente: "Novo cliente", novoEquipamento: "Novo material", novoOrcamento: "Novo orçamento" },
        modulos: [
            { icone: "obras", nome: "Gestão de projetos", desc: "Plantas, referências, alterações e etapas de desenvolvimento.", tipo: "rota", hash: "#/obras" },
            { icone: "engenheiros", nome: "Rede de profissionais", desc: "Engenheiros, designers e equipes para tocar os projetos.", tipo: "rota", hash: "#/engenheiros" },
            { icone: "equipamentos", nome: "Marketplace de materiais", desc: "Cimento, revestimentos, tintas e fornecedores próximos.", tipo: "rota", hash: "#/equipamentos" },
            { icone: "orcamentos", nome: "Financeiro e orçamentos", desc: "Custos, pagamentos e acompanhamento de cada obra.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "clientes", nome: "Mural de projetos", desc: "Solicitações de clientes para você apresentar propostas.", tipo: "breve" },
            { icone: "compasso", nome: "Acompanhamento de obras", desc: "Cronogramas, visitas técnicas e etapas de execução.", tipo: "breve" },
        ],
    },
    medicina: {
        nome: "Medicina",
        painelIntro: "Pacientes, atendimentos, prontuários e insumos — a clínica inteira em um só lugar.",
        t: { obras: "Atendimentos", obra: "atendimento", obraDe: "do atendimento", engenheiros: "Especialistas", engenheiroDe: "do especialista", clientes: "Pacientes", cliente: "paciente", equipamentos: "Insumos e exames", orcamentos: "Faturas", orcamentoDe: "da fatura" },
        colunas: { obras: ["Atendimento", "Responsável", "Paciente", "Início", "Retorno"], recentes: "Atendimentos recentes", finA: "Insumos", finB: "Serviços" },
        kpi: { ativos: "Atendimentos ativos", ativosExtra: "de # no total", concluidas: "Atendimentos concluídos", concluidasExtra: "pacientes liberados", equipe: "Especialistas", equipeExtra: "no corpo clínico", pessoas: "Pacientes", pessoasExtra: "em acompanhamento", insumos: "Insumos e exames", insumosExtra: "em reposição de #", destaque: "Faturas aprovadas", destaqueExtra: "de # emitidas" },
        acao: { novo: "Novo atendimento", adicionar: "Adicionar especialista", novoCliente: "Novo paciente", novoEquipamento: "Novo insumo", novoOrcamento: "Nova fatura" },
        modulos: [
            { icone: "estetoscopio", nome: "Prontuário eletrônico", desc: "Consultas, diagnósticos, prescrições e histórico clínico.", tipo: "restrito", nota: "Acesso restrito · LGPD e sigilo médico" },
            { icone: "cruz", nome: "Histórico de saúde integrado", desc: "Informações clínicas compartilhadas com consentimento.", tipo: "restrito", nota: "Acesso restrito · LGPD e consentimento" },
            { icone: "equipamentos", nome: "Estoque médico inteligente", desc: "Medicamentos, materiais e insumos com alerta de reposição.", tipo: "rota", hash: "#/equipamentos" },
            { icone: "orcamentos", nome: "Gestão financeira", desc: "Faturas, custos e movimentações da clínica.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "alternar", nome: "Agenda e consultas", desc: "Horários, retornos e cancelamentos.", tipo: "breve" },
            { icone: "buscar", nome: "Rede de empregos na saúde", desc: "Vagas, plantões e especialidades.", tipo: "breve" },
        ],
    },
    direito: {
        nome: "Direito",
        painelIntro: "Processos, prazos, documentos e honorários — o escritório sem pilhas de papel.",
        t: { obras: "Processos", obra: "processo", obraDe: "do processo", engenheiros: "Equipe jurídica", engenheiroDe: "do advogado", clientes: "Clientes", cliente: "cliente", equipamentos: "Documentos", orcamentos: "Honorários", orcamentoDe: "dos honorários" },
        colunas: { obras: ["Processo", "Responsável", "Cliente", "Abertura", "Encerramento"], recentes: "Processos mais recentes", finA: "Custas", finB: "Honorários" },
        kpi: { ativos: "Processos em andamento", ativosExtra: "de # no total", concluidas: "Processos encerrados", concluidasExtra: "casos finalizados", equipe: "Equipe jurídica", equipeExtra: "associados e estagiários", pessoas: "Clientes", pessoasExtra: "empresas e pessoas", insumos: "Documentos", insumosExtra: "em revisão de #", destaque: "Honorários recebidos", destaqueExtra: "de # contratados" },
        acao: { novo: "Novo processo", adicionar: "Adicionar associado", novoCliente: "Novo cliente", novoEquipamento: "Novo documento", novoOrcamento: "Novo honorário" },
        modulos: [
            { icone: "balanca", nome: "Processos e clientes", desc: "Etapas, documentos e histórico de cada caso.", tipo: "rota", hash: "#/obras" },
            { icone: "equipamentos", nome: "Banco de documentos jurídicos", desc: "Contratos, petições, procurações e modelos.", tipo: "rota", hash: "#/equipamentos" },
            { icone: "engenheiros", nome: "Conexão entre profissionais", desc: "Parcerias e correspondentes jurídicos.", tipo: "rota", hash: "#/engenheiros" },
            { icone: "orcamentos", nome: "Financeiro do escritório", desc: "Honorários, despesas e cobranças.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "alternar", nome: "Prazos processuais", desc: "Audiências, prazos e notificações.", tipo: "breve" },
            { icone: "buscar", nome: "Mural de oportunidades", desc: "Vagas para associados, estagiários e correspondentes.", tipo: "breve" },
        ],
    },
    informatica: {
        nome: "Informática",
        painelIntro: "Chamados, clientes, equipamentos e contratos — o suporte inteiro sob controle.",
        t: { obras: "Chamados", obra: "chamado", obraDe: "do chamado", engenheiros: "Técnicos", engenheiroDe: "do técnico", clientes: "Clientes", cliente: "cliente", equipamentos: "Equipamentos", orcamentos: "Contratos", orcamentoDe: "do contrato" },
        colunas: { obras: ["Chamado", "Técnico", "Cliente", "Abertura", "Resolução"], recentes: "Chamados recentes", finA: "Componentes", finB: "Mão de obra" },
        kpi: { ativos: "Chamados abertos", ativosExtra: "de # no total", concluidas: "Chamados resolvidos", concluidasExtra: "problemas encerrados", equipe: "Técnicos", equipeExtra: "no time de suporte", pessoas: "Clientes", pessoasExtra: "com contrato ou avulsos", insumos: "Equipamentos", insumosExtra: "em manutenção de #", destaque: "Receita de contratos", destaqueExtra: "de # em propostas" },
        acao: { novo: "Novo chamado", adicionar: "Adicionar técnico", novoCliente: "Novo cliente", novoEquipamento: "Novo equipamento", novoOrcamento: "Novo contrato" },
        modulos: [
            { icone: "chip", nome: "Central de serviços técnicos", desc: "Chamados de computadores, redes e sistemas.", tipo: "rota", hash: "#/obras" },
            { icone: "equipamentos", nome: "Equipamentos e licenças", desc: "Máquinas, garantias, manutenções e renovações.", tipo: "rota", hash: "#/equipamentos" },
            { icone: "clientes", nome: "Clientes e contratos", desc: "Contratos de manutenção e histórico de atendimento.", tipo: "rota", hash: "#/clientes" },
            { icone: "codigo", nome: "Projetos de software", desc: "Tarefas, equipes, etapas e correções de bugs.", tipo: "breve" },
            { icone: "caixa", nome: "Marketplace de tecnologia", desc: "Componentes, periféricos e servidores.", tipo: "breve" },
            { icone: "buscar", nome: "Mural de projetos", desc: "Demandas de sites, apps e suporte.", tipo: "breve" },
        ],
    },
    psicologia: {
        nome: "Psicologia",
        painelIntro: "Pacientes, sessões e evoluções — a prática organizada com sigilo e leveza.",
        t: { obras: "Sessões", obra: "sessão", obraDe: "da sessão", engenheiros: "Profissionais", engenheiroDe: "do profissional", clientes: "Pacientes", cliente: "paciente", equipamentos: "Materiais", orcamentos: "Recibos", orcamentoDe: "do recibo" },
        colunas: { obras: ["Sessão", "Responsável", "Paciente", "Início", "Retorno"], recentes: "Sessões recentes", finA: "Materiais", finB: "Atendimento" },
        kpi: { ativos: "Sessões em andamento", ativosExtra: "de # no total", concluidas: "Sessões realizadas", concluidasExtra: "com evolução registrada", equipe: "Profissionais", equipeExtra: "na rede de atendimento", pessoas: "Pacientes", pessoasExtra: "em acompanhamento", insumos: "Materiais", insumosExtra: "em reposição de #", destaque: "Recibos emitidos", destaqueExtra: "de # lançados" },
        acao: { novo: "Nova sessão", adicionar: "Adicionar profissional", novoCliente: "Novo paciente", novoEquipamento: "Novo material", novoOrcamento: "Novo recibo" },
        modulos: [
            { icone: "conversa", nome: "Prontuário psicológico", desc: "Registros de atendimento e evolução terapêutica.", tipo: "restrito", nota: "Acesso restrito · sigilo profissional, CFP e LGPD" },
            { icone: "coracao", nome: "Acompanhamento terapêutico", desc: "Objetivos e evolução, sempre confidenciais.", tipo: "restrito", nota: "Acesso restrito · confidencialidade garantida" },
            { icone: "engenheiros", nome: "Rede de profissionais", desc: "Parcerias, supervisão e conexões com clínicas.", tipo: "rota", hash: "#/engenheiros" },
            { icone: "orcamentos", nome: "Financeiro do consultório", desc: "Recibos, despesas e pagamentos.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "alternar", nome: "Agenda de sessões", desc: "Sessões presenciais e online, retornos e cancelamentos.", tipo: "breve" },
            { icone: "buscar", nome: "Mural de oportunidades", desc: "Vagas em clínicas, escolas e empresas.", tipo: "breve" },
        ],
    },
    farmacia: {
        nome: "Farmácia",
        painelIntro: "Medicamentos, validades, dispensação e equipe — a farmácia em ordem.",
        t: { obras: "Dispensações", obra: "dispensação", obraDe: "da dispensação", engenheiros: "Equipe", engenheiroDe: "do colaborador", clientes: "Clientes", cliente: "cliente", equipamentos: "Medicamentos", orcamentos: "Compras", orcamentoDe: "da compra" },
        colunas: { obras: ["Dispensação", "Responsável", "Cliente", "Data", "Retirada"], recentes: "Dispensações recentes", finA: "Medicamentos", finB: "Serviços" },
        kpi: { ativos: "Dispensações em curso", ativosExtra: "de # no total", concluidas: "Dispensações concluídas", concluidasExtra: "retiradas confirmadas", equipe: "Equipe", equipeExtra: "farmacêuticos e auxiliares", pessoas: "Clientes", pessoasExtra: "em atendimento", insumos: "Medicamentos", insumosExtra: "em reposição de #", destaque: "Compras aprovadas", destaqueExtra: "de # realizadas" },
        acao: { novo: "Nova dispensação", adicionar: "Adicionar colaborador", novoCliente: "Novo cliente", novoEquipamento: "Novo medicamento", novoOrcamento: "Nova compra" },
        modulos: [
            { icone: "matraz", nome: "Controle de medicamentos", desc: "Estoque, lotes, validades e alertas de reposição.", tipo: "rota", hash: "#/equipamentos" },
            { icone: "pastilha", nome: "Receitas e dispensação", desc: "Prescrições, registros e acompanhamento.", tipo: "rota", hash: "#/obras" },
            { icone: "conversa", nome: "Histórico farmacêutico do paciente", desc: "Medicamentos, alergias e dispensações anteriores.", tipo: "restrito", nota: "Acesso restrito · consentimento e LGPD" },
            { icone: "orcamentos", nome: "Gestão financeira", desc: "Vendas, despesas e fornecedores.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "caixa", nome: "Fornecedores e reposição", desc: "Distribuidores e condições comerciais.", tipo: "breve" },
            { icone: "buscar", nome: "Mural de oportunidades", desc: "Vagas em farmácias, hospitais e laboratórios.", tipo: "breve" },
        ],
    },
    professor: {
        nome: "Professor",
        painelIntro: "Turmas, alunos, materiais e mensalidades — a sala de aula em ordem.",
        t: { obras: "Turmas", obra: "turma", obraDe: "da turma", engenheiros: "Alunos", engenheiroDe: "do aluno", clientes: "Escolas", cliente: "escola", equipamentos: "Materiais didáticos", orcamentos: "Mensalidades", orcamentoDe: "da mensalidade" },
        colunas: { obras: ["Turma", "Professor", "Escola", "Início", "Término"], recentes: "Turmas recentes", finA: "Materiais", finB: "Aulas" },
        kpi: { ativos: "Turmas ativas", ativosExtra: "de # no total", concluidas: "Turmas concluídas", concluidasExtra: "ciclos encerrados", equipe: "Alunos", equipeExtra: "matriculados", pessoas: "Escolas", pessoasExtra: "e instituições parceiras", insumos: "Materiais didáticos", insumosExtra: "em reposição de #", destaque: "Mensalidades recebidas", destaqueExtra: "de # lançadas" },
        acao: { novo: "Nova turma", adicionar: "Matricular aluno", novoCliente: "Nova escola", novoEquipamento: "Novo material", novoOrcamento: "Nova mensalidade" },
        modulos: [
            { icone: "livro", nome: "Turmas e alunos", desc: "Frequência, notas e desempenho individual.", tipo: "rota", hash: "#/obras" },
            { icone: "engenheiros", nome: "Alunos e matrículas", desc: "Cadastro, contato e acompanhamento.", tipo: "rota", hash: "#/engenheiros" },
            { icone: "equipamentos", nome: "Biblioteca de materiais", desc: "Atividades, provas, apostilas e exercícios.", tipo: "rota", hash: "#/equipamentos" },
            { icone: "orcamentos", nome: "Financeiro e mensalidades", desc: "Pagamentos e rendimentos das aulas.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "lapis", nome: "Planejamento de aulas", desc: "Calendário escolar e conteúdo por turma.", tipo: "breve" },
            { icone: "buscar", nome: "Mural educacional", desc: "Vagas, substituições e aulas particulares.", tipo: "breve" },
        ],
    },
    artes: {
        nome: "Artes",
        painelIntro: "Comissões, portfólio, clientes e materiais — a sua arte com gestão de verdade.",
        t: { obras: "Comissões", obra: "comissão", obraDe: "da comissão", engenheiros: "Colaboradores", engenheiroDe: "do colaborador", clientes: "Clientes", cliente: "cliente", equipamentos: "Materiais", orcamentos: "Orçamentos", orcamentoDe: "do orçamento" },
        colunas: { obras: ["Comissão", "Responsável", "Cliente", "Início", "Entrega"], recentes: "Comissões recentes", finA: "Materiais", finB: "Mão de obra" },
        kpi: { ativos: "Comissões em produção", ativosExtra: "de # no total", concluidas: "Comissões entregues", concluidasExtra: "obras finalistas", equipe: "Colaboradores", equipeExtra: "na rede criativa", pessoas: "Clientes", pessoasExtra: "empresas e pessoas", insumos: "Materiais", insumosExtra: "em reposição de #", destaque: "Orçamentos aprovados", destaqueExtra: "de # orçados" },
        acao: { novo: "Nova comissão", adicionar: "Adicionar colaborador", novoCliente: "Novo cliente", novoEquipamento: "Novo material", novoOrcamento: "Novo orçamento" },
        modulos: [
            { icone: "paleta", nome: "Gestão de comissões", desc: "Pedidos, prazos, alterações e pagamentos.", tipo: "rota", hash: "#/obras" },
            { icone: "equipamentos", nome: "Marketplace de materiais", desc: "Tintas, telas, pincéis e equipamentos.", tipo: "rota", hash: "#/equipamentos" },
            { icone: "clientes", nome: "Clientes e projetos", desc: "Histórico, alterações e preferências.", tipo: "rota", hash: "#/clientes" },
            { icone: "orcamentos", nome: "Financeiro", desc: "Orçamentos, custos e pagamentos.", tipo: "rota", hash: "#/orcamentos" },
            { icone: "pincel", nome: "Portfólio inteligente", desc: "Trabalhos organizados por estilo e especialidade.", tipo: "breve" },
            { icone: "buscar", nome: "Mural de oportunidades", desc: "Encomendas e solicitações criativas.", tipo: "breve" },
        ],
    },
};

/* O modo do momento: o vocabulário do universo ativo (ou o neutro M-TRON) */
const modo = () => MODO_PROFISSAO[temaAtivo()] ?? MODO_PROFISSAO.mtron;
const cap = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "");

/* ============================== ESTRUTURA DO APP ========================= */
function logotipoSVG(classe = "") {
    return `
        <svg class="${classe}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            ${GRADIENTE_MTRON}
            <path d="M10 52 V26 Q10 12 22 18 L32 38 L42 18 Q54 12 54 26 V52"
                  stroke="url(#g-mtron)" stroke-width="11" fill="none"
                  stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
}

function renderShell(conteudoHTML, titulo, subtitulo = "", mascoteTopo = false) {
    const atual = location.hash;
    const m = modo();
    /* O menu é o mesmo para todos, mas fala o idioma da profissão:
       em Medicina é "Atendimentos", em Arquitetura é "Projetos"... */
    const menuHTML = [
        { hash: "#/painel", icone: "painel", texto: "Painel" },
        { hash: "#/obras", icone: "obras", texto: m.t.obras },
        { hash: "#/engenheiros", icone: "engenheiros", texto: m.t.engenheiros },
        { hash: "#/clientes", icone: "clientes", texto: m.t.clientes },
        { hash: "#/equipamentos", icone: "equipamentos", texto: m.t.equipamentos },
        { hash: "#/orcamentos", icone: "orcamentos", texto: m.t.orcamentos },
    ].map((item) => `
        <a href="${item.hash}" class="menu-item ${atual === item.hash ? "ativo" : ""}">
            ${icone(item.icone)}${item.texto}
        </a>`).join("");

    /* Chip do universo ativo: mostra em qual "camaleão" a plataforma está */
    const u = universoDoTema();
    const chipUniverso = u ? `
        <span class="modo-chip" title="Universo ${escapar(u.nome)}">
            <img src="/static/mascotes/mini/${u.id}.png" alt="" width="22" height="22">
            ${escapar(u.nome)}
        </span>` : "";

    $("#app").innerHTML = `
        <div class="app">
            <aside class="lateral" id="lateral">
                <div class="marca">
                    ${logotipoSVG()}
                    <div>
                        <div class="marca-nome">M-TRON</div>
                        <div class="marca-slogan">MorphPeetron</div>
                    </div>
                </div>
                <nav class="menu" aria-label="Navegação principal">${menuHTML}</nav>
                <div class="usuario">
                    <figure class="mascote-espia" aria-hidden="true">${mascoteAtual()}</figure>
                    <div class="avatar">${escapar(iniciais(State.usuario?.nome))}</div>
                    <div class="usuario-dados">
                        <strong>${escapar(State.usuario?.nome ?? "")}</strong>
                        <span>${escapar(State.usuario?.profissao ?? "")}</span>
                    </div>
                    <button type="button" class="botao-sair" id="botao-sair" title="Sair da conta">${icone("sair")}</button>
                </div>
            </aside>
            <div class="mascara" id="mascara"></div>
            <main class="principal">
                <header class="topo">
                    <button type="button" class="botao-menu" id="botao-menu" aria-label="Abrir menu">${icone("menu")}</button>
                    <div>
                        ${chipUniverso}
                        <h1>${escapar(titulo)}</h1>
                        <p class="topo-data">${escapar(subtitulo || dataBonita())}</p>
                    </div>
                    ${mascoteTopo ? `
                        <figure class="mascote-topo" data-parallax="0.05">
                            <figcaption class="fala-topo">Oi, ${escapar(primeiroNome())}! Tudo em ordem por aqui.</figcaption>
                            ${mascoteAtual()}
                        </figure>` : ""}
                </header>
                <section class="conteudo" id="conteudo">${conteudoHTML}</section>
            </main>
        </div>`;

    const lateral = $("#lateral");
    const mascara = $("#mascara");
    const alternarMenu = () => {
        const aberta = lateral.classList.toggle("aberta");
        mascara.classList.toggle("visivel", aberta);
    };
    $("#botao-menu").addEventListener("click", alternarMenu);
    mascara.addEventListener("click", alternarMenu);
    $(".menu").addEventListener("click", (evento) => {
        if (evento.target.closest("a")) {
            lateral.classList.remove("aberta");
            mascara.classList.remove("visivel");
        }
    });
    $("#botao-sair").addEventListener("click", () => sair());
}

function mostrarErroNaArea(excecao) {
    $("#conteudo").innerHTML = `
        <div class="cartao vazio">
            <figure class="mascote-vazio" data-parallax="0.08">
                ${mascoteAtual()}
                <figcaption>Eita! Aqui deu ruim…</figcaption>
            </figure>
            <strong>Não foi possível carregar os dados</strong>
            <p>${escapar(msgErro(excecao))}</p>
            <button type="button" class="botao" onclick="location.reload()">Tentar de novo</button>
        </div>`;
}

/* ================================= PAINEL ================================
   Painel geral = GERENCIAMENTO (sem troca de profissões): KPIs no idioma do
   universo ativo, grade de módulos de gerenciamento e os módulos do universo
   (com selo de acesso restrito nos prontuários, respeitando LGPD/sigilo). */
async function viewPainel() {
    const m = modo();
    renderShell(`<div class="carregando"><span class="giro"></span>Carregando o painel…</div>`, "Painel geral", m.painelIntro, true);
    try {
        const [resumo, obras] = await Promise.all([api("/resumo"), api("/obras")]);
        const or = resumo.orcamentos;
        const k = m.kpi;

        const gerenciamento = GERENCIAMENTO_BASE.map((item) => {
            const rotulo = item.hash === "#/obras" ? m.t.obras
                : item.hash === "#/engenheiros" ? m.t.engenheiros
                : item.hash === "#/clientes" ? m.t.clientes
                : item.hash === "#/equipamentos" ? m.t.equipamentos
                : m.t.orcamentos;
            return `
                <a class="modulo" href="${item.hash}">
                    <span class="modulo-icone">${icone(item.icone)}</span>
                    <strong>${escapar(rotulo)}</strong>
                    <span>${escapar(item.desc)}</span>
                </a>`;
        }).join("");

        const modulos = m.modulos.map((mod) => {
            const acao = mod.tipo === "rota"
                ? `<a class="modulo-acao" href="${mod.hash}">Abrir ${icone("seta")}</a>`
                : mod.tipo === "restrito"
                    ? `<span class="modulo-selo restrito">${icone("olho-fechado")}${escapar(mod.nota)}</span>`
                    : `<span class="modulo-selo breve">${icone("alternar")}Em breve</span>`;
            return `
                <div class="modulo modulo-universo">
                    <span class="modulo-icone">${icone(mod.icone)}</span>
                    <strong>${escapar(mod.nome)}</strong>
                    <span>${escapar(mod.desc)}</span>
                    ${acao}
                </div>`;
        }).join("");

        $("#conteudo").innerHTML = `
            <div class="kpis">
                <div class="kpi">
                    <span class="kpi-rotulo t-verde">${icone("obras")}${escapar(k.ativos)}</span>
                    <span class="kpi-valor">${resumo.obras.ativas}</span>
                    <span class="kpi-extra">${escapar(k.ativosExtra.replace("#", resumo.obras.total))}</span>
                </div>
                <div class="kpi">
                    <span class="kpi-rotulo t-escuro">${icone("sucesso")}${escapar(k.concluidas)}</span>
                    <span class="kpi-valor">${resumo.obras.concluidas}</span>
                    <span class="kpi-extra">${escapar(k.concluidasExtra)}</span>
                </div>
                <div class="kpi">
                    <span class="kpi-rotulo t-azul">${icone("engenheiros")}${escapar(k.equipe)}</span>
                    <span class="kpi-valor">${resumo.engenheiros.total}</span>
                    <span class="kpi-extra">${escapar(k.equipeExtra)}</span>
                </div>
                <div class="kpi">
                    <span class="kpi-rotulo t-marrom">${icone("clientes")}${escapar(k.pessoas)}</span>
                    <span class="kpi-valor">${resumo.clientes.total}</span>
                    <span class="kpi-extra">${escapar(k.pessoasExtra)}</span>
                </div>
                <div class="kpi">
                    <span class="kpi-rotulo t-laranja">${icone("equipamentos")}${escapar(k.insumos)}</span>
                    <span class="kpi-valor">${resumo.equipamentos.em_manutencao}</span>
                    <span class="kpi-extra">${escapar(k.insumosExtra.replace("#", resumo.equipamentos.total))}</span>
                </div>
                <div class="kpi kpi-destaque">
                    <span class="kpi-rotulo t-verde">${icone("orcamentos")}${escapar(k.destaque)}</span>
                    <span class="kpi-valor moeda">${formatarMoeda(or.valor_aprovado)}</span>
                    <span class="kpi-extra">${escapar(k.destaqueExtra.replace("#", formatarMoeda(or.valor_total)))}</span>
                </div>
            </div>

            <section class="secao-modulos">
                <h2 class="titulo-secao">${icone("painel")}Gerenciamento</h2>
                <div class="grade-modulos">${gerenciamento}</div>
            </section>

            <section class="secao-modulos">
                <h2 class="titulo-secao">${icone("capacete")}Módulos do universo ${escapar(m.nome)}</h2>
                <div class="grade-modulos">${modulos}</div>
            </section>

            <div class="grid-2">
                <div class="cartao">
                    <div class="painel-cabecalho">
                        <h3>${escapar(m.colunas.recentes)}</h3>
                        <a href="#/obras">ver todos</a>
                    </div>
                    <div class="lista-compacta">
                        ${obras.slice(0, 4).map((obra) => `
                            <div class="item-compacto">
                                <strong>${escapar(obra.nome)}</strong>
                                ${seloStatusObra(obra)}
                                <span class="quando">início ${formatarData(obra.data_inicio)}</span>
                            </div>`).join("") || '<p class="nota">Nada cadastrado ainda.</p>'}
                    </div>
                </div>
                <div class="cartao">
                    <div class="painel-cabecalho">
                        <h3>${escapar(m.t.orcamentos)} por status</h3>
                        <span>${or.total} no total</span>
                    </div>
                    <div class="grafico">
                        ${Object.entries(or.por_status).map(([status, quantidade]) => `
                            <div class="linha-grafico">
                                <span>${escapar(status)}</span>
                                <span class="trilha">
                                    <span class="barra ${status.toLowerCase()}"
                                          style="width:${or.total ? Math.round(quantidade / or.total * 100) : 0}%"></span>
                                </span>
                                <span class="valor-grafico">${quantidade}</span>
                            </div>`).join("")}
                    </div>
                    <div class="mini-estatisticas">
                        <span>${escapar(m.colunas.finA)}: <b>${formatarMoeda(or.valor_material)}</b></span>
                        <span>${escapar(m.colunas.finB)}: <b>${formatarMoeda(or.valor_mao_obra)}</b></span>
                    </div>
                </div>
            </div>`;
    } catch (excecao) {
        mostrarErroNaArea(excecao);
    }
}

/* ============================ MÓDULO PRINCIPAL ============================ */
/* O mesmo módulo/rota para todas as profissões: os RÓTULOS mudam conforme o
   universo ativo (Projetos, Atendimentos, Processos, Chamados...). */
async function viewObras() {
    const m = modo();
    renderShell(`<div class="carregando"><span class="giro"></span>Carregando ${escapar(m.t.obras.toLowerCase())}…</div>`, m.t.obras);
    try {
        /* Lista e filtro chegam juntos, em paralelo: um só ciclo de rede */
        const [engenheiros, obras] = await Promise.all([
            apiCache("engenheiros", "/engenheiros"),
            api("/obras"),
        ]);

        $("#conteudo").innerHTML = `
            <div class="barra-acoes">
                <select id="filtro-engenheiro" aria-label="Filtrar por ${escapar(m.t.engenheiros.toLowerCase())}">
                    <option value="">Todos os ${escapar(m.t.engenheiros.toLowerCase())}</option>
                    ${engenheiros.map((e) => `<option value="${e.id}">${escapar(e.nome)}</option>`).join("")}
                </select>
                <span class="espaco"></span>
                <button type="button" class="botao botao-primario" id="nova-obra">${icone("mais")}${escapar(m.acao.novo)}</button>
            </div>
            <div id="lista-obras"></div>`;

        $("#filtro-engenheiro").addEventListener("change", () => recarregarObras());
        $("#nova-obra").addEventListener("click", () => modalObra());
        desenharObras(obras);
    } catch (excecao) {
        mostrarErroNaArea(excecao);
    }
}

/* Redesenha a lista a partir dos dados já buscados */
function desenharObras(obras) {
    const m = modo();
    const destino = $("#lista-obras");
    if (!obras.length) {
        destino.className = "cartao vazio";
        destino.innerHTML = `
            <figure class="mascote-vazio" data-parallax="0.08">
                ${mascoteAtual()}
                <figcaption>Sem nada por aqui — sem poeira!</figcaption>
            </figure>
            <strong>Sem ${escapar(m.t.obras.toLowerCase())} por aqui</strong>
            <p>Cadastre o primeiro clicando em “${escapar(m.acao.novo)}”.</p>`;
        return;
    }
    destino.className = "cartao tabela-cartao";
    destino.innerHTML = `
        <div class="tabela-rolagem">
            <table class="tabela">
                <thead>
                    <tr><th>${escapar(m.colunas.obras[0])}</th><th>${escapar(m.colunas.obras[1])}</th><th>${escapar(m.colunas.obras[2])}</th>
                        <th>${escapar(m.colunas.obras[3])}</th><th>${escapar(m.colunas.obras[4])}</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                    ${obras.map((obra) => `
                        <tr>
                            <td class="principal-celula quebra">${escapar(obra.nome)}
                                ${obra.descricao ? `<br><span class="nota">${escapar(obra.descricao)}</span>` : ""}</td>
                            <td>${escapar(obra.engenheiro_nome ?? "—")}</td>
                            <td>${escapar(obra.cliente_nome ?? "—")}</td>
                            <td>${formatarData(obra.data_inicio)}</td>
                            <td>${formatarData(obra.data_fim)}</td>
                            <td>${seloStatusObra(obra)}</td>
                            <td><div class="acoes">
                                <button type="button" class="botao-icone" title="Editar" data-editar="${obra.id}">${icone("editar")}</button>
                                <button type="button" class="botao-icone excluir" title="Excluir" data-excluir="${obra.id}">${icone("excluir")}</button>
                            </div></td>
                        </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    // onclick (e não addEventListener): substitui o handler anterior a cada recarga da lista
    destino.onclick = (evento) => {
        const botao = evento.target.closest("button");
        if (!botao) return;
        const obra = obras.find((o) => o.id === Number(botao.dataset.editar ?? botao.dataset.excluir));
        if (botao.dataset.editar) modalObra(obra);
        if (botao.dataset.excluir) excluirObra(obra);
    };
}

async function recarregarObras() {
    const filtro = $("#filtro-engenheiro")?.value ?? "";
    try {
        const obras = await api(`/obras${filtro ? `?engenheiro_id=${filtro}` : ""}`);
        if ($("#lista-obras")) desenharObras(obras);
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

function seloStatusObra(obra) {
    const ativa = !obra.data_fim || obra.data_fim >= dataHojeISO();
    return ativa
        ? '<span class="selo selo-verde">Ativa</span>'
        : '<span class="selo selo-marrom">Concluída</span>';
}

async function modalObra(obra = null) {
    const m = modo();
    const eEdicao = obra !== null;
    const [engenheiros, clientes] = await Promise.all([
        apiCache("engenheiros", "/engenheiros"),
        apiCache("clientes", "/clientes"),
    ]);

    abrirModalFormulario({
        titulo: eEdicao ? `Editar ${m.t.obra}` : m.acao.novo,
        subtitulo: eEdicao ? obra.nome : `Preencha os dados ${m.t.obraDe}`,
        corpoHTML: `
            <div class="linha-campos">
                ${campoTexto("nome", "Nome", obra?.nome ?? "", { obrigatorio: true, placeholder: "Edifício Aurora" })}
                ${campoSelecao("engenheiro_id", `${cap(m.t.engenheiros)} — responsável`,
                    opcoesEntidades(engenheiros, obra?.engenheiro_id, "Selecione…"), true)}
            </div>
            <div class="linha-campos">
                ${campoSelecao("cliente_id", `${m.t.clientes} (opcional)`,
                    opcoesEntidades(clientes, obra?.cliente_id, "Sem cliente"), false)}
                ${campoData("data_inicio", "Data de início", obra?.data_inicio, true)}
            </div>
            <div class="linha-campos">
                ${campoData("data_fim", "Data de conclusão (opcional)", obra?.data_fim, false)}
                <div></div>
            </div>
            ${campoTextoLongo("descricao", "Descrição", obra?.descricao ?? "")}`,
        aoEnviar: async (valores) => {
            const dados = normalizar(valores);
            if (dados.data_fim && dados.data_inicio && dados.data_fim < dados.data_inicio) {
                aviso("A data de conclusão não pode ser anterior ao início.", "erro");
                return;
            }
            const resposta = await api(eEdicao ? `/obras/${obra.id}` : "/obras", {
                metodo: eEdicao ? "PUT" : "POST",
                corpo: dados,
            });
            $("#modal").close();
            aviso(eEdicao ? "Registro atualizado com sucesso." : "Registro criado com sucesso!");
            await recarregarObras();
        },
    });
}

async function excluirObra(obra) {
    const m = modo();
    if (!await confirmarExclusao(`Excluir ${m.t.obraDe} “${obra.nome}”? Esta ação não pode ser desfeita.`)) return;
    try {
        await api(`/obras/${obra.id}`, { metodo: "DELETE" });
        aviso("Registro excluído.");
        await recarregarObras();
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

/* ======================== EQUIPE / PESSOAS INTERNAS ======================= */
async function viewEngenheiros() {
    const m = modo();
    renderShell(`<div class="carregando"><span class="giro"></span>Carregando…</div>`, m.t.engenheiros);
    await desenharEngenheiros();
}

/* Busca e redesenha só a área de conteúdo (a moldura do app fica intacta) */
async function desenharEngenheiros() {
    const m = modo();
    try {
        const [engenheiros, obras, orcamentos] = await Promise.all([
            apiCache("engenheiros", "/engenheiros"),
            api("/obras"),
            api("/orcamentos"),
        ]);

        const estatisticas = engenheiros.map((engenheiro) => {
            const minhasObras = obras.filter((o) => o.engenheiro_id === engenheiro.id);
            const meusOrcamentos = orcamentos.filter((o) => o.engenheiro_id === engenheiro.id);
            return {
                ...engenheiro,
                total: minhasObras.length,
                ativas: minhasObras.filter((o) => !o.data_fim || o.data_fim >= dataHojeISO()).length,
                concluidas: minhasObras.filter((o) => o.data_fim && o.data_fim < dataHojeISO()).length,
                orcamentos: meusOrcamentos.length,
                valorOrcado: meusOrcamentos.reduce((soma, o) => soma + o.valor_total, 0),
            };
        });

        $("#conteudo").innerHTML = `
            <div class="barra-acoes">
                <span class="barra-nota">${estatisticas.length} registrado(s) em ${escapar(m.t.engenheiros)}</span>
                <span class="espaco"></span>
                <button type="button" class="botao botao-primario" id="novo-engenheiro">${icone("mais")}${escapar(m.acao.adicionar)}</button>
            </div>
            ${estatisticas.length ? `
                <div class="lista-registros">
                    ${estatisticas.map((eng) => `
                        <article class="linha-registro">
                            <div class="avatar">${escapar(iniciais(eng.nome))}</div>
                            <div class="registro-coluna">
                                <span class="registro-titulo">${escapar(eng.nome)}</span>
                                <span class="registro-sub">${escapar(eng.email)}</span>
                                <div class="estatisticas-linha">
                                    <span class="estatistica"><b>${eng.total}</b><span>${escapar(m.t.obras.toLowerCase())}</span></span>
                                    <span class="estatistica"><b>${eng.ativas}</b><span>ativos</span></span>
                                    <span class="estatistica"><b>${eng.concluidas}</b><span>concluídos</span></span>
                                    <span class="estatistica"><b>${eng.orcamentos}</b><span>${escapar(m.t.orcamentos.toLowerCase())}</span></span>
                                </div>
                            </div>
                            <div class="registro-acoes">
                                <span class="registro-valor">Valor registrado: <b>${formatarMoeda(eng.valorOrcado)}</b></span>
                            </div>
                        </article>`).join("")}
                </div>` : `
                <div class="cartao vazio">
                    <figure class="mascote-vazio" data-parallax="0.08">
                        ${mascoteAtual()}
                        <figcaption>Preciso de reforço aqui!</figcaption>
                    </figure>
                    <strong>Sem ${escapar(m.t.engenheiros.toLowerCase())} por aqui</strong>
                    <p>Clique em “${escapar(m.acao.adicionar)}” para começar.</p>
                </div>`}`;

        $("#novo-engenheiro").addEventListener("click", modalNovoEngenheiro);
    } catch (excecao) {
        mostrarErroNaArea(excecao);
    }
}

function modalNovoEngenheiro() {
    const m = modo();
    abrirModalFormulario({
        titulo: m.acao.adicionar,
        subtitulo: "A conta já pode ser usada para logar no sistema",
        corpoHTML: `
            ${campoTexto("nome", "Nome completo", "", { obrigatorio: true, placeholder: "João Pereira" })}
            ${campoTexto("email", "E-mail", "", { tipo: "email", obrigatorio: true, placeholder: "joao@exemplo.com" })}
            ${campoTexto("senha", "Senha provisória (mínimo 6 caracteres)", "", { tipo: "password", obrigatorio: true, placeholder: "••••••" })}`,
        textoBotao: "Cadastrar",
        aoEnviar: async (valores) => {
            const dados = normalizar(valores);
            if ((dados.senha ?? "").length < 6) {
                aviso("A senha deve ter pelo menos 6 caracteres.", "erro");
                return;
            }
            await api("/cadastro", { metodo: "POST", corpo: { ...dados, profissao: "Engenheiro" } });
            esquecer("engenheiros"); // a lista em cache ficou velha
            $("#modal").close();
            aviso(`“${dados.nome}” cadastrado em ${m.t.engenheiros}!`);
            await desenharEngenheiros(); // atualiza só a lista, sem remontar a tela
        },
    });
}

/* =========================== PESSOAS ATENDIDAS =========================== */
async function viewClientes() {
    const m = modo();
    renderShell(`<div class="carregando"><span class="giro"></span>Carregando ${escapar(m.t.clientes.toLowerCase())}…</div>`, m.t.clientes);
    await desenharClientes();
}

/* Busca e redesenha só a área de conteúdo (a moldura do app fica intacta) */
async function desenharClientes() {
    const m = modo();
    try {
        const clientes = await apiCache("clientes", "/clientes");

        $("#conteudo").innerHTML = `
            <div class="barra-acoes">
                <input type="search" id="busca-cliente" class="busca"
                    placeholder="Filtrar por nome, documento, e-mail, telefone ou endereço…"
                    aria-label="Filtrar ${escapar(m.t.clientes.toLowerCase())}">
                <span class="espaco"></span>
                <button type="button" class="botao botao-primario" id="novo-cliente">${icone("mais")}${escapar(m.acao.novoCliente)}</button>
            </div>
            <div id="lista-clientes" class="carregando"><span class="giro"></span>Buscando…</div>`;

        const desenharLista = () => {
            const termo = $("#busca-cliente").value.trim().toLowerCase();
            const filtrados = !termo ? clientes : clientes.filter((cliente) =>
                [cliente.nome, cliente.documento, cliente.email, cliente.telefone, cliente.endereco]
                    .some((campo) => String(campo ?? "").toLowerCase().includes(termo)));

            const destino = $("#lista-clientes");
            if (!filtrados.length) {
                destino.className = "cartao vazio";
                destino.innerHTML = `
                    <figure class="mascote-vazio" data-parallax="0.08">
                        ${mascoteAtual()}
                        <figcaption>Quem vai trabalhar com a gente?</figcaption>
                    </figure>
                    <strong>Sem ${escapar(m.t.clientes.toLowerCase())} por aqui</strong>
                    <p>${clientes.length ? "Ajuste o texto da busca." : `Cadastre o primeiro em “${escapar(m.acao.novoCliente)}”.`}</p>`;
                return;
            }
            destino.className = "cartao tabela-cartao";
            destino.innerHTML = `
                <div class="tabela-rolagem">
                    <table class="tabela">
                        <thead><tr><th>Nome</th><th>Documento</th><th>Telefone</th>
                            <th>E-mail</th><th>Endereço</th><th>Ações</th></tr></thead>
                        <tbody>
                            ${filtrados.map((cliente) => `
                                <tr>
                                    <td class="principal-celula quebra">${escapar(cliente.nome)}</td>
                                    <td>${escapar(cliente.documento ?? "—")}</td>
                                    <td>${escapar(cliente.telefone ?? "—")}</td>
                                    <td class="quebra">${escapar(cliente.email ?? "—")}</td>
                                    <td class="quebra">${escapar(cliente.endereco ?? "—")}</td>
                                    <td><div class="acoes">
                                        <button type="button" class="botao-icone" title="Editar" data-editar="${cliente.id}">${icone("editar")}</button>
                                        <button type="button" class="botao-icone excluir" title="Excluir" data-excluir="${cliente.id}">${icone("excluir")}</button>
                                    </div></td>
                                </tr>`).join("")}
                        </tbody>
                    </table>
                </div>`;
        };

        $("#busca-cliente").addEventListener("input", desenharLista);
        $("#novo-cliente").addEventListener("click", () => modalCliente());
        $("#lista-clientes").addEventListener("click", (evento) => {
            const botao = evento.target.closest("button");
            if (!botao) return;
            const cliente = clientes.find((c) => c.id === Number(botao.dataset.editar ?? botao.dataset.excluir));
            if (botao.dataset.editar) modalCliente(cliente);
            if (botao.dataset.excluir) excluirCliente(cliente);
        });
        desenharLista();
    } catch (excecao) {
        mostrarErroNaArea(excecao);
    }
}

function modalCliente(cliente = null) {
    const m = modo();
    const eEdicao = cliente !== null;
    abrirModalFormulario({
        titulo: eEdicao ? `Editar ${m.t.cliente ?? "cliente"}` : m.acao.novoCliente,
        subtitulo: eEdicao ? cliente.nome : "Apenas o nome é obrigatório",
        corpoHTML: `
            ${campoTexto("nome", "Nome / Razão social", cliente?.nome ?? "", { obrigatorio: true, placeholder: "Construtora Alfa Ltda" })}
            <div class="linha-campos">
                ${campoTexto("documento", "Documento (CPF/CNPJ)", cliente?.documento ?? "", { placeholder: "00.000.000/0000-00" })}
                ${campoTexto("telefone", "Telefone", cliente?.telefone ?? "", { placeholder: "19 99999-0000" })}
            </div>
            ${campoTexto("email", "E-mail", cliente?.email ?? "", { tipo: "email", placeholder: "contato@empresa.com" })}
            ${campoTexto("endereco", "Endereço", cliente?.endereco ?? "", { placeholder: "Av. das Amoreiras, 500 - Campinas/SP" })}`,
        aoEnviar: async (valores) => {
            const dados = normalizar(valores);
            const resposta = await api(eEdicao ? `/clientes/${cliente.id}` : "/clientes", {
                metodo: eEdicao ? "PUT" : "POST",
                corpo: dados,
            });
            $("#modal").close();
            aviso(eEdicao ? `“${resposta.nome}” atualizado.` : `“${resposta.nome}” cadastrado!`);
            esquecer("clientes"); // lista em cache ficou velha
            await desenharClientes(); // atualiza só a lista, sem remontar a tela
        },
    });
}

async function excluirCliente(cliente) {
    if (!await confirmarExclusao(`Excluir “${cliente.nome}”? Os registros dele ficarão sem vínculo.`)) return;
    try {
        await api(`/clientes/${cliente.id}`, { metodo: "DELETE" });
        aviso("Cliente excluído.");
        esquecer("clientes");
        await desenharClientes();
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

/* ============================== INSUMOS ================================== */
async function viewEquipamentos() {
    const m = modo();
    renderShell(`<div class="carregando"><span class="giro"></span>Carregando ${escapar(m.t.equipamentos.toLowerCase())}…</div>`, m.t.equipamentos);
    try {
        const [engenheiros, equipamentos] = await Promise.all([
            apiCache("engenheiros", "/engenheiros"),
            api("/equipamentos"),
        ]);

        $("#conteudo").innerHTML = `
            <div class="barra-acoes">
                <select id="filtro-status" aria-label="Filtrar por status">
                    <option value="">Todos os status</option>
                    <option value="Ativo">Ativos</option>
                    <option value="Em manutenção">Em manutenção</option>
                </select>
                <span class="espaco"></span>
                <button type="button" class="botao botao-primario" id="novo-equipamento">${icone("mais")}${escapar(m.acao.novoEquipamento)}</button>
            </div>
            <div id="lista-equipamentos"></div>`;

        $("#filtro-status").addEventListener("change", () => recarregarEquipamentos());
        $("#novo-equipamento").addEventListener("click", () => modalEquipamento());
        desenharEquipamentos(equipamentos);
    } catch (excecao) {
        mostrarErroNaArea(excecao);
    }
}

/* Redesenha a lista a partir dos dados já buscados */
function desenharEquipamentos(equipamentos) {
    const m = modo();
    const destino = $("#lista-equipamentos");
    if (!equipamentos.length) {
        destino.className = "cartao vazio";
        destino.innerHTML = `
            <figure class="mascote-vazio" data-parallax="0.08">
                ${mascoteAtual()}
                <figcaption>O estoque tá vazio por aqui!</figcaption>
            </figure>
            <strong>Sem ${escapar(m.t.equipamentos.toLowerCase())} por aqui</strong>
            <p>Cadastre o primeiro em “${escapar(m.acao.novoEquipamento)}”.</p>`;
        return;
    }

    destino.className = "lista-registros";
    destino.innerHTML = equipamentos.map((eq) => `
        <article class="linha-registro">
            <span class="registro-icone">${icone("equipamentos")}</span>
            <div class="registro-coluna">
                <span class="registro-titulo">${escapar(eq.nome)}</span>
                <span class="registro-sub">Última manutenção: ${formatarData(eq.data_ultima_manutencao)} · Responsável: ${escapar(eq.responsavel_id
                    ? (lembrar("engenheiros") ?? []).find((e) => e.id === eq.responsavel_id)?.nome ?? `#${eq.responsavel_id}`
                    : "—")}</span>
            </div>
            <div class="registro-acoes">
                ${eq.status === "Ativo"
                    ? '<span class="selo selo-verde">Ativo</span>'
                    : '<span class="selo selo-laranja">Em manutenção</span>'}
                <button type="button" class="botao" data-alternar="${eq.id}">
                    ${icone("alternar")}${eq.status === "Ativo" ? "Manutenção" : "Ativar"}
                </button>
                <button type="button" class="botao" data-editar="${eq.id}">${icone("editar")}Editar</button>
                <button type="button" class="botao botao-perigo" title="Excluir" data-excluir="${eq.id}">${icone("excluir")}</button>
            </div>
        </article>`).join("");

    // onclick (e não addEventListener): substitui o handler anterior a cada recarga da lista
    destino.onclick = (evento) => {
        const botao = evento.target.closest("button");
        if (!botao) return;
        const equipamento = equipamentos.find((e) => e.id === Number(
            botao.dataset.alternar ?? botao.dataset.editar ?? botao.dataset.excluir));
        if (botao.dataset.alternar) alternarStatusEquipamento(equipamento);
        if (botao.dataset.editar) modalEquipamento(equipamento);
        if (botao.dataset.excluir) excluirEquipamento(equipamento);
    };
}

async function recarregarEquipamentos() {
    const filtro = $("#filtro-status")?.value ?? "";
    try {
        const equipamentos = await api(`/equipamentos${filtro ? `?status=${encodeURIComponent(filtro)}` : ""}`);
        if ($("#lista-equipamentos")) desenharEquipamentos(equipamentos);
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

async function alternarStatusEquipamento(equipamento) {
    const novoStatus = equipamento.status === "Ativo" ? "Em manutenção" : "Ativo";
    try {
        await api(`/equipamentos/${equipamento.id}/status`, {
            metodo: "PUT",
            corpo: { status: novoStatus },
        });
        aviso(`“${equipamento.nome}” agora está ${novoStatus.toLowerCase()}.`);
        await recarregarEquipamentos();
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

async function modalEquipamento(equipamento = null) {
    const m = modo();
    const eEdicao = equipamento !== null;
    const engenheiros = await apiCache("engenheiros", "/engenheiros");
    abrirModalFormulario({
        titulo: eEdicao ? `Editar ${m.t.equipamentos.toLowerCase().split(" ")[0]}` : m.acao.novoEquipamento,
        subtitulo: eEdicao ? equipamento.nome : "Controle do inventário",
        corpoHTML: `
            ${campoTexto("nome", "Nome", equipamento?.nome ?? "", { obrigatorio: true, placeholder: "Betoneira 400L" })}
            <div class="linha-campos">
                ${campoSelecao("status", "Status", `
                    <option value="Ativo" ${equipamento?.status === "Ativo" ? "selected" : ""}>Ativo</option>
                    <option value="Em manutenção" ${equipamento?.status === "Em manutenção" ? "selected" : ""}>Em manutenção</option>`, true)}
                ${campoData("data_ultima_manutencao", "Última manutenção", equipamento?.data_ultima_manutencao, false)}
            </div>
            ${campoSelecao("responsavel_id", "Responsável (opcional)",
                opcoesEntidades(engenheiros, equipamento?.responsavel_id, "Sem responsável"), false)}`,
        aoEnviar: async (valores) => {
            const dados = normalizar(valores);
            const resposta = await api(eEdicao ? `/equipamentos/${equipamento.id}` : "/equipamentos", {
                metodo: eEdicao ? "PUT" : "POST",
                corpo: dados,
            });
            $("#modal").close();
            aviso(eEdicao ? `“${resposta.nome}” atualizado.` : `“${resposta.nome}” cadastrado!`);
            await recarregarEquipamentos();
        },
    });
}

async function excluirEquipamento(equipamento) {
    if (!await confirmarExclusao(`Excluir “${equipamento.nome}”?`)) return;
    try {
        await api(`/equipamentos/${equipamento.id}`, { metodo: "DELETE" });
        aviso("Item excluído.");
        await recarregarEquipamentos();
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

/* ================================ FINANCEIRO ============================= */
async function viewOrcamentos() {
    const m = modo();
    renderShell(`<div class="carregando"><span class="giro"></span>Carregando ${escapar(m.t.orcamentos.toLowerCase())}…</div>`, m.t.orcamentos);
    try {
        /* Os três conjuntos de dados chegam juntos, em paralelo */
        const [engenheiros, clientes, orcamentos] = await Promise.all([
            apiCache("engenheiros", "/engenheiros"),
            apiCache("clientes", "/clientes"),
            api("/orcamentos"),
        ]);

        $("#conteudo").innerHTML = `
            <div class="barra-acoes">
                <select id="filtro-status-orc" aria-label="Filtrar por status">
                    <option value="">Todos os status</option>
                    <option value="Rascunho">Rascunho</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Rejeitado">Rejeitado</option>
                </select>
                <span class="espaco"></span>
                <button type="button" class="botao botao-primario" id="novo-orcamento">${icone("mais")}${escapar(m.acao.novoOrcamento)}</button>
            </div>
            <div id="resumo-orcamentos" class="kpis"></div>
            <div id="lista-orcamentos"></div>`;

        $("#filtro-status-orc").addEventListener("change", () => recarregarOrcamentos());
        $("#novo-orcamento").addEventListener("click", () => modalOrcamento());
        desenharResumoOrcamentos(orcamentos);
        desenharOrcamentos(orcamentos);
    } catch (excecao) {
        mostrarErroNaArea(excecao);
    }
}

/* Resumo em barra plana (valor total, material, mão de obra, aprovado) */
function desenharResumoOrcamentos(orcamentos) {
    const m = modo();
    const totalGeral = orcamentos.reduce((soma, o) => soma + o.valor_total, 0);
    const totalMaterial = orcamentos.reduce((soma, o) => soma + o.valor_material, 0);
    const totalMaoDeObra = orcamentos.reduce((soma, o) => soma + o.valor_mao_obra, 0);
    const totalAprovado = orcamentos
        .filter((o) => o.status === "Aprovado")
        .reduce((soma, o) => soma + o.valor_total, 0);

    $("#resumo-orcamentos").innerHTML = `
        <div class="kpi kpi-destaque">
            <span class="kpi-rotulo t-escuro">${icone("orcamentos")}Total em ${escapar(m.t.orcamentos.toLowerCase())}</span>
            <span class="kpi-valor moeda">${formatarMoeda(totalGeral)}</span>
            <span class="kpi-extra">${orcamentos.length} registro(s)</span></div>
        <div class="kpi">
            <span class="kpi-rotulo t-laranja">${icone("caixa")}${escapar(m.colunas.finA)}</span>
            <span class="kpi-valor moeda">${formatarMoeda(totalMaterial)}</span></div>
        <div class="kpi">
            <span class="kpi-rotulo t-marrom">${icone("equipamentos")}${escapar(m.colunas.finB)}</span>
            <span class="kpi-valor moeda">${formatarMoeda(totalMaoDeObra)}</span></div>
        <div class="kpi">
            <span class="kpi-rotulo t-verde">${icone("sucesso")}Aprovado</span>
            <span class="kpi-valor moeda">${formatarMoeda(totalAprovado)}</span></div>`;
}

/* Redesenha a lista a partir dos dados já buscados */
function desenharOrcamentos(orcamentos) {
    const m = modo();
    const destino = $("#lista-orcamentos");
    if (!orcamentos.length) {
        destino.className = "cartao vazio";
        destino.innerHTML = `
            <figure class="mascote-vazio" data-parallax="0.08">
                ${mascoteAtual()}
                <figcaption>Nada registrado ainda… vamos fazer as contas!</figcaption>
            </figure>
            <strong>Sem ${escapar(m.t.orcamentos.toLowerCase())} por aqui</strong>
            <p>Crie o primeiro em “${escapar(m.acao.novoOrcamento)}”.</p>`;
        return;
    }

    destino.className = "cartao tabela-cartao";
    destino.innerHTML = `
        <div class="tabela-rolagem">
            <table class="tabela">
                <thead><tr><th>${escapar(m.t.clientes)}</th><th>${escapar(m.t.engenheiros)}</th><th>${escapar(m.colunas.finA)}</th>
                    <th>${escapar(m.colunas.finB)}</th><th>Total</th><th>Status</th><th>Criado</th><th>Ações</th></tr></thead>
                <tbody>
                    ${orcamentos.map((orc) => `
                        <tr>
                            <td class="principal-celula quebra">${escapar(orc.nome_cliente)}
                                ${orc.descricao ? `<br><span class="nota">${escapar(orc.descricao)}</span>` : ""}</td>
                            <td>${escapar(orc.engenheiro_nome ?? "—")}</td>
                            <td>${formatarMoeda(orc.valor_material)}</td>
                            <td>${formatarMoeda(orc.valor_mao_obra)}</td>
                            <td class="principal-celula">${formatarMoeda(orc.valor_total)}</td>
                            <td>${seloStatusOrcamento(orc.status)}</td>
                            <td>${formatarData(orc.data_criacao)}</td>
                            <td><div class="acoes">
                                <button type="button" class="botao-icone" title="Editar" data-editar="${orc.id}">${icone("editar")}</button>
                                <button type="button" class="botao-icone excluir" title="Excluir" data-excluir="${orc.id}">${icone("excluir")}</button>
                            </div></td>
                        </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    // onclick (e não addEventListener): substitui o handler anterior a cada recarga da lista
    destino.onclick = (evento) => {
        const botao = evento.target.closest("button");
        if (!botao) return;
        const orcamento = orcamentos.find((o) => o.id === Number(botao.dataset.editar ?? botao.dataset.excluir));
        if (botao.dataset.editar) modalOrcamento(orcamento);
        if (botao.dataset.excluir) excluirOrcamento(orcamento);
    };
}

async function recarregarOrcamentos() {
    const filtro = $("#filtro-status-orc")?.value ?? "";
    try {
        const orcamentos = await api(`/orcamentos${filtro ? `?status=${encodeURIComponent(filtro)}` : ""}`);
        if ($("#resumo-orcamentos")) desenharResumoOrcamentos(orcamentos);
        if ($("#lista-orcamentos")) desenharOrcamentos(orcamentos);
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

function seloStatusOrcamento(status) {
    const estilos = {
        Rascunho: "selo-neutro",
        Enviado: "selo-azul",
        Aprovado: "selo-verde",
        Rejeitado: "selo-laranja",
    };
    return `<span class="selo ${estilos[status] ?? "selo-neutro"}">${escapar(status)}</span>`;
}

async function modalOrcamento(orcamento = null) {
    const m = modo();
    const eEdicao = orcamento !== null;
    const [engenheiros, clientes] = await Promise.all([
        apiCache("engenheiros", "/engenheiros"),
        apiCache("clientes", "/clientes"),
    ]);
    const listaClientes = clientes
        .map((c) => `<option value="${escapar(c.nome)}"></option>`).join("");

    abrirModalFormulario({
        titulo: eEdicao ? `Editar ${m.t.orcamentoDe.replace("do ", "")}` : m.acao.novoOrcamento,
        subtitulo: "O valor total é calculado automaticamente (insumos + mão de obra)",
        corpoHTML: `
            ${campoTexto("nome_cliente", m.t.cliente ? cap(m.t.cliente) : "Cliente", orcamento?.nome_cliente ?? "", {
                obrigatorio: true, placeholder: "Construtora Alfa Ltda", lista: "lista-nomes-clientes" })}
            <datalist id="lista-nomes-clientes">${listaClientes}</datalist>
            <div class="linha-campos">
                ${campoSelecao("engenheiro_id", `${cap(m.t.engenheiros)} — responsável`,
                    opcoesEntidades(engenheiros, orcamento?.engenheiro_id, "Selecione…"), true)}
                ${campoSelecao("status", "Status", `
                    <option value="Rascunho" ${orcamento?.status === "Rascunho" ? "selected" : ""}>Rascunho</option>
                    <option value="Enviado" ${orcamento?.status === "Enviado" ? "selected" : ""}>Enviado</option>
                    <option value="Aprovado" ${orcamento?.status === "Aprovado" ? "selected" : ""}>Aprovado</option>
                    <option value="Rejeitado" ${orcamento?.status === "Rejeitado" ? "selected" : ""}>Rejeitado</option>`, true)}
            </div>
            <div class="linha-campos">
                ${campoTexto("valor_material", `${m.colunas.finA} (R$)`, orcamento?.valor_material ?? "", {
                    tipo: "number", passo: "0.01", minimo: "0", placeholder: "145000.00" })}
                ${campoTexto("valor_mao_obra", `${m.colunas.finB} (R$)`, orcamento?.valor_mao_obra ?? "", {
                    tipo: "number", passo: "0.01", minimo: "0", placeholder: "82000.00" })}
            </div>
            ${campoTextoLongo("descricao", "Descrição", orcamento?.descricao ?? "")}`,
        aoEnviar: async (valores) => {
            const dados = normalizar(valores);
            const resposta = await api(eEdicao ? `/orcamentos/${orcamento.id}` : "/orcamentos", {
                metodo: eEdicao ? "PUT" : "POST",
                corpo: dados,
            });
            $("#modal").close();
            aviso(eEdicao ? "Registro atualizado." : `Registro de ${formatarMoeda(resposta.valor_total)} criado!`);
            await recarregarOrcamentos();
        },
    });
}

async function excluirOrcamento(orcamento) {
    if (!await confirmarExclusao(
        `Excluir o registro de “${orcamento.nome_cliente}” (${formatarMoeda(orcamento.valor_total)})?`)) return;
    try {
        await api(`/orcamentos/${orcamento.id}`, { metodo: "DELETE" });
        aviso("Registro excluído.");
        await recarregarOrcamentos();
    } catch (excecao) {
        aviso(msgErro(excecao), "erro");
    }
}

/* ================== Animação de entrada (profundidade 3D) ==================
   Cada bloco que entra na área visível "sobe" com leve inclinação 3D,
   em cascata. Sem bibliotecas: IntersectionObserver + MutationObserver. */
const ALVOS_ANIMACAO = [
    ".kpis > .kpi",
    ".linha-registro",
    ".tabela tbody tr",
    ".barra-acoes",
    ".grid-2 > .cartao",
    ".cartao.vazio",
    ".item-compacto",
    ".linha-grafico",
    ".mini-estatisticas",
    ".mascote",
    ".mascote-topo",
    ".mascote-vazio",
    ".mascote-fala",
    ".profissao-cartao",
    ".orbita-centro > *",
    ".orbita-controles",
    ".orbita-indicador",
    ".inicio-pe",
    ".universo-topo",
    ".universo-hero > *",
    ".login-marca",
    ".login-cabecalho > *",
    ".login-form > *",
    ".login-demo",
    ".login-troca",
    ".login-universos",
    ".login-palco",
    ".login-cartao",
].join(", ");

let animacaoComprovada = false;

const observadorEntrada = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
        animacaoComprovada = true;
        if (entrada.isIntersecting) {
            entrada.target.classList.add("visivel");
            observadorEntrada.unobserve(entrada.target); // anima uma vez só
        }
    }
}, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });

/* Rede de segurança: se o observador nunca disparar (ambiente sem frames de
   renderização), revela o conteúdo — nada pode ficar invisível. */
const segurancaAnimacao = setInterval(() => {
    if (animacaoComprovada) { clearInterval(segurancaAnimacao); return; }
    document.querySelectorAll(".animar:not(.visivel)")
        .forEach((el) => el.classList.add("visivel"));
}, 1200);

/* Posição entre os irmãos define o atraso: efeito cascata */
function prepararAnimacao(alvo) {
    if (alvo.classList.contains("animar")) return;
    const irmaos = alvo.parentElement ? [...alvo.parentElement.children] : [];
    const posicao = Math.max(irmaos.indexOf(alvo), 0);
    alvo.classList.add("animar");
    alvo.style.setProperty("--atraso", `${Math.min(posicao * 55, 420)}ms`);
    observadorEntrada.observe(alvo);
}

/* Toda vez que a SPA insere conteúdo, os alvos novos entram na fila */
new MutationObserver((mutacoes) => {
    for (const mutacao of mutacoes) {
        for (const no of mutacao.addedNodes) {
            if (no.nodeType !== Node.ELEMENT_NODE) continue;
            if (no.matches(ALVOS_ANIMACAO)) prepararAnimacao(no);
            no.querySelectorAll(ALVOS_ANIMACAO).forEach(prepararAnimacao);
        }
    }
}).observe($("#app"), { childList: true, subtree: true });

/* ==================== Extras de rolagem ====================
   Parallax suave nos mascotes/formas + barra de progresso no topo.
   Tudo em requestAnimationFrame, desligado se o usuário prefere
   menos movimento (prefers-reduced-motion). */
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let rolagemPendente = false;

    const pintarRolagem = () => {
        rolagemPendente = false;
        const centroTela = window.innerHeight / 2;

        /* Parallax: cada alvo desliza em velocidade própria */
        document.querySelectorAll("[data-parallax]").forEach((alvo) => {
            const fator = Number.parseFloat(alvo.dataset.parallax) || 0;
            const retangulo = alvo.parentElement.getBoundingClientRect();
            const deslocamento = (retangulo.top + retangulo.height / 2 - centroTela) * fator;
            alvo.style.transform = `translateY(${deslocamento.toFixed(1)}px)`;
        });

        /* Barra de progresso preenchendo conforme a rolagem */
        const raiz = document.documentElement;
        const alturaRolavel = raiz.scrollHeight - raiz.clientHeight;
        const fracao = alturaRolavel > 0 ? raiz.scrollTop / alturaRolavel : 0;
        const barra = document.getElementById("progresso-rolagem");
        if (barra) barra.style.transform = `scaleX(${fracao.toFixed(3)})`;
    };

    window.addEventListener("scroll", () => {
        if (!rolagemPendente) {
            rolagemPendente = true;
            requestAnimationFrame(pintarRolagem);
        }
    }, { passive: true });
    window.addEventListener("resize", pintarRolagem, { passive: true });
}

/* ================== PÁGINA INICIAL (pública, #/inicio) ====================
   A home funciona como tela de seleção de universos: cada mascote, em
   corpo inteiro e flutuando livremente, é um botão que leva à sua página. */
const UNIVERSOS = [
    {
        id: "arquitetura", nome: "Arquitetura",
        mascote: "/static/mascotes/arquitetura.png", largura: 520, altura: 485,
        cor: "#b04e30", corSuave: "#fae2d6",
        titulo: "Projetos que saem do papel e viram obra.",
        texto: "Plantas, orçamentos, equipes e clientes em um só canto — o M-TRON vira o escritório de quem desenha o mundo, do primeiro traço à entrega das chaves.",
        chips: ["Obras e etapas", "Orçamentos", "Equipes"],
        fala: "Bora erguer algo grande?",
    },
    {
        id: "medicina", nome: "Medicina",
        mascote: "/static/mascotes/medicina.png", largura: 480, altura: 498,
        cor: "#2477c8", corSuave: "#dcebfa",
        titulo: "Sua clínica organizada em poucos toques.",
        texto: "Agenda de consultas, prontuários e pacientes num lugar só. O M-TRON cuida da burocracia para você cuidar das pessoas.",
        chips: ["Agenda de consultas", "Prontuários", "Pacientes"],
        fala: "Consulta marcada, tudo sob controle!",
    },
    {
        id: "direito", nome: "Direito",
        mascote: "/static/mascotes/direito.png", largura: 532, altura: 500,
        cor: "#1f3152", corSuave: "#e1e5ed",
        titulo: "Casos, prazos e processos sem dor de cabeça.",
        texto: "Acompanhe processos, prazos e clientes com a organização de quem nunca perde uma audiência.",
        chips: ["Processos", "Prazos", "Clientes"],
        fala: "Prazo nenhum passa batido!",
    },
    {
        id: "informatica", nome: "Informática",
        mascote: "/static/mascotes/informatica.png", largura: 481, altura: 478,
        cor: "#2563eb", corSuave: "#dde8fd",
        titulo: "Chamados, clientes e equipamentos num painel só.",
        texto: "Do suporte ao inventário: cada chamado, máquina e cliente com histórico, status e responsável.",
        chips: ["Chamados", "Equipamentos", "Clientes"],
        fala: "Sistema atualizado, chefe!",
    },
    {
        id: "psicologia", nome: "Psicologia",
        mascote: "/static/mascotes/psicologia.png", largura: 394, altura: 487,
        cor: "#7041c5", corSuave: "#ebe0fa",
        titulo: "Sessões e anotações com leveza e sigilo.",
        texto: "Agenda de sessões, evoluções e pacientes organizados com a calma que a sua prática merece.",
        chips: ["Sessões", "Pacientes", "Anotações"],
        fala: "Respira. A gente organiza tudo.",
    },
    {
        id: "farmacia", nome: "Farmácia",
        mascote: "/static/mascotes/farmacia.png", largura: 404, altura: 507,
        cor: "#167a52", corSuave: "#dcefe5",
        titulo: "Estoque, validades e receitas sob controle.",
        texto: "Nada de produto vencido escondido na prateleira: estoque, lotes e receituário sempre em ordem.",
        chips: ["Estoque", "Validades", "Receituário"],
        fala: "Tudo na validade por aqui!",
    },
    {
        id: "professor", nome: "Professor",
        mascote: "/static/mascotes/professor.png", largura: 404, altura: 483,
        cor: "#315fb5", corSuave: "#e2ebf8",
        titulo: "Notas, turmas e aulas em um só quadro.",
        texto: "Planeje aulas, lance notas e acompanhe cada turma sem virar refém da planilha.",
        chips: ["Turmas", "Notas", "Aulas"],
        fala: "Turma reunida, aula começada!",
    },
    {
        id: "artes", nome: "Artes",
        mascote: "/static/mascotes/artes.png", largura: 394, altura: 497,
        cor: "#c13c83", corSuave: "#f8dfec",
        titulo: "Comissões, portfólio e prazos com cor.",
        texto: "Cada encomenda, prazo e inspiração no lugar certo — para a sua arte render também na vida real.",
        chips: ["Comissões", "Portfólio", "Prazos"],
        fala: "Que tal pintar o dia a dia de novo?",
    },
];

/* Figura do mascote. Os 7 do collage já trazem blob + etiqueta no PNG;
   o de Arquitetura é "despojado", então o blob e a etiqueta são CSS. */
function figuroUniverso(u) {
    const medidas = `width="${u.largura}" height="${u.altura}"`;
    if (u.id === "arquitetura") {
        return `
            <span class="universo-figuro">
                <span class="universo-blobo" aria-hidden="true"></span>
                <img src="${u.mascote}" ${medidas}
                    alt="Mascote da M-TRON de ${escapar(u.nome)}: engenheiro de tijolo com capacete dando um joia">
                <span class="universo-etiqueta" aria-hidden="true"><b>M-TRON</b><span>${escapar(u.nome.toUpperCase())}</span></span>
            </span>`;
    }
    return `
        <span class="universo-figuro">
            <img src="${u.mascote}" ${medidas} alt="Mascote da M-TRON de ${escapar(u.nome)}">
        </span>`;
}

/* ================ CATÁLOGO ORBITAL DA PÁGINA INICIAL ======================
   Os mascotes (corpo inteiro, PNG original) circulam em uma órbita elíptica
   ao redor do conteúdo central, com profundidade 3D real: na frente ficam
   maiores, nítidos e destacados; atrás, menores e discretos. Hover pausa,
   clique seleciona (cartão de confirmação), controles navegam. */

function orbitaMascote(u, indice) {
    return `
        <button type="button" class="orbita-mascote" data-universo="${u.id}"
            data-indice="${indice}" style="--cor:${u.cor}; --cor-suave:${u.corSuave};"
            aria-label="Escolher a profissão ${escapar(u.nome)}">
            <span class="orbita-blob" aria-hidden="true"></span>
            <img src="${u.mascote}" width="${u.largura}" height="${u.altura}"
                alt="Mascote da M-TRON de ${escapar(u.nome)}">
            <span class="orbita-nome" aria-hidden="true">${escapar(u.nome)}</span>
        </button>`;
}

function viewInicio() {
    document.title = "M-TRON — Escolha sua profissão";
    const logado = Boolean(State.token);
    $("#app").innerHTML = `
        <div class="inicio">
            <header class="inicio-topo">
                <a class="marca" href="#/inicio" aria-label="M-TRON — página inicial">
                    ${logotipoSVG()}
                    <div>
                        <div class="marca-nome">M-TRON</div>
                        <div class="marca-slogan">MorphPeetron</div>
                    </div>
                </a>
                <nav class="inicio-acoes" aria-label="Acesso">
                    ${logado
                        ? `<a class="botao botao-primario" href="#/painel">Meu painel</a>`
                        : `<a class="botao-suave" href="#/login">Entrar</a>
                           <a class="botao botao-primario" href="#/cadastro">Cadastro</a>`}
                </nav>
            </header>

            <section class="orbita-palco" id="orbita-palco" aria-label="Catálogo orbital de profissões">
                <div class="orbita" id="orbita">
                    <span class="orbita-trilha" aria-hidden="true"></span>
                    ${UNIVERSOS.map(orbitaMascote).join("")}
                </div>

                <div class="orbita-centro">
                    <span class="inicio-selo">${icone("capacete")}8 universos · 1 plataforma</span>
                    <h1 class="inicio-titulo">Seu universo profissional começa aqui.</h1>
                    <p class="inicio-sub">Uma plataforma inteligente que se transforma para acompanhar você, sua profissão e suas necessidades.</p>
                    <p class="orbita-chamada" id="orbita-chamada">Escolha sua profissão e descubra seu universo.</p>
                    <div class="orbita-selecao" id="orbita-selecao" hidden></div>
                </div>

                <div class="orbita-controles" id="orbita-controles">
                    <button type="button" class="orbita-botao" id="orbita-anterior" title="Mascote anterior" aria-label="Mascote anterior">
                        ${icone("seta-voltar")}
                    </button>
                    <div class="orbita-dots" id="orbita-dots" role="group" aria-label="Selecionar uma profissão diretamente">
                        ${UNIVERSOS.map((u) => `
                            <button type="button" class="orbita-dot" data-universo="${u.id}"
                                title="${escapar(u.nome)}" aria-label="Selecionar ${escapar(u.nome)}">
                                <img src="/static/mascotes/mini/${u.id}.png" alt="" width="34" height="34" loading="lazy">
                            </button>`).join("")}
                    </div>
                    <button type="button" class="orbita-botao" id="orbita-proximo" title="Próximo mascote" aria-label="Próximo mascote">
                        ${icone("seta")}
                    </button>
                    <button type="button" class="orbita-botao" id="orbita-pausa" title="Pausar rotação" aria-label="Pausar rotação" aria-pressed="false">
                        ${icone("pausa")}
                    </button>
                </div>
                <p class="orbita-indicador" id="orbita-indicador" role="status" aria-live="polite"></p>
            </section>

            <footer class="inicio-pe">
                <p><strong>M-TRON</strong> · MorphPeetron — a plataforma que se transforma com você.</p>
                <p>Já tem conta? <a href="#/login">Entrar</a> · Primeira vez? <a href="#/cadastro">Criar conta</a></p>
            </footer>
        </div>`;

    montarOrbita();
}

function montarOrbita() {
    const palco = $("#orbita-palco");
    const el = $("#orbita");
    if (!palco || !el) return;
    const mascotes = [...el.querySelectorAll(".orbita-mascote")];
    const total = mascotes.length;
    if (!total) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const estado = {
        angulo: Math.PI / 2,  /* o 1º mascote já nasce na frente */
        vel: 0.22,            /* rad/s: uma volta a cada ~28s */
        automatico: !reduzido,
        pausaManual: false,
        alvo: null,           /* ângulo destino ao navegar/selecionar (planar) */
        selecionado: null,    /* id do universo no cartão de confirmação */
        aoVivo: true,         /* palco visível e aba ativa */
        sobMouse: false,
    };

    /* Geometria da elipse: acompanha o tamanho do palco (responsivo) */
    const medir = () => {
        const area = el.getBoundingClientRect();
        estado.rx = Math.max(120, area.width / 2 - 78);
        estado.ry = Math.max(96, area.height / 2 - 64);
    };

    /* Pintura: posição na elipse + profundidade (frente maior/nítida) */
    const pintar = () => {
        mascotes.forEach((botao, i) => {
            const angulo = estado.angulo + (i * Math.PI * 2) / total;
            const x = Math.cos(angulo) * estado.rx;
            const y = Math.sin(angulo) * estado.ry;
            const profundidade = (Math.sin(angulo) + 1) / 2; /* 0 atrás … 1 frente */
            const escala = 0.60 + profundidade * 0.48;        /* 0.60 … 1.08 */
            botao.style.transform =
                `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${escala.toFixed(3)})`;
            botao.style.opacity = (0.40 + profundidade * 0.60).toFixed(2);
            botao.style.zIndex = String(Math.round(profundidade * 100));
            const naFrente = profundidade > 0.985;
            if (naFrente !== botao.classList.contains("frente")) {
                botao.classList.toggle("frente", naFrente);
            }
        });
    };

    /* Quem está na frente agora (profundidade máxima) */
    const indiceFrente = () => {
        let melhor = 0, maior = -Infinity;
        mascotes.forEach((_, i) => {
            const seno = Math.sin(estado.angulo + (i * Math.PI * 2) / total);
            if (seno > maior) { maior = seno; melhor = i; }
        });
        return melhor;
    };

    /* Indicador + ponto ativo (o DOM só muda quando o destaque muda) */
    let frenteAnterior = -1;
    const indicar = () => {
        const frente = indiceFrente();
        if (frente === frenteAnterior) return;
        frenteAnterior = frente;
        const u = UNIVERSOS[frente];
        const indicador = $("#orbita-indicador");
        if (indicador) indicador.innerHTML = `Em destaque: <b>${escapar(u.nome)}</b> — clique para escolher`;
        document.querySelectorAll(".orbita-dot").forEach((ponto, i) => {
            ponto.classList.toggle("ativo", i === frente);
            ponto.setAttribute("aria-pressed", String(i === frente));
        });
    };

    /* Planar suave até o ângulo em que o mascote <indice> fica na frente */
    const girarPara = (indice, { planar = true } = {}) => {
        const destino = Math.PI / 2 - (indice * Math.PI * 2) / total;
        let maisProximo = destino;
        while (maisProximo < estado.angulo - Math.PI) maisProximo += Math.PI * 2;
        while (maisProximo > estado.angulo + Math.PI) maisProximo -= Math.PI * 2;
        if (!planar || reduzido) {
            estado.angulo = maisProximo;
            estado.alvo = null;
        } else {
            estado.alvo = maisProximo;
        }
    };

    const atualizarPausa = () => {
        const botao = $("#orbita-pausa");
        if (!botao) return;
        const emPausa = estado.pausaManual;
        botao.innerHTML = icone(emPausa ? "continuar" : "pausa");
        botao.title = emPausa ? "Continuar rotação" : "Pausar rotação";
        botao.setAttribute("aria-label", emPausa ? "Continuar rotação" : "Pausar rotação");
        botao.setAttribute("aria-pressed", String(emPausa));
    };

    /* Cartão de confirmação no centro da órbita */
    const abrirSelecao = (id) => {
        const u = UNIVERSOS.find((x) => x.id === id);
        if (!u) return;
        estado.selecionado = id;
        const cartao = $("#orbita-selecao");
        const chamada = $("#orbita-chamada");
        if (!cartao) return;
        cartao.innerHTML = `
            <img class="selecao-mascote" src="/static/mascotes/mini/${u.id}.png" alt="" width="64" height="64">
            <strong class="selecao-nome">${escapar(u.nome)}</strong>
            <p class="selecao-texto">${escapar(u.titulo)}</p>
            <p class="selecao-desc">${escapar(u.texto)}</p>
            <div class="selecao-chips">${u.chips.map((c) => `<span>${escapar(c)}</span>`).join("")}</div>
            <div class="selecao-acoes">
                <button type="button" class="botao botao-primario" data-confirmar="${u.id}"
                    style="--cor:${u.cor};">${icone("seta")}Entrar no universo ${escapar(u.nome)}</button>
                <button type="button" class="botao-suave" data-voltar>Continuar olhando</button>
            </div>`;
        cartao.hidden = false;
        if (chamada) chamada.hidden = true;
        palco.classList.add("selecionando");
        mascotes.forEach((botao) =>
            botao.classList.toggle("selecionado", botao.dataset.universo === id));
    };

    const fecharSelecao = () => {
        estado.selecionado = null;
        const cartao = $("#orbita-selecao");
        const chamada = $("#orbita-chamada");
        if (cartao) { cartao.hidden = true; cartao.innerHTML = ""; }
        if (chamada) chamada.hidden = false;
        palco.classList.remove("selecionando");
        mascotes.forEach((botao) => botao.classList.remove("selecionado"));
    };

    const confirmar = (id) => {
        const u = UNIVERSOS.find((x) => x.id === id);
        if (!u) return;
        aplicarTema(id); /* identidade visual do universo, em toda a plataforma */
        aviso(`Universo ${u.nome} ativado! Boa jornada.`);
        irPara(`#/universo/${id}`);
    };

    /* --- Eventos --- */
    mascotes.forEach((botao) => {
        botao.addEventListener("click", () => {
            const id = botao.dataset.universo;
            if (estado.selecionado === id) { fecharSelecao(); return; }
            girarPara(Number(botao.dataset.indice));
            abrirSelecao(id);
        });
    });

    $("#orbita-anterior")?.addEventListener("click", () => {
        fecharSelecao();
        girarPara((frenteAnterior + total - 1) % total);
    });
    $("#orbita-proximo")?.addEventListener("click", () => {
        fecharSelecao();
        girarPara((frenteAnterior + 1) % total);
    });
    $("#orbita-pausa")?.addEventListener("click", () => {
        estado.pausaManual = !estado.pausaManual;
        atualizarPausa();
    });
    $("#orbita-dots")?.addEventListener("click", (evento) => {
        const ponto = evento.target.closest(".orbita-dot");
        if (!ponto) return;
        const indice = UNIVERSOS.findIndex((x) => x.id === ponto.dataset.universo);
        if (indice < 0) return;
        girarPara(indice);
        abrirSelecao(ponto.dataset.universo);
    });
    $("#orbita-selecao")?.addEventListener("click", (evento) => {
        const botaoConfirmar = evento.target.closest("[data-confirmar]");
        if (botaoConfirmar) { confirmar(botaoConfirmar.dataset.confirmar); return; }
        if (evento.target.closest("[data-voltar]")) fecharSelecao();
    });

    /* Teclado: ← → ↑ ↓ navegam entre os mascotes; Esc fecha o cartão */
    palco.addEventListener("keydown", (evento) => {
        if (evento.key === "ArrowLeft" || evento.key === "ArrowUp") {
            evento.preventDefault();
            $("#orbita-anterior")?.click();
        } else if (evento.key === "ArrowRight" || evento.key === "ArrowDown") {
            evento.preventDefault();
            $("#orbita-proximo")?.click();
        } else if (evento.key === "Escape" && estado.selecionado) {
            fecharSelecao();
        }
    });

    /* Hover em um mascote pausa a rotação; ao sair, ela volta sozinha */
    mascotes.forEach((botao) => {
        botao.addEventListener("pointerenter", () => { estado.sobMouse = true; });
        botao.addEventListener("pointerleave", () => { estado.sobMouse = false; });
    });
    /* Aba oculta ou palco fora da vista: rotação em standby (economia) */
    document.addEventListener("visibilitychange", () => {
        estado.aoVivo = !document.hidden;
    });
    const observadorPalco = new IntersectionObserver((entradas) => {
        estado.aoVivo = entradas[0]?.isIntersecting ?? true;
    }, { threshold: 0.05 });
    observadorPalco.observe(palco);

    if ("ResizeObserver" in window) {
        new ResizeObserver(() => { medir(); }).observe(palco);
    } else {
        window.addEventListener("resize", medir, { passive: true });
    }

    /* --- Motor --- */
    medir();
    pintar();
    indicar();
    atualizarPausa();

    let anterior = null;
    const passo = (agora) => {
        const raf = requestAnimationFrame(passo);
        if (!el.isConnected) { cancelAnimationFrame(raf); return; } /* saiu do DOM: motor para */
        const dt = Math.min(0.05, (agora - (anterior ?? agora)) / 1000);
        anterior = agora;

        if (estado.alvo !== null) {
            const restante = estado.alvo - estado.angulo;
            if (Math.abs(restante) < 0.012) {
                estado.angulo = estado.alvo;
                estado.alvo = null;
            } else {
                estado.angulo += restante * Math.min(1, dt * 5.2);
            }
        } else if (!estado.automatico || estado.pausaManual || estado.selecionado !== null
                   || !estado.aoVivo || estado.sobMouse) {
            /* em pausa: nada avança */
        } else {
            estado.angulo += estado.vel * dt;
        }
        pintar();
        indicar();
    };
    requestAnimationFrame(passo);
}

/* ============ PÁGINA DO UNIVERSO (#/universo/<id>, pública) ============
   Tema próprio por profissão: cor via variáveis CSS + o mascote escolhido. */
function viewUniverso(id) {
    const u = UNIVERSOS.find((x) => x.id === id);
    if (!u) { irPara("#/inicio"); return; }
    aplicarTema(u.id, { animar: false }); // deep-link: o tema acompanha a rota
    const logado = Boolean(State.token);
    document.title = `M-TRON — Universo ${u.nome}`;
    $("#app").innerHTML = `
        <div class="universo-pagina">
            ${formasFundo()}
            <header class="universo-topo">
                <a class="universo-voltar" href="#/inicio">← Todos os universos</a>
                ${logado
                    ? `<a class="botao botao-primario" href="#/painel">Meu painel</a>`
                    : `<a class="botao-suave" href="#/login">Entrar</a>`}
            </header>
            <section class="universo-hero">
                <figure class="universo-mascote" data-parallax="0.06">${figuroUniverso(u)}</figure>
                <div class="universo-info">
                    <span class="universo-selo">Universo ${escapar(u.nome)}</span>
                    <h1>${escapar(u.titulo)}</h1>
                    <p class="universo-texto">${escapar(u.texto)}</p>
                    <div class="universo-chips">${u.chips.map((c) => `<span>${escapar(c)}</span>`).join("")}</div>
                    <div class="universo-ctas">
                        ${logado
                            ? `<a class="botao botao-primario" href="#/painel">Abrir meu painel</a>`
                            : `<a class="botao botao-primario" href="#/cadastro">Criar conta grátis</a>
                               <a class="botao-suave" href="#/login">Já tenho conta</a>`}
                    </div>
                    <p class="universo-fala">“${escapar(u.fala)}” — mascote ${escapar(u.nome)}</p>
                </div>
            </section>
            <footer class="universo-pe">
                <a href="#/inicio">← Escolher outro universo</a>
            </footer>
        </div>`;
}

/* ================================== ROTAS ================================ */
const ROTAS_PROTEGIDAS = new Set([
    "#/painel", "#/obras", "#/engenheiros", "#/clientes", "#/equipamentos", "#/orcamentos",
]);

function rotear() {
    const hash = location.hash || "";

    /* Públicas: página inicial (tela de seleção) e universos — servem logado ou não */
    if (hash.startsWith("#/universo/")) { viewUniverso(hash.slice("#/universo/".length)); return; }
    if (hash === "#/inicio") { viewInicio(); return; }

    if (ROTAS_PROTEGIDAS.has(hash) && !State.token) { irPara("#/login"); return; }
    if ((hash === "#/login" || hash === "#/cadastro") && State.token) { irPara("#/painel"); return; }

    switch (hash) {
        case "#/login": viewLogin(); break;
        case "#/cadastro": viewCadastro(); break;
        case "#/obras": viewObras(); break;
        case "#/engenheiros": viewEngenheiros(); break;
        case "#/clientes": viewClientes(); break;
        case "#/equipamentos": viewEquipamentos(); break;
        case "#/orcamentos": viewOrcamentos(); break;
        case "#/painel": viewPainel(); break;
        default: irPara(State.token ? "#/painel" : "#/inicio");
    }
}

window.addEventListener("hashchange", rotear);
rotear();
