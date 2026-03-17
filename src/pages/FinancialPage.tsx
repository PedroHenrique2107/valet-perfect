import {
  ArrowRightLeft,
  Calendar,
  CircleHelp,
  CreditCard,
  DollarSign,
  Download,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { VehicleMovementChart } from "@/components/dashboard/VehicleMovementChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDashboardStatsQuery,
  useTransactionsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import { formatCurrencyBRL, formatDateTimeBR, formatDurationMinutes } from "@/lib/format";
import type { PaymentMethod, PaymentStatus, RevenueData, Transaction, Vehicle } from "@/types/valet";

type PeriodPreset = "today" | "7d" | "1m" | "6m" | "1y" | "custom";
type PaymentFilter = PaymentMethod | "all";
type StatusFilter = PaymentStatus | "all";

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "1m", label: "Ultimo mes" },
  { value: "6m", label: "Ultimos 6 meses" },
  { value: "1y", label: "Ultimo 1 ano" },
  { value: "custom", label: "Personalizado" },
];

const paymentOptions: Array<{ value: PaymentFilter; label: string }> = [
  { value: "all", label: "Todos pagamentos" },
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Credito" },
  { value: "debit", label: "Debito" },
  { value: "cash", label: "Dinheiro" },
  { value: "monthly", label: "Mensalista" },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos status" },
  { value: "completed", label: "Concluido" },
  { value: "pending", label: "Pendente" },
  { value: "failed", label: "Falhou" },
  { value: "refunded", label: "Estornado" },
];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit: "Credito",
  debit: "Debito",
  cash: "Dinheiro",
  monthly: "Mensalista",
};

const paymentMethodColors: Record<PaymentMethod, string> = {
  pix: "bg-primary",
  credit: "bg-info",
  debit: "bg-accent",
  cash: "bg-warning",
  monthly: "bg-secondary",
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "status-busy" },
  completed: { label: "Concluido", className: "status-available" },
  failed: { label: "Falhou", className: "status-occupied" },
  refunded: { label: "Estornado", className: "bg-muted text-muted-foreground" },
};

function isMonthlyFeeTransaction(transaction: Transaction) {
  return transaction.receiptNumber.startsWith("CLI-");
}

function isAgreementChargeTransaction(transaction: Transaction) {
  return transaction.receiptNumber.startsWith("AGR-");
}

function getRevenueCategory(transaction: Transaction, vehicle?: Vehicle) {
  if (isAgreementChargeTransaction(transaction)) {
    return "agreement" as const;
  }

  if (isMonthlyFeeTransaction(transaction)) {
    return "monthly" as const;
  }

  if (vehicle?.recurringClientCategory === "agreement") {
    return "agreement" as const;
  }

  return "avulso" as const;
}

function getResolvedRange(period: PeriodPreset, customRange?: DateRange) {
  const now = new Date();

  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7d":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "1m":
      return { start: startOfDay(subMonths(now, 1)), end: endOfDay(now) };
    case "6m":
      return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
    case "1y":
      return { start: startOfDay(subYears(now, 1)), end: endOfDay(now) };
    case "custom":
      return {
        start: startOfDay(customRange?.from ?? subDays(now, 6)),
        end: endOfDay(customRange?.to ?? customRange?.from ?? now),
      };
  }
}

function getPreviousRange(start: Date, end: Date) {
  const spanInDays = differenceInCalendarDays(end, start) + 1;
  return {
    start: startOfDay(subDays(start, spanInDays)),
    end: endOfDay(subDays(start, 1)),
  };
}

function getPeriodLabel(period: PeriodPreset, customRange?: DateRange) {
  if (period !== "custom") {
    return periodOptions.find((option) => option.value === period)?.label ?? "Periodo";
  }

  if (customRange?.from && customRange?.to) {
    return `${format(customRange.from, "dd/MM/yyyy")} ate ${format(customRange.to, "dd/MM/yyyy")}`;
  }

  if (customRange?.from) {
    return format(customRange.from, "dd/MM/yyyy");
  }

  return "Personalizado";
}

function matchesTransactionFilters(
  transaction: Transaction,
  paymentFilter: PaymentFilter,
  statusFilter: StatusFilter,
) {
  const matchesPayment = paymentFilter === "all" || transaction.paymentMethod === paymentFilter;
  const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
  return matchesPayment && matchesStatus;
}

