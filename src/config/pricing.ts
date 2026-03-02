// Define uma interface (tipo/contrato) para representar
// um convênio disponível no estacionamento.
// Interfaces em TypeScript servem para tipagem forte dos objetos.
export interface AgreementOption {
  id: string;  // Identificador único do convênio (usado internamente no sistema)
  label: string; // Nome exibido para o usuário na interface (UI)
  discountPercent: number; // Percentual de desconto aplicado ao valor bruto (%)
}

export const DEFAULT_UNIT_NAME = "Shopping Center Norte"; // Nome padrão da unidade/estabelecimento onde o sistema está operando.
export const COMPANY_NAME = "Valet Perfect"; // Nome da empresa operadora do valet/estacionamento.
export const PARKING_DAILY_RATE = 70; // Valor máximo da diária do estacionamento.
export const PARKING_TABLE_NAME = "Tabela Padrao - Diaria"; // Nome da tabela tarifária aplicada.

// Lista fixa de convênios disponíveis no sistema.
// Cada item segue a estrutura definida pela interface AgreementOption.
export const AGREEMENT_OPTIONS: AgreementOption[] = [
  { id: "none", label: "Sem convenio", discountPercent: 0 }, // Opção padrão: sem convênio (nenhum desconto)
  { id: "smart-corp", label: "Smart Compass Corporate", discountPercent: 50 }, // Convênio corporativo com 20% de desconto
  { id: "vip-mall", label: "Convenio Lojistas VIP", discountPercent: 20 }, // Convênio VIP para lojistas com 15% de desconto
];

// Função responsável por buscar um convênio pelo seu ID.
// Caso não encontre, retorna automaticamente o primeiro item da lista
// (fallback seguro → "Sem convenio").
export function getAgreementById(id: string): AgreementOption { 
  // Procura na lista o convênio cujo id seja igual ao informado. Se não encontrar (undefined/null), retorna o convênio padrão
  return AGREEMENT_OPTIONS.find((agreement) => agreement.id === id) ?? AGREEMENT_OPTIONS[0]; 
}

// Função principal de cálculo do valor do estacionamento.
// Recebe:
// - durationMinutes → tempo total estacionado em minutos
// - agreementId → convênio aplicado (opcional, padrão = "none")
//
// Retorna:
// - gross → valor bruto antes do desconto
// - discount → valor descontado
// - net → valor final a pagar
export function calculateAmountByDuration(
  durationMinutes: number,
  agreementId: string = "none",
): { gross: number; discount: number; net: number } {
  const dailyCap = PARKING_DAILY_RATE;  // Define o limite máximo de cobrança (diária)
  const proportional = Math.ceil(Math.max(1, durationMinutes) / 60) * 15;   // Calcula valor proporcional: 1️⃣ Garante no mínimo 1 minuto (evita divisão por zero) 2️⃣ Divide por 60 para converter minutos → horas 3️⃣ Math.ceil arredonda sempre para cima (hora cheia) 4️⃣ Multiplica por 20 (valor por hora = R$20)
  const gross = Math.min(proportional, dailyCap);   // O valor bruto será o menor entre: valor proporcional calculado e valor máximo da diária
  const agreement = getAgreementById(agreementId); // Busca os dados do convênio selecionado
  const discount = (gross * agreement.discountPercent) / 100; // Calcula o valor do desconto baseado no percentual do convênio
  const net = Math.max(0, Number((gross - discount).toFixed(2))); // Calcula o valor líquido final: subtrai o desconto, limita mínimo em 0 (evita valor negativo) e fixa em 2 casas decimais (padrão monetário)
  return { gross, discount, net }; // Retorna o resumo financeiro da cobrança
}