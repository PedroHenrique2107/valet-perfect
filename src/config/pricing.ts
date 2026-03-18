import { DEFAULT_APP_SETTINGS, getAppSettings, type AgreementOption } from "@/lib/app-settings";

export type { AgreementOption } from "@/lib/app-settings";

export const DEFAULT_UNIT_NAME = DEFAULT_APP_SETTINGS.unitName;
export const COMPANY_NAME = DEFAULT_APP_SETTINGS.companyName;
export const PARKING_DAILY_RATE = DEFAULT_APP_SETTINGS.parkingDailyRate;
export const PARKING_TABLE_NAME = DEFAULT_APP_SETTINGS.pricingTableName;

export const MONTHLY_STANDARD_RATE = DEFAULT_APP_SETTINGS.monthlyStandardRate;
export const MONTHLY_VIP_MULTIPLIER = DEFAULT_APP_SETTINGS.monthlyVipMultiplier;
export const AGREEMENT_STANDARD_SPOT_RATE = DEFAULT_APP_SETTINGS.agreementStandardSpotRate;
export const AGREEMENT_VIP_MULTIPLIER = DEFAULT_APP_SETTINGS.agreementVipMultiplier;

export const AGREEMENT_OPTIONS: AgreementOption[] = DEFAULT_APP_SETTINGS.agreementOptions;

export function getAgreementById(id: string): AgreementOption {
  const { agreementOptions } = getAppSettings();
  return agreementOptions.find((agreement) => agreement.id === id) ?? agreementOptions[0];
}

export function calculateAmountByDuration(
  durationMinutes: number,
  agreementId: string = "none",
): { gross: number; discount: number; net: number } {
  const { parkingDailyRate, pricingRules } = getAppSettings();
  const dailyCap = parkingDailyRate;
  const applicableRule = [...pricingRules]
    .sort((left, right) => left.upToMinutes - right.upToMinutes)
    .find((rule) => Math.max(1, durationMinutes) <= rule.upToMinutes);
  const fallback = Math.ceil(Math.max(1, durationMinutes) / 60) * 15;
  const gross = Math.min(applicableRule?.price ?? fallback, dailyCap);
  const agreement = getAgreementById(agreementId);
  const discount = (gross * agreement.discountPercent) / 100;
  const net = Math.max(0, Number((gross - discount).toFixed(2)));
  return { gross, discount, net };
}

export function calculateMonthlyClientFee(isVip: boolean): number {
  const { monthlyStandardRate, monthlyVipMultiplier } = getAppSettings();
  return Number((monthlyStandardRate * (isVip ? monthlyVipMultiplier : 1)).toFixed(2));
}

export function calculateAgreementClientFee(totalSpots: number, vipSpots: number): number {
  const { agreementStandardSpotRate, agreementVipMultiplier } = getAppSettings();
  const safeTotal = Math.max(1, totalSpots);
  const safeVip = Math.min(Math.max(0, vipSpots), safeTotal);
  const regularSpots = safeTotal - safeVip;
  const regularTotal = regularSpots * agreementStandardSpotRate;
  const vipTotal = safeVip * agreementStandardSpotRate * agreementVipMultiplier;
  return Number((regularTotal + vipTotal).toFixed(2));
}