function calculateChange(current: number, previous: number) {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      isPositive: current >= previous,
    };
  }

  const delta = ((current - previous) / previous) * 100;
  return {
    value: Number(Math.abs(delta).toFixed(1)),
    isPositive: delta >= 0,
  };
}

function buildRevenueChartData(
  transactions: Transaction[],
  start: Date,
  end: Date,
): RevenueData[] {
  const spanInDays = differenceInCalendarDays(end, start) + 1;
  const isSingleDay = spanInDays === 1;
  const useMonthlyBuckets = spanInDays > 62;

  if (isSingleDay) {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourTransactions = transactions.filter(
        (transaction) => transaction.createdAt.getHours() === hour,
      );

      return {
        date: `${String(hour).padStart(2, "0")}:00`,
        revenue: hourTransactions.reduce((acc, transaction) => acc + transaction.amount, 0),
        transactions: hourTransactions.length,
      };
    });
  }

  if (useMonthlyBuckets) {
    return eachMonthOfInterval({ start, end }).map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthTransactions = transactions.filter((transaction) =>
        isWithinInterval(transaction.createdAt, { start: monthStart, end: monthEnd }),
      );

      return {
        date: format(monthDate, "MMM/yy", { locale: ptBR }),
        revenue: monthTransactions.reduce((acc, transaction) => acc + transaction.amount, 0),
        transactions: monthTransactions.length,
      };
    });
  }

  return eachDayOfInterval({ start, end }).map((dayDate) => {
    const dayTransactions = transactions.filter((transaction) =>
      isWithinInterval(transaction.createdAt, { start: startOfDay(dayDate), end: endOfDay(dayDate) }),
    );

    return {
      date: format(dayDate, "dd/MM"),
      revenue: dayTransactions.reduce((acc, transaction) => acc + transaction.amount, 0),
      transactions: dayTransactions.length,
    };
  });
}

function buildVehicleMovementData(vehicles: Vehicle[], start: Date, end: Date) {
  const spanInDays = differenceInCalendarDays(end, start) + 1;
  const isSingleDay = spanInDays === 1;
  const useMonthlyBuckets = spanInDays > 62;

  if (isSingleDay) {
    return Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      entries: vehicles.filter(
        (vehicle) =>
          isWithinInterval(vehicle.entryTime, { start, end }) && vehicle.entryTime.getHours() === hour,
      ).length,
      exits: vehicles.filter(
        (vehicle) =>
          vehicle.exitTime &&
          isWithinInterval(vehicle.exitTime, { start, end }) &&
          vehicle.exitTime.getHours() === hour,
      ).length,
    }));
  }

  if (useMonthlyBuckets) {
    return eachMonthOfInterval({ start, end }).map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      return {
        label: format(monthDate, "MMM/yy", { locale: ptBR }),
        entries: vehicles.filter((vehicle) =>
          isWithinInterval(vehicle.entryTime, { start: monthStart, end: monthEnd }),
        ).length,
        exits: vehicles.filter(
          (vehicle) =>
            vehicle.exitTime &&
            isWithinInterval(vehicle.exitTime, { start: monthStart, end: monthEnd }),
        ).length,
      };
    });
  }

  return eachDayOfInterval({ start, end }).map((dayDate) => ({
    label: format(dayDate, "dd/MM"),
    entries: vehicles.filter((vehicle) =>
      isWithinInterval(vehicle.entryTime, { start: startOfDay(dayDate), end: endOfDay(dayDate) }),
    ).length,
    exits: vehicles.filter(
      (vehicle) =>
        vehicle.exitTime &&
        isWithinInterval(vehicle.exitTime, { start: startOfDay(dayDate), end: endOfDay(dayDate) }),
    ).length,
  }));
}

async function createLogoBase64() {
  const createFallbackLogo = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#2563eb";
    context.beginPath();
    context.roundRect(28, 28, 136, 136, 32);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "bold 96px Arial";
    context.fillText("V", 60, 128);
    return canvas.toDataURL("image/png");
  };

  try {
    const response = await fetch("/LogoValetTracker.ico");
    if (!response.ok) {
      return createFallbackLogo();
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = reject;
      nextImage.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(imageUrl);
      return createFallbackLogo();
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(imageUrl);
    return canvas.toDataURL("image/png");
  } catch {
    return createFallbackLogo();
  }
}

