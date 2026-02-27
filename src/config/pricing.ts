export interface AgreementOption {
  id: string;
  label: string;
  discountPercent: number;
}

export const DEFAULT_UNIT_NAME = "Shopping Center Norte";
export const COMPANY_NAME = "Valet Perfect";
export const PARKING_DAILY_RATE = 65;
export const PARKING_TABLE_NAME = "Tabela Padrao - Diaria";

export const AGREEMENT_OPTIONS: AgreementOption[] = [
  { id: "none", label: "Sem convenio", discountPercent: 0 },
  { id: "smart-corp", label: "Smart Compass Corporate", discountPercent: 20 },
  { id: "vip-mall", label: "Convenio Lojistas VIP", discountPercent: 15 },
];

export function getAgreementById(id: string): AgreementOption {
  return AGREEMENT_OPTIONS.find((agreement) => agreement.id === id) ?? AGREEMENT_OPTIONS[0];
}

export function calculateAmountByDuration(
  durationMinutes: number,
  agreementId: string = "none",
): { gross: number; discount: number; net: number } {
  const dailyCap = PARKING_DAILY_RATE;
  const proportional = Math.ceil(Math.max(1, durationMinutes) / 60) * 12;
  const gross = Math.min(proportional, dailyCap);
  const agreement = getAgreementById(agreementId);
  const discount = (gross * agreement.discountPercent) / 100;
  const net = Math.max(0, Number((gross - discount).toFixed(2)));
  return { gross, discount, net };
}
