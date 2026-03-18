import { useSyncExternalStore } from "react";

export interface AgreementOption {
  id: string;
  label: string;
  discountPercent: number;
}

export interface ShiftRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxWorkHours: number;
  targetHeadcount: number;
}

export interface OperatingHour {
  dayKey: string;
  label: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface PricingRule {
  id: string;
  label: string;
  upToMinutes: number;
  price: number;
}

export interface AlertSettings {
  occupancyThreshold: number;
  maintenanceThreshold: number;
  vipSlackEnabled: boolean;
  overtimeEnabled: boolean;
}

export interface AppSettings {
  companyName: string;
  unitName: string;
  unitLocation: string;
  pricingTableName: string;
  parkingDailyRate: number;
  monthlyStandardRate: number;
  monthlyVipMultiplier: number;
  agreementStandardSpotRate: number;
  agreementVipMultiplier: number;
  agreementOptions: AgreementOption[];
  operatingHours: OperatingHour[];
  shiftRules: ShiftRule[];
  pricingRules: PricingRule[];
  alerts: AlertSettings;
  entryDefaults: {
    createInspection: boolean;
    prepaidEnabled: boolean;
  };
}

export const APP_SETTINGS_STORAGE_KEY = "valet-perfect.app-settings";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  companyName: "Valet Perfect",
  unitName: "Shopping Center Norte",
  unitLocation: "Sao Paulo, SP",
  pricingTableName: "Tabela Padrao - Diaria",
  parkingDailyRate: 70,
  monthlyStandardRate: 380,
  monthlyVipMultiplier: 1.4,
  agreementStandardSpotRate: 380,
  agreementVipMultiplier: 1.2,
  agreementOptions: [
    { id: "none", label: "Sem convenio", discountPercent: 0 },
    { id: "smart-corp", label: "Smart Compass Corporate", discountPercent: 50 },
    { id: "vip-mall", label: "Convenio Lojistas VIP", discountPercent: 20 },
  ],
  operatingHours: [
    { dayKey: "monday", label: "Segunda", isOpen: true, openTime: "07:00", closeTime: "22:00" },
    { dayKey: "tuesday", label: "Terca", isOpen: true, openTime: "07:00", closeTime: "22:00" },
    { dayKey: "wednesday", label: "Quarta", isOpen: true, openTime: "07:00", closeTime: "22:00" },
    { dayKey: "thursday", label: "Quinta", isOpen: true, openTime: "07:00", closeTime: "22:00" },
    { dayKey: "friday", label: "Sexta", isOpen: true, openTime: "07:00", closeTime: "23:00" },
    { dayKey: "saturday", label: "Sabado", isOpen: true, openTime: "08:00", closeTime: "23:00" },
    { dayKey: "sunday", label: "Domingo", isOpen: true, openTime: "08:00", closeTime: "21:00" },
  ],
  shiftRules: [
    { id: "morning", name: "Manha", startTime: "07:00", endTime: "15:00", maxWorkHours: 8, targetHeadcount: 3 },
    { id: "afternoon", name: "Tarde", startTime: "15:00", endTime: "23:00", maxWorkHours: 8, targetHeadcount: 4 },
    { id: "night", name: "Noite", startTime: "23:00", endTime: "07:00", maxWorkHours: 8, targetHeadcount: 2 },
  ],
  pricingRules: [
    { id: "up-to-60", label: "Ate 1 hora", upToMinutes: 60, price: 15 },
    { id: "up-to-120", label: "Ate 2 horas", upToMinutes: 120, price: 30 },
    { id: "up-to-180", label: "Ate 3 horas", upToMinutes: 180, price: 45 },
    { id: "up-to-240", label: "Ate 4 horas", upToMinutes: 240, price: 60 },
  ],
  alerts: {
    occupancyThreshold: 80,
    maintenanceThreshold: 25,
    vipSlackEnabled: true,
    overtimeEnabled: true,
  },
  entryDefaults: {
    createInspection: false,
    prepaidEnabled: false,
  },
};

