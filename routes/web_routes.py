"""Rotas HTML: login, cadastro e telas de gestão do MorphPeetron."""
from datetime import date
from math import ceil

from flask import (
    Blueprint,
    abort,
    flash,
    g,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

from daos import ClienteDAO, EquipamentoDAO, ObraDAO, UsuarioDAO
from database import IntegrityError
from models import Cliente, Equipamento, ErroDeValidacao, Obra, Usuario
from utils.auth import login_required
from utils.csrf import csrf_protegido

web_bp = Blueprint("web", __name__)

usuario_dao = UsuarioDAO()
cliente_dao = ClienteDAO()
obra_dao = ObraDAO()
equipamento_dao = EquipamentoDAO()


# ---------------------------------------------------------------------------
# Contexto e permissões
# ---------------------------------------------------------------------------
@web_bp.before_request
def preparar_requisicao():
    csrf_protegido()

    usuario_id = session.get("usuario_id")
    g.usuario = usuario_dao.buscar_por_id(usuario_id) if usuario_id else None
    if usuario_id and g.usuario is None:
        session.clear()


def _pode_ver_obra(obra):
    """Engenheiros veem as próprias obras; admin e demais perfis veem todas."""
    if g.usuario.eh_admin() or not g.usuario.eh_engenheiro():
        return True
    return obra.engenheiro_id == g.usuario.id


def _pode_editar_obra(obra):
    return g.usuario.eh_admin() or obra.engenheiro_id == g.usuario.id


def _visible_obras():
    filtro = g.usuario.id if g.usuario.eh_engenheiro() else None
    return obra_dao.listar_todos(filtro)


def _destino_seguro(destino, padrao):
    """Evita redirecionamento aberto após o login."""
    if destino and destino.startswith("/") and not destino.startswith("//"):
        return destino
    return padrao


def _paginar(itens, pagina, por_pagina=6):
    total = len(itens)
    paginas = max(1, ceil(total / por_pagina))
    pagina = min(max(1, pagina), paginas)
    inicio = (pagina - 1) * por_pagina
    return itens[inicio : inicio + por_pagina], pagina, paginas, total


def _contar_obras_por_cliente():
    contagem = {}
    for obra in obra_dao.listar_todos():
        if obra.cliente_id:
            contagem[obra.cliente_id] = contagem.get(obra.cliente_id, 0) + 1
    return contagem


def _contar_obras_por_engenheiro():
    contagem = {}
    for obra in obra_dao.listar_todos():
        contagem[obra.engenheiro_id] = contagem.get(obra.engenheiro_id, 0) + 1
    return contagem


# ---------------------------------------------------------------------------
# Autenticação
# ---------------------------------------------------------------------------
@web_bp.route("/login", methods=["GET", "POST"])
def login():
    if g.usuario:
        return redirect(url_for("web.dashboard"))

    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        senha = request.form.get("senha") or ""
        usuario = usuario_dao.buscar_por_email(email)

        if usuario is None or not usuario.verificar_senha(senha):
            flash("E-mail ou senha incorretos. Confira os dados e tente novamente.", "error")
            return render_template("login.html", email=email), 401

        session.clear()
        session["usuario_id"] = usuario.id
        flash(f"Que bom ter você por aqui, {usuario.nome.split()[0]}!", "success")
        destino = _destino_seguro(
            request.form.get("next") or request.args.get("next"),
            url_for("web.dashboard"),
        )
        return redirect(destino)

    return render_template("login.html")


@web_bp.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    if g.usuario:
        return redirect(url_for("web.dashboard"))

    form = {}
    if request.method == "POST":
        form = request.form.to_dict()
        usuario = Usuario(
            nome=form.get("nome"),
            email=form.get("email"),
            profissao=form.get("profissao"),
        )
        erros = usuario.validar() + Usuario.validar_senha(form.get("senha"))
        if form.get("senha") != form.get("confirmar_senha"):
            erros.append("As senhas não conferem.")

        if erros:
            return (
                render_template(
                    "cadastro.html",
                    form=form,
                    erros=erros,
                    profissoes=Usuario.PROFISSOES_VALIDAS,
                ),
                400,
            )

        usuario.definir_senha(form["senha"])
        try:
            usuario_dao.inserir(usuario)
        except IntegrityError:
            return (
                render_template(
                    "cadastro.html",
                    form=form,
                    erros=["Este e-mail já está cadastrado. Tente fazer login."],
                    profissoes=Usuario.PROFISSOES_VALIDAS,
                ),
                409,
            )

        session.clear()
        session["usuario_id"] = usuario.id
        flash("Conta criada com sucesso. Bem-vindo ao MorphPeetron!", "success")
        return redirect(url_for("web.dashboard"))

    return render_template("cadastro.html", form=form, profissoes=Usuario.PROFISSOES_VALIDAS)


@web_bp.post("/logout")
@login_required
def logout():
    session.clear()
    flash("Você saiu da sua conta.", "info")
    return redirect(url_for("web.login"))


# ---------------------------------------------------------------------------
# Visão geral
# ---------------------------------------------------------------------------
@web_bp.get("/")
@login_required
def dashboard():
    obras = _visible_obras()
    clientes = cliente_dao.listar_todos()
    equipamentos = equipamento_dao.listar_todos()

    ativos = [e for e in equipamentos if e.status == Equipamento.STATUS_ATIVO]
    manutencao = [
        e for e in equipamentos if e.status == Equipamento.STATUS_EM_MANUTENCAO
    ]

    hoje = date.today()
    obras_andamento = sum(
        1
        for obra in obras
        if (not obra.data_fim or obra.data_fim >= hoje)
        and (not obra.data_inicio or obra.data_inicio <= hoje)
    )
    obras_planejadas = sum(
        1 for obra in obras if obra.data_inicio and obra.data_inicio > hoje
    )

    return render_template(
        "dashboard.html",
        obras=obras,
        obras_recentes=obras[:4],
        obras_andamento=obras_andamento,
        obras_planejadas=obras_planejadas,
        total_clientes=len(clientes),
        total_equipamentos=len(equipamentos),
        equipamentos_ativos=ativos,
        equipamentos_manutencao=manutencao,
    )


# ---------------------------------------------------------------------------
# Obras
# ---------------------------------------------------------------------------
@web_bp.get("/obras")
@login_required
def obras():
    termo = (request.args.get("q") or "").strip()
    pagina = request.args.get("pagina", 1, type=int) or 1

    lista = _visible_obras()
    if termo:
        busca = termo.lower()
        lista = [
            obra
            for obra in lista
            if busca in obra.nome.lower()
            or busca in (obra.cliente_nome or "").lower()
            or busca in (obra.engenheiro_nome or "").lower()
        ]

    itens, pagina, paginas, total = _paginar(lista, pagina)
    return render_template(
        "obras.html",
        obras=itens,
        q=termo,
        pagina=pagina,
        paginas=paginas,
        total=total,
    )


def _obra_do_form(form):
    return Obra(
        nome=form.get("nome"),
        descricao=form.get("descricao"),
        data_inicio=form.get("data_inicio"),
        data_fim=form.get("data_fim"),
        engenheiro_id=form.get("engenheiro_id"),
        cliente_id=form.get("cliente_id"),
    )


def _validar_referencias_obra(obra):
    erros = []

    if obra.engenheiro_id is None:
        erros.append("Selecione o engenheiro responsável.")
    else:
        engenheiro = usuario_dao.buscar_por_id(obra.engenheiro_id)
        if engenheiro is None or not engenheiro.eh_engenheiro():
            erros.append("O responsável precisa ser um usuário com profissão Engenheiro.")

    if obra.cliente_id is not None and cliente_dao.buscar_por_id(obra.cliente_id) is None:
        erros.append("O cliente selecionado não foi encontrado.")

    return erros


@web_bp.route("/obras/nova", methods=["GET", "POST"])
@login_required
def nova_obra():
    engenheiros = usuario_dao.listar_por_profissao(Usuario.PROFISSAO_ENGENHEIRO)
    clientes = cliente_dao.listar_todos()
    form = {"engenheiro_id": g.usuario.id if g.usuario.eh_engenheiro() else ""}

    if request.method == "POST":
        form = request.form.to_dict()
        if g.usuario.eh_engenheiro():
            form["engenheiro_id"] = str(g.usuario.id)

        try:
            obra = _obra_do_form(form)
            erros = obra.validar() + _validar_referencias_obra(obra)
        except ErroDeValidacao as exc:
            erros = [str(exc)]

        if erros:
            return (
                render_template(
                    "obra_form.html",
                    modo="nova",
                    form=form,
                    erros=erros,
                    engenheiros=engenheiros,
                    clientes=clientes,
                ),
                400,
            )

        obra_dao.inserir(obra)
        flash("Obra criada com sucesso.", "success")
        return redirect(url_for("web.obra_detalhe", obra_id=obra.id))

    return render_template(
        "obra_form.html",
        modo="nova",
        form=form,
        erros=[],
        engenheiros=engenheiros,
        clientes=clientes,
    )


@web_bp.get("/obras/<int:obra_id>")
@login_required
def obra_detalhe(obra_id):
    obra = obra_dao.buscar_por_id(obra_id)
    if obra is None:
        abort(404)
    if not _pode_ver_obra(obra):
        abort(403)

    outras_do_cliente = []
    if obra.cliente_id:
        outras_do_cliente = [
            outra
            for outra in _visible_obras()
            if outra.cliente_id == obra.cliente_id and outra.id != obra.id
        ]

    progresso = None
    if obra.data_inicio and obra.data_fim:
        total = (obra.data_fim - obra.data_inicio).days
        if total > 0:
            passados = (date.today() - obra.data_inicio).days
            progresso = max(0, min(100, round(passados / total * 100)))

    return render_template(
        "obra_detalhe.html",
        obra=obra,
        outras_do_cliente=outras_do_cliente[:4],
        progresso=progresso,
        pode_editar=_pode_editar_obra(obra),
    )


@web_bp.route("/obras/<int:obra_id>/editar", methods=["GET", "POST"])
@login_required
def editar_obra(obra_id):
    obra = obra_dao.buscar_por_id(obra_id)
    if obra is None:
        abort(404)
    if not _pode_editar_obra(obra):
        abort(403)

    engenheiros = usuario_dao.listar_por_profissao(Usuario.PROFISSAO_ENGENHEIRO)
    clientes = cliente_dao.listar_todos()
    form = obra.to_dict()

    if request.method == "POST":
        form = request.form.to_dict()
        if g.usuario.eh_engenheiro():
            form["engenheiro_id"] = str(g.usuario.id)

        try:
            atualizada = _obra_do_form(form)
            erros = atualizada.validar() + _validar_referencias_obra(atualizada)
        except ErroDeValidacao as exc:
            erros = [str(exc)]

        if erros:
            return (
                render_template(
                    "obra_form.html",
                    modo="editar",
                    obra=obra,
                    form=form,
                    erros=erros,
                    engenheiros=engenheiros,
                    clientes=clientes,
                ),
                400,
            )

        atualizada.id = obra_id
        obra_dao.atualizar(atualizada)
        flash("Obra atualizada com sucesso.", "success")
        return redirect(url_for("web.obra_detalhe", obra_id=obra_id))

    return render_template(
        "obra_form.html",
        modo="editar",
        obra=obra,
        form=form,
        erros=[],
        engenheiros=engenheiros,
        clientes=clientes,
    )


@web_bp.post("/obras/<int:obra_id>/excluir")
@login_required
def excluir_obra(obra_id):
    obra = obra_dao.buscar_por_id(obra_id)
    if obra is None:
        abort(404)
    if not _pode_editar_obra(obra):
        abort(403)

    obra_dao.deletar(obra_id)
    flash("Obra excluída.", "success")
    return redirect(url_for("web.obras"))


# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------
@web_bp.get("/clientes")
@login_required
def clientes():
    termo = (request.args.get("q") or "").strip()
    lista = cliente_dao.listar_todos()

    if termo:
        busca = termo.lower()
        lista = [
            cliente
            for cliente in lista
            if busca in cliente.nome.lower()
            or busca in (cliente.email or "").lower()
            or busca in (cliente.documento or "").lower()
            or busca in (cliente.telefone or "").lower()
        ]

    return render_template(
        "clientes.html",
        clientes=lista,
        q=termo,
        obras_por_cliente=_contar_obras_por_cliente(),
    )


def _cliente_do_form(form):
    return Cliente(
        nome=form.get("nome"),
        email=form.get("email"),
        telefone=form.get("telefone"),
        documento=form.get("documento"),
        endereco=form.get("endereco"),
    )


@web_bp.route("/clientes/novo", methods=["GET", "POST"])
@login_required
def novo_cliente():
    form = {}
    if request.method == "POST":
        form = request.form.to_dict()
        cliente = _cliente_do_form(form)
        erros = cliente.validar()
        if not erros:
            try:
                cliente_dao.inserir(cliente)
            except IntegrityError:
                erros.append("Já existe um cliente com este documento.")

        if erros:
            return render_template("cliente_form.html", modo="novo", form=form, erros=erros), 400

        flash("Cliente cadastrado com sucesso.", "success")
        return redirect(url_for("web.clientes"))

    return render_template("cliente_form.html", modo="novo", form=form, erros=[])


@web_bp.route("/clientes/<int:cliente_id>/editar", methods=["GET", "POST"])
@login_required
def editar_cliente(cliente_id):
    cliente = cliente_dao.buscar_por_id(cliente_id)
    if cliente is None:
        abort(404)

    form = cliente.to_dict()
    if request.method == "POST":
        form = request.form.to_dict()
        atualizado = _cliente_do_form(form)
        atualizado.id = cliente_id
        erros = atualizado.validar()
        if not erros:
            try:
                cliente_dao.atualizar(atualizado)
            except IntegrityError:
                erros.append("Já existe um cliente com este documento.")

        if erros:
            return (
                render_template(
                    "cliente_form.html", modo="editar", cliente=cliente, form=form, erros=erros
                ),
                400,
            )

        flash("Cliente atualizado com sucesso.", "success")
        return redirect(url_for("web.clientes"))

    return render_template(
        "cliente_form.html", modo="editar", cliente=cliente, form=form, erros=[]
    )


@web_bp.post("/clientes/<int:cliente_id>/excluir")
@login_required
def excluir_cliente(cliente_id):
    if cliente_dao.buscar_por_id(cliente_id) is None:
        abort(404)
    cliente_dao.deletar(cliente_id)
    flash("Cliente excluído. As obras dele ficaram sem cliente.", "success")
    return redirect(url_for("web.clientes"))


# ---------------------------------------------------------------------------
# Equipamentos
# ---------------------------------------------------------------------------
@web_bp.get("/equipamentos")
@login_required
def equipamentos():
    status = request.args.get("status", "todos")
    if status not in ("todos", *Equipamento.STATUS_VALIDOS):
        status = "todos"

    filtro = None if status == "todos" else status
    lista = equipamento_dao.listar_todos(filtro)

    todos = equipamento_dao.listar_todos()
    contagens = {
        "todos": len(todos),
        Equipamento.STATUS_ATIVO: sum(
            1 for e in todos if e.status == Equipamento.STATUS_ATIVO
        ),
        Equipamento.STATUS_EM_MANUTENCAO: sum(
            1 for e in todos if e.status == Equipamento.STATUS_EM_MANUTENCAO
        ),
    }

    return render_template(
        "equipamentos.html",
        equipamentos=lista,
        status=status,
        contagens=contagens,
        responsaveis={u.id: u for u in usuario_dao.listar_todos()},
    )


def _equipamento_do_form(form):
    return Equipamento(
        nome=form.get("nome"),
        status=form.get("status"),
        data_ultima_manutencao=form.get("data_ultima_manutencao"),
        responsavel_id=form.get("responsavel_id"),
    )


def _validar_responsavel(equipamento):
    if equipamento.responsavel_id is None:
        return []
    if usuario_dao.buscar_por_id(equipamento.responsavel_id) is None:
        return ["O responsável selecionado não foi encontrado."]
    return []


@web_bp.route("/equipamentos/novo", methods=["GET", "POST"])
@login_required
def novo_equipamento():
    usuarios = usuario_dao.listar_todos()
    form = {}
    if request.method == "POST":
        form = request.form.to_dict()
        try:
            equipamento = _equipamento_do_form(form)
            erros = equipamento.validar() + _validar_responsavel(equipamento)
        except ErroDeValidacao as exc:
            erros = [str(exc)]

        if erros:
            return (
                render_template(
                    "equipamento_form.html",
                    modo="novo",
                    form=form,
                    erros=erros,
                    usuarios=usuarios,
                ),
                400,
            )

        equipamento_dao.inserir(equipamento)
        flash("Equipamento cadastrado com sucesso.", "success")
        return redirect(url_for("web.equipamentos"))

    return render_template(
        "equipamento_form.html", modo="novo", form=form, erros=[], usuarios=usuarios
    )


@web_bp.route("/equipamentos/<int:equipamento_id>/editar", methods=["GET", "POST"])
@login_required
def editar_equipamento(equipamento_id):
    equipamento = equipamento_dao.buscar_por_id(equipamento_id)
    if equipamento is None:
        abort(404)

    usuarios = usuario_dao.listar_todos()
    form = equipamento.to_dict()

    if request.method == "POST":
        form = request.form.to_dict()
        try:
            atualizado = _equipamento_do_form(form)
            atualizado.id = equipamento_id
            erros = atualizado.validar() + _validar_responsavel(atualizado)
        except ErroDeValidacao as exc:
            erros = [str(exc)]

        if erros:
            return (
                render_template(
                    "equipamento_form.html",
                    modo="editar",
                    equipamento=equipamento,
                    form=form,
                    erros=erros,
                    usuarios=usuarios,
                ),
                400,
            )

        equipamento_dao.atualizar(atualizado)
        flash("Equipamento atualizado com sucesso.", "success")
        return redirect(url_for("web.equipamentos"))

    return render_template(
        "equipamento_form.html",
        modo="editar",
        equipamento=equipamento,
        form=form,
        erros=[],
        usuarios=usuarios,
    )


@web_bp.post("/equipamentos/<int:equipamento_id>/alternar-status")
@login_required
def alternar_status_equipamento(equipamento_id):
    equipamento = equipamento_dao.buscar_por_id(equipamento_id)
    if equipamento is None:
        abort(404)

    if equipamento.status == Equipamento.STATUS_ATIVO:
        equipamento.alterar_status(Equipamento.STATUS_EM_MANUTENCAO, date.today())
        mensagem = "Equipamento enviado para manutenção."
    else:
        equipamento.alterar_status(Equipamento.STATUS_ATIVO)
        mensagem = "Equipamento marcado como ativo."

    equipamento_dao.atualizar_status(
        equipamento.id, equipamento.status, equipamento.data_ultima_manutencao
    )
    flash(mensagem, "success")
    return redirect(url_for("web.equipamentos"))


@web_bp.post("/equipamentos/<int:equipamento_id>/excluir")
@login_required
def excluir_equipamento(equipamento_id):
    if equipamento_dao.buscar_por_id(equipamento_id) is None:
        abort(404)
    equipamento_dao.deletar(equipamento_id)
    flash("Equipamento excluído.", "success")
    return redirect(url_for("web.equipamentos"))


# ---------------------------------------------------------------------------
# Equipe e perfil
# ---------------------------------------------------------------------------
@web_bp.get("/engenheiros")
@login_required
def engenheiros():
    lista = usuario_dao.listar_por_profissao(Usuario.PROFISSAO_ENGENHEIRO)
    return render_template(
        "engenheiros.html",
        engenheiros=lista,
        obras_por_engenheiro=_contar_obras_por_engenheiro(),
    )


@web_bp.get("/perfil")
@login_required
def perfil():
    return render_template("perfil.html", usuario=g.usuario)
