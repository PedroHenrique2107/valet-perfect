import type { Client, ClientCategory, Transaction, Vehicle } from "@/types/valet";

export type TransactionSource = "monthly" | "agreement" | "avulso";

export function isMonthlyFeeTransaction(transaction: Transaction) {
  return transaction.receiptNumber.startsWith("CLI-") || transaction.clientCategory === "monthly";
}

export function isAgreementChargeTransaction(transaction: Transaction) {
  return transaction.receiptNumber.startsWith("AGR-") || transaction.clientCategory === "agreement";
}

export function getRevenueCategory(transaction: Transaction, vehicle?: Vehicle): TransactionSource {
  if (isAgreementChargeTransaction(transaction)) {
    return "agreement";
  }

  if (isMonthlyFeeTransaction(transaction)) {
    return "monthly";
  }

  if (vehicle?.recurringClientCategory === "agreement") {
    return "agreement";
  }

  if (vehicle?.recurringClientCategory === "monthly") {
    return "monthly";
  }

  return "avulso";
}

export function resolveTransactionClientName(transaction: Transaction, vehicle?: Vehicle, clients: Client[] = []) {
  if (transaction.clientName?.trim()) {
    return transaction.clientName.trim();
  }

  if (vehicle?.linkedClientId) {
    return clients.find((client) => client.id === vehicle.linkedClientId)?.name ?? vehicle.clientName;
  }

  return vehicle?.clientName?.trim() || "";
}

export function resolveTransactionClientCategory(
  transaction: Transaction,
  vehicle?: Vehicle,
  clients: Client[] = [],
): ClientCategory | undefined {
  if (transaction.clientCategory && transaction.clientCategory !== "avulso") {
    return transaction.clientCategory;
  }

  if (vehicle?.linkedClientId) {
    return clients.find((client) => client.id === vehicle.linkedClientId)?.category;
  }

  return vehicle?.recurringClientCategory;
}

export function getTransactionSourceLabel(
  transaction: Transaction,
  vehicle?: Vehicle,
  clients: Client[] = [],
) {
  const category = getRevenueCategory(transaction, vehicle);
  const clientName = resolveTransactionClientName(transaction, vehicle, clients);

  if (category === "monthly") {
    return clientName ? `Mensalista - ${clientName}` : "Mensalista";
  }

  if (category === "agreement") {
    return clientName ? `Credenciado - ${clientName}` : "Credenciado";
  }

  return "Avulso";
}
