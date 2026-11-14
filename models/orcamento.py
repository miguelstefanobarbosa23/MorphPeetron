"""Modelo Orcamento: orçamento de obra (material + mão de obra) com status de aprovação."""
from .base_model import BaseModel, ErroDeValidacao


class Orcamento(BaseModel):
    """Orçamento emitido por um engenheiro. O total é SEMPRE calculado, nunca digitado."""

    STATUS_RASCUNHO = "Rascunho"
    STATUS_ENVIADO = "Enviado"
    STATUS_APROVADO = "Aprovado"
    STATUS_REJEITADO = "Rejeitado"
    STATUS_VALIDOS = (STATUS_RASCUNHO, STATUS_ENVIADO, STATUS_APROVADO, STATUS_REJEITADO)

    def __init__(self, nome_cliente, engenheiro_id, valor_material=0.0, valor_mao_obra=0.0,
                 status=STATUS_RASCUNHO, descricao=None, id=None, data_criacao=None,
                 engenheiro_nome=None):
        self.id = id
        self.nome_cliente = self.normalizar_texto(nome_cliente) or ""
        self.descricao = self.normalizar_texto(descricao)
        self.engenheiro_id = self.converter_inteiro(engenheiro_id, "engenheiro_id")
        self.valor_material = self._converter_moeda(valor_material, "valor_material")
        self.valor_mao_obra = self._converter_moeda(valor_mao_obra, "valor_mao_obra")
        self.status = self.normalizar_texto(status) or self.STATUS_RASCUNHO
        self.data_criacao = data_criacao
        # Somente leitura: preenchido pelo JOIN nas consultas (não é coluna de 'orcamentos')
        self.engenheiro_nome = engenheiro_nome

    # ------------------------------ Conversão ------------------------------
    @staticmethod
    def _converter_moeda(valor, campo="valor"):
        """Aceita número ou texto ('1.250,90', 'R$ 1.250,90') e devolve float com 2 casas."""
        if valor in (None, ""):
            return 0.0
        if isinstance(valor, bool):
            raise ErroDeValidacao(f"'{campo}' deve ser um valor monetário.")
        if isinstance(valor, str):
            texto = valor.strip().replace("R$", "").replace(" ", "")
            # formato brasileiro 1.250,90 -> 1250.90 (sem vírgula já vem pronto para float)
            if "," in texto:
                texto = texto.replace(".", "").replace(",", ".")
            valor = texto
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            raise ErroDeValidacao(f"'{campo}' deve ser um valor monetário válido.") from None
        if numero < 0:
            raise ErroDeValidacao(f"'{campo}' não pode ser negativo.")
        return round(numero, 2)

    # ------------------------------- Regras --------------------------------
    @property
    def valor_total(self):
        """Regra de negócio: total = material + mão de obra (arredondado a 2 casas)."""
        return round(self.valor_material + self.valor_mao_obra, 2)

    def to_dict(self):
        """Serialização padrão + o campo calculado 'valor_total'."""
        dados = super().to_dict()
        dados["valor_total"] = self.valor_total
        return dados

    def validar(self):
        erros = []
        if len(self.nome_cliente) < 3:
            erros.append("O nome do cliente do orçamento deve ter pelo menos 3 caracteres.")
        if self.engenheiro_id is None:
            erros.append("'engenheiro_id' é obrigatório.")
        if self.status not in self.STATUS_VALIDOS:
            erros.append("Status inválido. Use: " + ", ".join(self.STATUS_VALIDOS) + ".")
        return erros