async function downloadWorkbook(
  workbook: { xlsx: { writeBuffer: () => Promise<ArrayBuffer> } },
  filename: string,
) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function FinancialPage() {
  const navigate = useNavigate();
  const { data: dashboardStats } = useDashboardStatsQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>("7d");
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);
  const [showComparisonGuide, setShowComparisonGuide] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const activeRange = useMemo(
    () => getResolvedRange(selectedPeriod, customRange),
    [customRange, selectedPeriod],
  );
  const previousRange = useMemo(
    () => getPreviousRange(activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start],
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          isWithinInterval(transaction.createdAt, {
            start: activeRange.start,
            end: activeRange.end,
          }) && matchesTransactionFilters(transaction, paymentFilter, statusFilter),
      ),
    [activeRange.end, activeRange.start, paymentFilter, statusFilter, transactions],
  );

  const previousFilteredTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          isWithinInterval(transaction.createdAt, {
            start: previousRange.start,
            end: previousRange.end,
          }) && matchesTransactionFilters(transaction, paymentFilter, statusFilter),
      ),
    [paymentFilter, previousRange.end, previousRange.start, statusFilter, transactions],
  );

  const completedTransactions = useMemo(
    () =>
      [...filteredTransactions]
        .filter((transaction) => transaction.status === "completed")
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    [filteredTransactions],
  );

  const previousCompletedTransactions = useMemo(
    () =>
      previousFilteredTransactions.filter((transaction) => transaction.status === "completed"),
    [previousFilteredTransactions],
  );

  const pendingTransactions = filteredTransactions.filter((transaction) => transaction.status === "pending");
  const previousPendingTransactions = previousFilteredTransactions.filter(
    (transaction) => transaction.status === "pending",
  );

  const periodRevenue = completedTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);
  const previousRevenue = previousCompletedTransactions.reduce(
    (acc, transaction) => acc + transaction.amount,
    0,
  );
  const completedCount = completedTransactions.length;
  const previousCompletedCount = previousCompletedTransactions.length;
  const avulsoTransactions = completedTransactions.filter((transaction) => {
    const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
    return getRevenueCategory(transaction, vehicle) === "avulso";
  });
  const previousAvulsoTransactions = previousCompletedTransactions.filter((transaction) => {
    const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
    return getRevenueCategory(transaction, vehicle) === "avulso";
  });
  const avulsoRevenue = avulsoTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);
  const previousAvulsoRevenue = previousAvulsoTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);
  const avgTicket = avulsoTransactions.length > 0 ? avulsoRevenue / avulsoTransactions.length : 0;
  const previousAvgTicket =
    previousAvulsoTransactions.length > 0 ? previousAvulsoRevenue / previousAvulsoTransactions.length : 0;

  const revenueTrend = calculateChange(periodRevenue, previousRevenue);
  const completedTrend = calculateChange(completedCount, previousCompletedCount);
  const avgTicketTrend = calculateChange(avgTicket, previousAvgTicket);
  const pendingTrend = calculateChange(pendingTransactions.length, previousPendingTransactions.length);

  const paymentBreakdown = Object.entries(
    completedTransactions.reduce<Record<PaymentMethod, { amount: number; count: number }>>(
      (acc, transaction) => {
        acc[transaction.paymentMethod].amount += transaction.amount;
        acc[transaction.paymentMethod].count += 1;
        return acc;
      },
      {
        pix: { amount: 0, count: 0 },
        credit: { amount: 0, count: 0 },
        debit: { amount: 0, count: 0 },
        cash: { amount: 0, count: 0 },
        monthly: { amount: 0, count: 0 },
      },
    ),
  )
    .map(([method, summary]) => ({
      method: method as PaymentMethod,
      ...summary,
      share: periodRevenue > 0 ? (summary.amount / periodRevenue) * 100 : 0,
    }))
    .filter((item) => item.amount > 0 || item.count > 0)
    .sort((left, right) => right.amount - left.amount);

  const revenueBreakdown = completedTransactions.reduce(
    (acc, transaction) => {
      const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
      const category = getRevenueCategory(transaction, vehicle);
      acc[category] += transaction.amount;
      return acc;
    },
    { monthly: 0, agreement: 0, avulso: 0 },
  );

  const chartData = useMemo(
    () => buildRevenueChartData(completedTransactions, activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start, completedTransactions],
  );
  const movementData = useMemo(
    () => buildVehicleMovementData(vehicles, activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start, vehicles],
  );

  const periodLabel = getPeriodLabel(selectedPeriod, customRange);
  const rangeLabel = `${format(activeRange.start, "dd/MM/yyyy")} - ${format(activeRange.end, "dd/MM/yyyy")}`;
  const previousRangeLabel = `${format(previousRange.start, "dd/MM/yyyy")} - ${format(previousRange.end, "dd/MM/yyyy")}`;
  const comparisonDescription = `Para comparar ${periodLabel.toLowerCase()}, usamos o bloco imediatamente anterior com a mesma duracao.`;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const excelJsModule = await import("exceljs");
      const ExcelJS = excelJsModule.default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Codex";
      workbook.company = "ValetTracker";
      workbook.created = new Date();
      workbook.modified = new Date();

      const summarySheet = workbook.addWorksheet("Resumo Executivo", {
        views: [{ state: "frozen", ySplit: 7 }],
      });
      summarySheet.properties.defaultRowHeight = 22;
      summarySheet.columns = [
        { key: "a", width: 24 },
        { key: "b", width: 24 },
        { key: "c", width: 20 },
        { key: "d", width: 20 },
        { key: "e", width: 20 },
        { key: "f", width: 16 },
        { key: "g", width: 16 },
        { key: "h", width: 18 },
      ];

      summarySheet.mergeCells("B1:H3");
      const titleCell = summarySheet.getCell("B1");
      titleCell.value = "Relatorio Financeiro Executivo";
      titleCell.font = { size: 22, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

      const subtitleCell = summarySheet.getCell("B3");
      subtitleCell.value = `Periodo: ${periodLabel}  |  Filtros: ${paymentOptions.find((item) => item.value === paymentFilter)?.label}, ${statusOptions.find((item) => item.value === statusFilter)?.label}`;
      subtitleCell.font = { size: 11, color: { argb: "FFE2E8F0" } };
      subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
      subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

      const logo = await createLogoBase64();
      if (logo) {
        const imageId = workbook.addImage({ base64: logo, extension: "png" });
        summarySheet.addImage(imageId, "A1:A3");
      }

      summarySheet.getRow(5).values = [
        "Intervalo atual",
        rangeLabel,
        "Periodo anterior",
        previousRangeLabel,
        "Gerado em",
        formatDateTimeBR(new Date()),
      ];
      summarySheet.getRow(5).font = { bold: true, color: { argb: "FF0F172A" } };

      summarySheet.getRow(7).values = ["Indicador", "Atual", "Anterior", "Variacao"];
      summarySheet.getRow(7).font = { bold: true, color: { argb: "FFFFFFFF" } };
      summarySheet.getRow(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };

      const summaryRows = [
        ["Receita", periodRevenue, previousRevenue, `${revenueTrend.isPositive ? "+" : "-"}${revenueTrend.value}%`],
        ["Transacoes concluidas", completedCount, previousCompletedCount, `${completedTrend.isPositive ? "+" : "-"}${completedTrend.value}%`],
        ["Ticket medio", avgTicket, previousAvgTicket, `${avgTicketTrend.isPositive ? "+" : "-"}${avgTicketTrend.value}%`],
        ["Transacoes pendentes", pendingTransactions.length, previousPendingTransactions.length, `${pendingTrend.isPositive ? "+" : "-"}${pendingTrend.value}%`],
      ];
      summaryRows.forEach((row, index) => {
        const excelRow = summarySheet.getRow(index + 8);
      excelRow.values = row;
      excelRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (colNumber === 1) {
          cell.font = { bold: true, color: { argb: "FF0F172A" } };
        }
      });
      if (index % 2 === 0) {
        excelRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
      });
      ["B8", "C8", "B10", "C10"].forEach((address) => {
        summarySheet.getCell(address).numFmt = '"R$" #,##0.00';
      });

      summarySheet.getCell("F12").value = "Resumo";
      summarySheet.getCell("F12").font = { bold: true, color: { argb: "FF0F172A" } };
      summarySheet.mergeCells("F13:H16");
      const recapCell = summarySheet.getCell("F13");
      recapCell.value = `Receita atual: ${formatCurrencyBRL(periodRevenue)}\nMensalidade: ${formatCurrencyBRL(revenueBreakdown.monthly)}\nCredenciado: ${formatCurrencyBRL(revenueBreakdown.agreement)}\nAvulso: ${formatCurrencyBRL(revenueBreakdown.avulso)}\nPendentes: ${pendingTransactions.length}`;
      recapCell.alignment = { wrapText: true, vertical: "top" };
      recapCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
      recapCell.border = {
        top: { style: "thin", color: { argb: "FFBFDBFE" } },
        left: { style: "thin", color: { argb: "FFBFDBFE" } },
        bottom: { style: "thin", color: { argb: "FFBFDBFE" } },
        right: { style: "thin", color: { argb: "FFBFDBFE" } },
      };

      const transactionSheet = workbook.addWorksheet("Transacoes", {
        views: [{ state: "frozen", ySplit: 5 }],
      });
      transactionSheet.columns = [
        { header: "Recibo", key: "receipt", width: 18 },
      { header: "Placa", key: "plate", width: 12 },
      { header: "Cliente", key: "client", width: 24 },
      { header: "Valor", key: "amount", width: 14 },
      { header: "Pagamento", key: "paymentMethod", width: 18 },
      { header: "Status", key: "status", width: 14 },
      { header: "Duracao", key: "duration", width: 14 },
      { header: "Criado em", key: "createdAt", width: 22 },
      ];

      transactionSheet.mergeCells("A1:H2");
      const txTitle = transactionSheet.getCell("A1");
      txTitle.value = "Detalhamento de Transacoes";
      txTitle.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
      txTitle.alignment = { vertical: "middle", horizontal: "left" };
      txTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };

      transactionSheet.mergeCells("A3:H3");
      const txSubtitle = transactionSheet.getCell("A3");
      txSubtitle.value = `Periodo ${rangeLabel}  |  Pagamento: ${paymentOptions.find((item) => item.value === paymentFilter)?.label}  |  Status: ${statusOptions.find((item) => item.value === statusFilter)?.label}`;
      txSubtitle.font = { color: { argb: "FFCBD5E1" } };
      txSubtitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };

      const headerRow = transactionSheet.getRow(5);
      headerRow.values = transactionSheet.columns.map((column) => column.header);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };

      filteredTransactions.forEach((transaction, index) => {
        const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
      const row = transactionSheet.addRow({
        receipt: transaction.receiptNumber,
        plate: vehicle?.plate ?? "-",
        client: vehicle?.clientName ?? "-",
        amount: transaction.amount,
        paymentMethod: paymentMethodLabels[transaction.paymentMethod],
        status: paymentStatusConfig[transaction.status].label,
        duration: `${transaction.duration} min`,
        createdAt: formatDateTimeBR(transaction.createdAt),
      });
      row.getCell("amount").numFmt = '"R$" #,##0.00';
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });
      if (index % 2 === 0) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
      });

      const dashboardSheet = workbook.addWorksheet("Dashboard", {
        views: [{ state: "frozen", ySplit: 4 }],
      });
      dashboardSheet.columns = [
        { header: "Indicador", key: "indicator", width: 28 },
        { header: "Valor", key: "value", width: 20 },
      ];

      dashboardSheet.mergeCells("B1:D2");
      const dashboardTitle = dashboardSheet.getCell("B1");
      dashboardTitle.value = "Dashboard Operacional";
      dashboardTitle.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
      dashboardTitle.alignment = { vertical: "middle", horizontal: "left" };
      dashboardTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

      if (logo) {
        const dashboardImageId = workbook.addImage({ base64: logo, extension: "png" });
        dashboardSheet.addImage(dashboardImageId, "A1:A2");
      }

      dashboardSheet.getRow(4).values = ["Indicador", "Valor"];
      dashboardSheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
      dashboardSheet.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };

      [
        ["Veiculos estacionados", dashboardStats?.totalVehicles ?? 0],
        ["Veiculos aguardando", dashboardStats?.vehiclesWaiting ?? 0],
        ["Vagas disponiveis", dashboardStats?.availableSpots ?? 0],
        ["Taxa de ocupacao", `${dashboardStats?.occupancyRate ?? 0}%`],
        ["Receita do dia", formatCurrencyBRL(dashboardStats?.todayRevenue ?? 0)],
        ["Tempo medio de permanencia", formatDurationMinutes(dashboardStats?.avgStayDuration ?? 0)],
        ["Tempo medio de espera", `${dashboardStats?.avgWaitTime ?? 0} min`],
        ["Mensalidade no periodo", formatCurrencyBRL(revenueBreakdown.monthly)],
        ["Credenciado no periodo", formatCurrencyBRL(revenueBreakdown.agreement)],
        ["Avulso no periodo", formatCurrencyBRL(revenueBreakdown.avulso)],
      ].forEach(([indicator, value], index) => {
        const row = dashboardSheet.getRow(index + 5);
        row.values = [indicator, value];
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });
        if (index % 2 === 0) {
          row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      });

      await downloadWorkbook(workbook, `financeiro-executivo-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">
              Acompanhe receitas, pagamentos e integracoes operacionais
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Popover open={periodPopoverOpen} onOpenChange={setPeriodPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {periodLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[360px] space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Filtrar periodo</p>
                  <div className="grid grid-cols-2 gap-2">
                    {periodOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selectedPeriod === option.value ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => {
                          setSelectedPeriod(option.value);
                          if (option.value !== "custom") {
                            setPeriodPopoverOpen(false);
                          }
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedPeriod === "custom" && (
                  <div className="rounded-lg border border-border">
                    <DatePickerCalendar
                      mode="range"
                      numberOfMonths={1}
                      selected={customRange}
                      onSelect={setCustomRange}
                      locale={ptBR}
                    />
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Intervalo ativo: {rangeLabel}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Gerando XLSX..." : "Exportar"}
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("/vehicles?status=delivered")}>
              <Receipt className="h-4 w-4" />
              Veiculos entregues
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pagamento</p>
            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Badge variant="outline" className="h-10 px-3 text-sm">
              Atual: {rangeLabel}
            </Badge>
          </div>

          <div className="flex items-end">
            <Badge variant="outline" className="h-10 px-3 text-sm">
              Anterior: {previousRangeLabel}
            </Badge>
          </div>
        </div>

        <Card className="border-primary/15 bg-gradient-to-r from-primary/5 via-background to-info/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Como funciona a comparacao de periodos
              </CardTitle>
              <CardDescription>{comparisonDescription}</CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 self-start"
              onClick={() => setShowComparisonGuide((current) => !current)}
            >
              <CircleHelp className="h-4 w-4" />
              {showComparisonGuide ? "Ocultar explicacao" : "Mostrar explicacao"}
            </Button>
          </CardHeader>
          {showComparisonGuide && (
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  1. Periodo selecionado
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">{rangeLabel}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Este e o intervalo que voce escolheu para analisar.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  2. Base de comparacao
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">{previousRangeLabel}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  O sistema pega o bloco imediatamente anterior com o mesmo tamanho.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  3. Resultado nos cards
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  Ex.: {revenueTrend.isPositive ? "+" : "-"}
                  {revenueTrend.value}% na receita
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Os percentuais mostram se o periodo atual cresceu ou caiu contra o periodo anterior.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={`Receita - ${periodLabel}`}
            value={formatCurrencyBRL(periodRevenue)}
            subtitle={rangeLabel}
            icon={DollarSign}
            trend={{ ...revenueTrend, label: "vs periodo anterior" }}
            variant="success"
          />
          <StatCard
            title="Transacoes concluidas"
            value={completedCount}
            subtitle={periodLabel}
            icon={TrendingUp}
            trend={{ ...completedTrend, label: "vs periodo anterior" }}
            variant="primary"
          />
          <StatCard
            title="Ticket medio"
            value={formatCurrencyBRL(avgTicket)}
            subtitle="Apenas pagamentos avulsos"
            icon={Receipt}
            trend={{ ...avgTicketTrend, label: "vs periodo anterior" }}
            variant="info"
          />
          <StatCard
            title="Transacoes pendentes"
            value={pendingTransactions.length}
            subtitle={periodLabel}
            icon={CreditCard}
            trend={{ ...pendingTrend, label: "vs periodo anterior" }}
            variant={pendingTransactions.length > 0 ? "warning" : "default"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <RevenueChart
              data={chartData}
              title={`Receita - ${periodLabel}`}
              subtitle={
                differenceInCalendarDays(activeRange.end, activeRange.start) === 0
                  ? `${rangeLabel} | Visao por hora`
                  : rangeLabel
              }
              summaryNote={`${revenueTrend.isPositive ? "+" : "-"}${revenueTrend.value}% vs periodo anterior`}
              breakdown={[
                { label: "Mensalidade", value: revenueBreakdown.monthly, tone: "primary" },
                { label: "Credenciado", value: revenueBreakdown.agreement, tone: "info" },
                { label: "Avulso", value: revenueBreakdown.avulso, tone: "success" },
              ]}
            />
            <VehicleMovementChart
              data={movementData}
              title="Movimentacao de Veiculos"
              subtitle={
                differenceInCalendarDays(activeRange.end, activeRange.start) === 0
                  ? "Shopping Center Norte | Entradas e saidas por hora"
                  : "Shopping Center Norte | Entradas e saidas no periodo"
              }
            />
          </div>

          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Por Forma de Pagamento</h3>
                <p className="text-sm text-muted-foreground">Resumo do periodo filtrado</p>
              </div>
              <Badge variant="outline">{completedCount} pagamentos</Badge>
            </div>
            <div className="space-y-4">
              {paymentBreakdown.length > 0 ? (
                paymentBreakdown.map((item) => (
                  <div key={item.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${paymentMethodColors[item.method]}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{paymentMethodLabels[item.method]}</p>
                        <p className="text-xs text-muted-foreground">{item.count} transacao(oes)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrencyBRL(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.share.toFixed(1)}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum pagamento concluido no periodo.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Transacoes Recentes</h3>
                <p className="text-sm text-muted-foreground">
                  Lista atualizada pelos filtros de periodo, pagamento e status
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => navigate("/vehicles?status=delivered")}
              >
                Ver todas
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Veiculo</th>
                    <th>Recibo</th>
                    <th>Valor</th>
                    <th>Pagamento</th>
                    <th>Duracao</th>
                    <th>Status</th>
                    <th>Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const status = paymentStatusConfig[transaction.status];
                    const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);

                    return (
                      <tr key={transaction.id}>
                        <td>
                          {vehicle ? (
                            <button
                              type="button"
                              className="text-left text-sm font-medium text-primary hover:underline"
                              onClick={() =>
                                navigate(
                                  `/vehicles?status=${vehicle.status === "delivered" ? "delivered" : "all"}&q=${encodeURIComponent(vehicle.plate)}`,
                                )
                              }
                            >
                              {vehicle.plate}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td>
                          <span className="font-mono text-sm">{transaction.receiptNumber}</span>
                        </td>
                        <td>
                          <span className="font-semibold text-foreground">
                            {formatCurrencyBRL(transaction.amount)}
                          </span>
                        </td>
                        <td>
                          <Badge variant="outline">{paymentMethodLabels[transaction.paymentMethod]}</Badge>
                        </td>
                        <td>
                          <span className="text-muted-foreground">
                            {formatDurationMinutes(transaction.duration)}
                          </span>
                        </td>
                        <td>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </td>
                        <td>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTimeBR(transaction.createdAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma transacao encontrada para os filtros selecionados.
                </div>
              )}
            </div>
          </div>

          <div className="stat-card space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Integracoes Ativas</h3>
              <p className="text-sm text-muted-foreground">
                Acoes rapidas para cruzar financeiro com a operacao
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/vehicles?status=delivered")}
            >
              Veiculos entregues
              <Badge variant="secondary">{vehicles.filter((vehicle) => vehicle.status === "delivered").length}</Badge>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/vehicles?status=requested")}
            >
              Veiculos aguardando
              <Badge variant="secondary">
                {vehicles.filter((vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit").length}
              </Badge>
            </Button>

            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/")}>
              Dashboard operacional
              <Badge variant="secondary">{dashboardStats?.totalVehicles ?? 0}</Badge>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
