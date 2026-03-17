export interface AgreementOption {
  id: string;
  label: string;
  discountPercent: number;
}

export const DEFAULT_UNIT_NAME = "Shopping Center Norte";
export const COMPANY_NAME = "Valet Perfect";
export const PARKING_DAILY_RATE = 70;
export const PARKING_TABLE_NAME = "Tabela Padrao - Diaria";

export const MONTHLY_STANDARD_RATE = 380;
export const MONTHLY_VIP_MULTIPLIER = 1.4;
export const AGREEMENT_STANDARD_SPOT_RATE = 380;
export const AGREEMENT_VIP_MULTIPLIER = 1.2;

export const AGREEMENT_OPTIONS: AgreementOption[] = [
  { id: "none", label: "Sem convenio", discountPercent: 0 },
  { id: "smart-corp", label: "Smart Compass Corporate", discountPercent: 50 },
  { id: "vip-mall", label: "Convenio Lojistas VIP", discountPercent: 20 },
];

export function getAgreementById(id: string): AgreementOption {
  return AGREEMENT_OPTIONS.find((agreement) => agreement.id === id) ?? AGREEMENT_OPTIONS[0];
}

export function calculateAmountByDuration(
  durationMinutes: number,
  agreementId: string = "none",
): { gross: number; discount: number; net: number } {
  const dailyCap = PARKING_DAILY_RATE;
  const proportional = Math.ceil(Math.max(1, durationMinutes) / 60) * 15;
  const gross = Math.min(proportional, dailyCap);
  const agreement = getAgreementById(agreementId);
  const discount = (gross * agreement.discountPercent) / 100;
  const net = Math.max(0, Number((gross - discount).toFixed(2)));
  return { gross, discount, net };
}

export function calculateMonthlyClientFee(isVip: boolean): number {
  const multiplier = isVip ? MONTHLY_VIP_MULTIPLIER : 1;
  return Number((MONTHLY_STANDARD_RATE * multiplier).toFixed(2));
}

export function calculateAgreementClientFee(totalSpots: number, vipSpots: number): number {
  const safeTotal = Math.max(1, totalSpots);
  const safeVip = Math.min(Math.max(0, vipSpots), safeTotal);
  const regularSpots = safeTotal - safeVip;
  const regularTotal = regularSpots * AGREEMENT_STANDARD_SPOT_RATE;
  const vipTotal = safeVip * AGREEMENT_STANDARD_SPOT_RATE * AGREEMENT_VIP_MULTIPLIER;
  return Number((regularTotal + vipTotal).toFixed(2));
}