const listeners = new Set<() => void>();
let cachedRawSettings: string | null = null;
let cachedSettings: AppSettings = DEFAULT_APP_SETTINGS;

function sanitizeAgreementOption(option: Partial<AgreementOption> | null | undefined, index: number): AgreementOption {
  return {
    id: String(option?.id ?? `agreement-${index + 1}`).trim() || `agreement-${index + 1}`,
    label: String(option?.label ?? `Convenio ${index + 1}`).trim() || `Convenio ${index + 1}`,
    discountPercent: Number.isFinite(Number(option?.discountPercent)) ? Number(option?.discountPercent) : 0,
  };
}

function sanitizeShiftRule(rule: Partial<ShiftRule> | null | undefined, index: number): ShiftRule {
  return {
    id: String(rule?.id ?? `shift-${index + 1}`).trim() || `shift-${index + 1}`,
    name: String(rule?.name ?? `Turno ${index + 1}`).trim() || `Turno ${index + 1}`,
    startTime: String(rule?.startTime ?? "08:00"),
    endTime: String(rule?.endTime ?? "17:00"),
    maxWorkHours: Number.isFinite(Number(rule?.maxWorkHours)) ? Number(rule?.maxWorkHours) : 8,
    targetHeadcount: Number.isFinite(Number(rule?.targetHeadcount)) ? Number(rule?.targetHeadcount) : 1,
  };
}

function sanitizeOperatingHour(hour: Partial<OperatingHour> | null | undefined, index: number): OperatingHour {
  const fallback = DEFAULT_APP_SETTINGS.operatingHours[index] ?? DEFAULT_APP_SETTINGS.operatingHours[0];
  return {
    dayKey: String(hour?.dayKey ?? fallback.dayKey),
    label: String(hour?.label ?? fallback.label),
    isOpen: Boolean(hour?.isOpen ?? fallback.isOpen),
    openTime: String(hour?.openTime ?? fallback.openTime),
    closeTime: String(hour?.closeTime ?? fallback.closeTime),
  };
}

function sanitizePricingRule(rule: Partial<PricingRule> | null | undefined, index: number): PricingRule {
  return {
    id: String(rule?.id ?? `pricing-${index + 1}`).trim() || `pricing-${index + 1}`,
    label: String(rule?.label ?? `Faixa ${index + 1}`).trim() || `Faixa ${index + 1}`,
    upToMinutes: Number.isFinite(Number(rule?.upToMinutes)) ? Number(rule?.upToMinutes) : (index + 1) * 60,
    price: Number.isFinite(Number(rule?.price)) ? Number(rule?.price) : 0,
  };
}

function sanitizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const agreementOptions = Array.isArray(raw?.agreementOptions) && raw?.agreementOptions.length > 0
    ? raw.agreementOptions.map((option, index) => sanitizeAgreementOption(option, index))
    : DEFAULT_APP_SETTINGS.agreementOptions;
  const operatingHours = Array.isArray(raw?.operatingHours) && raw?.operatingHours.length > 0
    ? raw.operatingHours.map((hour, index) => sanitizeOperatingHour(hour, index))
    : DEFAULT_APP_SETTINGS.operatingHours;
  const shiftRules = Array.isArray(raw?.shiftRules) && raw?.shiftRules.length > 0
    ? raw.shiftRules.map((rule, index) => sanitizeShiftRule(rule, index))
    : DEFAULT_APP_SETTINGS.shiftRules;
  const pricingRules = Array.isArray(raw?.pricingRules) && raw?.pricingRules.length > 0
    ? raw.pricingRules.map((rule, index) => sanitizePricingRule(rule, index)).sort((left, right) => left.upToMinutes - right.upToMinutes)
    : DEFAULT_APP_SETTINGS.pricingRules;

  return {
    companyName: String(raw?.companyName ?? DEFAULT_APP_SETTINGS.companyName).trim() || DEFAULT_APP_SETTINGS.companyName,
    unitName: String(raw?.unitName ?? DEFAULT_APP_SETTINGS.unitName).trim() || DEFAULT_APP_SETTINGS.unitName,
    unitLocation: String(raw?.unitLocation ?? DEFAULT_APP_SETTINGS.unitLocation).trim() || DEFAULT_APP_SETTINGS.unitLocation,
    pricingTableName:
      String(raw?.pricingTableName ?? DEFAULT_APP_SETTINGS.pricingTableName).trim() || DEFAULT_APP_SETTINGS.pricingTableName,
    parkingDailyRate: Number.isFinite(Number(raw?.parkingDailyRate))
      ? Number(raw?.parkingDailyRate)
      : DEFAULT_APP_SETTINGS.parkingDailyRate,
    monthlyStandardRate: Number.isFinite(Number(raw?.monthlyStandardRate))
      ? Number(raw?.monthlyStandardRate)
      : DEFAULT_APP_SETTINGS.monthlyStandardRate,
    monthlyVipMultiplier: Number.isFinite(Number(raw?.monthlyVipMultiplier))
      ? Number(raw?.monthlyVipMultiplier)
      : DEFAULT_APP_SETTINGS.monthlyVipMultiplier,
    agreementStandardSpotRate: Number.isFinite(Number(raw?.agreementStandardSpotRate))
      ? Number(raw?.agreementStandardSpotRate)
      : DEFAULT_APP_SETTINGS.agreementStandardSpotRate,
    agreementVipMultiplier: Number.isFinite(Number(raw?.agreementVipMultiplier))
      ? Number(raw?.agreementVipMultiplier)
      : DEFAULT_APP_SETTINGS.agreementVipMultiplier,
    agreementOptions,
    operatingHours,
    shiftRules,
    pricingRules,
    alerts: {
      occupancyThreshold: Number.isFinite(Number(raw?.alerts?.occupancyThreshold))
        ? Number(raw?.alerts?.occupancyThreshold)
        : DEFAULT_APP_SETTINGS.alerts.occupancyThreshold,
      maintenanceThreshold: Number.isFinite(Number(raw?.alerts?.maintenanceThreshold))
        ? Number(raw?.alerts?.maintenanceThreshold)
        : DEFAULT_APP_SETTINGS.alerts.maintenanceThreshold,
      vipSlackEnabled: Boolean(raw?.alerts?.vipSlackEnabled ?? DEFAULT_APP_SETTINGS.alerts.vipSlackEnabled),
      overtimeEnabled: Boolean(raw?.alerts?.overtimeEnabled ?? DEFAULT_APP_SETTINGS.alerts.overtimeEnabled),
    },
    entryDefaults: {
      createInspection: Boolean(raw?.entryDefaults?.createInspection ?? DEFAULT_APP_SETTINGS.entryDefaults.createInspection),
      prepaidEnabled: Boolean(raw?.entryDefaults?.prepaidEnabled ?? DEFAULT_APP_SETTINGS.entryDefaults.prepaidEnabled),
    },
  };
}

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  const stored = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
  if (!stored) {
    cachedRawSettings = null;
    cachedSettings = DEFAULT_APP_SETTINGS;
    return DEFAULT_APP_SETTINGS;
  }

  if (stored === cachedRawSettings) {
    return cachedSettings;
  }

  try {
    cachedRawSettings = stored;
    cachedSettings = sanitizeSettings(JSON.parse(stored) as Partial<AppSettings>);
    return cachedSettings;
  } catch {
    cachedRawSettings = null;
    cachedSettings = DEFAULT_APP_SETTINGS;
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(nextSettings: AppSettings) {
  if (typeof window === "undefined") {
    return;
  }

  cachedSettings = sanitizeSettings(nextSettings);
  cachedRawSettings = JSON.stringify(cachedSettings);
  window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, cachedRawSettings);
  listeners.forEach((listener) => listener());
}

export function resetAppSettings() {
  saveAppSettings(DEFAULT_APP_SETTINGS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === APP_SETTINGS_STORAGE_KEY) {
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function useAppSettings() {
  return useSyncExternalStore(subscribe, getAppSettings, () => DEFAULT_APP_SETTINGS);
}
