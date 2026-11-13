/* MorphPeetron - interações leves da interface */
(function () {
  "use strict";

  const body = document.body;

  // ---------------------------------------------------------------------
  // Menu lateral no celular
  // ---------------------------------------------------------------------
  const overlay = document.querySelector("[data-sidebar-overlay]");
  const sidebar = document.getElementById("sidebar");

  function abrirMenu() {
    body.classList.add("sidebar-open");
    if (overlay) overlay.hidden = false;
    if (sidebar) sidebar.setAttribute("aria-hidden", "false");
  }

  function fecharMenu() {
    body.classList.remove("sidebar-open");
    if (overlay) overlay.hidden = true;
    if (sidebar) sidebar.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-sidebar-toggle]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      if (body.classList.contains("sidebar-open")) {
        fecharMenu();
      } else {
        abrirMenu();
      }
    });
  });

  if (overlay) {
    overlay.addEventListener("click", fecharMenu);
  }

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") fecharMenu();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 920) fecharMenu();
  });

  // ---------------------------------------------------------------------
  // Fechar mensagens
  // ---------------------------------------------------------------------
  document.querySelectorAll("[data-flash-close]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const flash = botao.closest(".flash");
      if (flash) flash.remove();
    });
  });

  // ---------------------------------------------------------------------
  // Confirmação antes de excluir
  // ---------------------------------------------------------------------
  document.querySelectorAll("form[data-confirm]").forEach(function (formulario) {
    formulario.addEventListener("submit", function (evento) {
      const mensagem = formulario.getAttribute("data-confirm");
      if (mensagem && !window.confirm(mensagem)) {
        evento.preventDefault();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Mostrar / ocultar senha
  // ---------------------------------------------------------------------
  document.querySelectorAll("[data-password-toggle]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const campo = botao.parentElement.querySelector("input");
      if (!campo) return;

      const visivel = campo.type === "text";
      campo.type = visivel ? "password" : "text";
      botao.classList.toggle("is-visible", !visivel);
      botao.setAttribute("aria-label", visivel ? "Mostrar senha" : "Ocultar senha");
    });
  });

  // ---------------------------------------------------------------------
  // Preencher contas de demonstração
  // ---------------------------------------------------------------------
  document.querySelectorAll("[data-demo-email]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const email = document.getElementById("email");
      const senha = document.getElementById("senha");
      if (!email || !senha) return;

      email.value = botao.getAttribute("data-demo-email") || "";
      senha.value = botao.getAttribute("data-demo-password") || "";
      senha.focus();
    });
  });
})();
