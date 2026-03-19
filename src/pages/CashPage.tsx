import { useMemo, useState } from "react";
import { AlertTriangle, Download, Lock, LockOpen, Wallet } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCashSessionsQuery,
  useCloseCashSessionMutation,
  useCurrentCashSessionQuery,
  useOpenCashSessionMutation,
  useTransactionsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyBRL, formatDateTimeBR } from "@/lib/format";
import type { CashSession } from "@/types/valet";

function parseCurrencyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function exportCashSessionReport(session: CashSession) {
  const report = session.report;
  const rows: string[] = [];
  const pushRow = (values: Array<string | number>) => {
    rows.push(values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
  };

  pushRow(["tipo", "data_hora", "placa", "cliente", "detalhe_1", "detalhe_2", "valor"]);

  if (report) {
    report.entries.forEach((entry) => {
      pushRow([
        "entrada",
        entry.entryTime ? formatDateTimeBR(entry.entryTime) : "-",
        entry.plate,
        entry.clientName,
        entry.driverName ?? "-",
        entry.spotId ?? "-",
        "",
      ]);
    });

    report.exits.forEach((entry) => {
      pushRow([
        "saida",
        entry.exitTime ? formatDateTimeBR(entry.exitTime) : "-",
        entry.plate,
        entry.clientName,
        entry.driverName ?? "-",
        "-",
        "",
      ]);
    });

    report.transactions.forEach((transaction) => {
      pushRow([
        "pagamento",
        transaction.createdAt ? formatDateTimeBR(transaction.createdAt) : "-",
        "-",
        "-",
        transaction.receiptNumber,
        transaction.paymentMethod,
        transaction.amount,
      ]);
    });
  }

  const summary = [
    "",
    "",
    "",
    "",
    "abertura",
    session.openingAmount,
    "",
    "fechamento",
    session.closingAmount ?? 0,
    "",
    "esperado",
    session.expectedAmount ?? 0,
    "",
    "diferenca",
    session.differenceAmount ?? 0,
  ];
  pushRow(summary);

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `caixa-${session.id.slice(0, 8)}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function CashPage() {
  const { data: currentSession } = useCurrentCashSessionQuery();
  const { data: cashSessions = [] } = useCashSessionsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const openCashSession = useOpenCashSessionMutation();
  const closeCashSession = useCloseCashSessionMutation();
  const { toast } = useToast();

  const [openingAmount, setOpeningAmount] = useState("0,00");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const selectedHistorySession = useMemo(
    () => cashSessions.find((session) => session.id === selectedHistoryId) ?? cashSessions.find((session) => session.status === "closed"),
    [cashSessions, selectedHistoryId],
  );

  const currentSessionEntries = useMemo(
    () => vehicles.filter((vehicle) => vehicle.entryCashSessionId === currentSession?.id),
    [currentSession?.id, vehicles],
  );
  const currentSessionExits = useMemo(
    () => vehicles.filter((vehicle) => vehicle.exitCashSessionId === currentSession?.id),
    [currentSession?.id, vehicles],
  );
  const currentSessionTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.cashSessionId === currentSession?.id),
    [currentSession?.id, transactions],
  );

  const currentRevenue = currentSessionTransactions
    .filter((transaction) => transaction.status === "completed")
    .reduce((acc, transaction) => acc + transaction.amount, 0);
  const expectedAmount = (currentSession?.openingAmount ?? 0) + currentRevenue;
  const currentBreakdown = currentSessionTransactions.reduce<Record<string, { count: number; amount: number }>>(
    (acc, transaction) => {
      if (!acc[transaction.paymentMethod]) {
        acc[transaction.paymentMethod] = { count: 0, amount: 0 };
      }
      acc[transaction.paymentMethod].count += 1;
      acc[transaction.paymentMethod].amount += transaction.amount;
      return acc;
    },
    {},
  );

  const handleOpenCash = async () => {
    try {
      await openCashSession.mutateAsync({
        openingAmount: parseCurrencyInput(openingAmount),
        openingNotes: openingNotes.trim() || undefined,
      });
      setOpeningAmount("0,00");
      setOpeningNotes("");
      toast({
        title: "Caixa aberto",
        description: "O posto foi liberado para iniciar as operacoes.",
      });
    } catch (error) {
      toast({
        title: "Nao foi possivel abrir o caixa",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCloseCash = async () => {
    try {
      await closeCashSession.mutateAsync({
        closingAmount: parseCurrencyInput(closingAmount),
        closingNotes: closingNotes.trim() || undefined,
      });
      setClosingAmount("");
      setClosingNotes("");
      toast({
        title: "Caixa fechado",
        description: "O relatorio desse turno ja pode ser exportado.",
      });
    } catch (error) {
      toast({
        title: "Nao foi possivel fechar o caixa",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Caixa</h1>
            <p className="text-muted-foreground">Controle de abertura, fechamento e relatorio por turno.</p>
          </div>
          <Badge variant="outline" className="h-10 px-4 text-sm">
            {currentSession ? "Caixa aberto" : "Caixa fechado"}
          </Badge>
        </div>

        {!currentSession ? (
          <Card className="border-success/20 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockOpen className="h-5 w-5 text-success" />
                Abrir Caixa
              </CardTitle>
              <CardDescription>Sem abertura, o sistema bloqueia a operacao da unidade.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr_auto]">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Valor inicial</p>
                <Input value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Observacoes</p>
                <Textarea
                  value={openingNotes}
                  onChange={(event) => setOpeningNotes(event.target.value)}
                  placeholder="Ex.: fundo de troco, observacoes do inicio do turno"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full gap-2 lg:w-auto" onClick={() => void handleOpenCash()} disabled={openCashSession.isPending}>
                  <LockOpen className="h-4 w-4" />
                  {openCashSession.isPending ? "Abrindo..." : "Confirmar abertura"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground">Operador atual</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{currentSession.attendantName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeBR(currentSession.openedAt)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground">Valor de abertura</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrencyBRL(currentSession.openingAmount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Base atual do caixa</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground">Receita do turno</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrencyBRL(currentRevenue)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{currentSessionTransactions.length} pagamentos vinculados</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground">Esperado no fechamento</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrencyBRL(expectedAmount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{currentSessionEntries.length} entradas / {currentSessionExits.length} saidas</p>
                </div>
              </div>

              <Card className="border-border bg-card/80">
                <CardHeader>
                  <CardTitle>Fechar Caixa</CardTitle>
                  <CardDescription>Ao fechar, o sistema consolida entradas, saidas e pagamentos em um relatorio.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr_auto]">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Valor contado no caixa</p>
                    <Input value={closingAmount} onChange={(event) => setClosingAmount(event.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Observacoes de fechamento</p>
                    <Textarea
                      value={closingNotes}
                      onChange={(event) => setClosingNotes(event.target.value)}
                      placeholder="Ex.: diferenca de troco, sangria, pendencia"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      className="w-full gap-2 lg:w-auto"
                      onClick={() => void handleCloseCash()}
                      disabled={closeCashSession.isPending}
                    >
                      <Lock className="h-4 w-4" />
                      {closeCashSession.isPending ? "Fechando..." : "Fechar caixa"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="border-border bg-card/80">
                  <CardHeader>
                    <CardTitle>Movimento do Turno</CardTitle>
                    <CardDescription>Resumo operativo da sessao aberta.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">Entradas registradas</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{currentSessionEntries.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">Saidas registradas</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{currentSessionExits.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">Pagamentos concluidos</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {currentSessionTransactions.filter((transaction) => transaction.status === "completed").length}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/80">
                  <CardHeader>
                    <CardTitle>Forma de Pagamento</CardTitle>
                    <CardDescription>Distribuicao do caixa ativo.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(currentBreakdown).length > 0 ? (
                      Object.entries(currentBreakdown).map(([paymentMethod, summary]) => (
                        <div key={paymentMethod} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                          <div>
                            <p className="font-medium text-foreground">{paymentMethod}</p>
                            <p className="text-sm text-muted-foreground">{summary.count} lancamentos</p>
                          </div>
                          <p className="font-semibold text-foreground">{formatCurrencyBRL(summary.amount)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                        Nenhum pagamento registrado nesta sessao ainda.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="border-warning/20 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Caixa em Operacao
                </CardTitle>
                <CardDescription>Enquanto esta sessao estiver aberta, o restante do sistema permanece liberado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Observacoes da abertura</p>
                  <p className="mt-2 text-sm text-foreground">{currentSession.openingNotes || "Sem observacoes registradas."}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Bloqueio do sistema</p>
                  <p className="mt-2 text-sm text-foreground">
                    Se este caixa for fechado, qualquer outra tela operacional fica bloqueada ate uma nova abertura.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle>Historico de Caixas</CardTitle>
              <CardDescription>Cada fechamento gera uma sessao separada para consulta e auditoria.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cashSessions.length > 0 ? (
                cashSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedHistoryId(session.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      selectedHistorySession?.id === session.id ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{session.attendantName}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTimeBR(session.openedAt)}</p>
                      </div>
                      <Badge variant="outline">{session.status === "open" ? "Aberto" : "Fechado"}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <span>Receita: {formatCurrencyBRL(session.totalRevenue)}</span>
                      <span>Entradas: {session.totalEntries}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Nenhum caixa registrado ainda.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle>Relatorio do Caixa</CardTitle>
              <CardDescription>Visualizacao resumida e exportacao do fechamento selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedHistorySession ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {selectedHistorySession.status === "open" ? "Sessao aberta" : "Sessao fechada"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">Receita</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrencyBRL(selectedHistorySession.totalRevenue)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">Esperado</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrencyBRL(selectedHistorySession.expectedAmount ?? 0)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">Diferenca</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrencyBRL(selectedHistorySession.differenceAmount ?? 0)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Notas do fechamento</p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedHistorySession.closingNotes || "Sem observacoes registradas para este fechamento."}
                    </p>
                  </div>

                  {selectedHistorySession.status === "closed" ? (
                    <Button className="w-full gap-2" onClick={() => exportCashSessionReport(selectedHistorySession)}>
                      <Download className="h-4 w-4" />
                      Exportar relatorio deste caixa
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      O relatorio completo fica disponivel assim que o caixa for fechado.
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Selecione um caixa no historico para visualizar o resumo e exportar o relatorio.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
