const STANDARD_PLATE_REGEX = /^[A-Z]{3}-\d{4}$/;
const MERCOSUL_PLATE_REGEX = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function normalizePlateLookup(value: string): string {
  return value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

export function isValidPlate(value: string): boolean {
  const formatted = value.trim().toUpperCase();
  return STANDARD_PLATE_REGEX.test(formatted) || MERCOSUL_PLATE_REGEX.test(formatted);
}

export function formatPlateInput(value: string): string {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
  if (raw.length === 0) return "";

  const firstThree = raw.slice(0, 3).replace(/[^A-Z]/g, "");
  if (raw.length <= 3) {
    return firstThree;
  }

  const remaining = raw.slice(3);
  const mercosulPattern = [/\d/, /[A-Z]/, /\d/, /\d/];
  let mercosul = firstThree;
  let mercosulValid = firstThree.length === 3;

  for (let index = 0; index < remaining.length && index < mercosulPattern.length; index += 1) {
    const char = remaining[index];
    if (!mercosulPattern[index].test(char)) {
      mercosulValid = false;
      break;
    }
    mercosul += char;
  }

  if (mercosulValid && remaining.length > 0) {
    return mercosul;
  }

  const standardDigits = remaining.replace(/\D/g, "").slice(0, 4);
  return standardDigits.length > 0 ? `${firstThree}-${standardDigits}` : firstThree;
}

export function normalizePlate(value: string): string {
  const formatted = formatPlateInput(value);
  if (isValidPlate(formatted)) {
    return formatted;
  }

  return formatted;
}
