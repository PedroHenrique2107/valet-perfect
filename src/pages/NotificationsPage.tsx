import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, CircleAlert, Filter, Info, ShieldAlert, Wrench } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNotificationsQuery } from "@/hooks/useValetData";
import { formatDateTimeBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationKind, NotificationSeverity } from "@/types/valet";

type SeverityFilter = NotificationSeverity | "all";

const severityOptions: Array<{ value: SeverityFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "critical", label: "Criticas" },
  { value: "warning", label: "Atencao" },
  { value: "info", label: "Informativas" },
  { value: "success", label: "Sucesso" },
];

function getSeverityMeta(severity: NotificationSeverity) {
  switch (severity) {
    case "critical":
      return { label: "Critica", icon: ShieldAlert, className: "bg-destructive/10 text-destructive" };
    case "warning":
      return { label: "Atencao", icon: AlertTriangle, className: "bg-warning/10 text-warning" };
    case "info":
      return { label: "Info", icon: Info, className: "bg-info/10 text-info" };
    case "success":
      return { label: "Ok", icon: CheckCircle2, className: "bg-success/10 text-success" };
  }
}

function getKindLabel(kind: NotificationKind) {
  switch (kind) {
    case "occupancy":
      return "Ocupacao";
    case "vehicle":
      return "Veiculo";
    case "client":
      return "Cliente";
    case "cash":
      return "Caixa";
    case "team":
      return "Equipe";
    case "maintenance":
      return "Patio";
    case "vip":
      return "VIP";
    case "payment":
      return "Pagamento";
    case "system":
      return "Sistema";
    case "activity":
      return "Resumo";
  }
}

export default function NotificationsPage() {
  const { data: notifications = [] } = useNotificationsQuery();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const filteredNotifications = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      const matchesSeverity = severityFilter === "all" || notification.severity === severityFilter;
      const matchesSearch =
        normalized.length === 0 ||
        notification.title.toLowerCase().includes(normalized) ||
        notification.message.toLowerCase().includes(normalized) ||
        getKindLabel(notification.kind).toLowerCase().includes(normalized);
      return matchesSeverity && matchesSearch;
    });
  }, [notifications, search, severityFilter]);

  const summary = useMemo(
    () => ({
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.read).length,
      critical: notifications.filter((notification) => notification.severity === "critical").length,
      warning: notifications.filter((notification) => notification.severity === "warning").length,
    }),
    [notifications],
  );

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notificacoes</h1>
            <p className="text-muted-foreground">
              Alertas operacionais e informativos gerados a partir do patio, caixa, equipe e carteira local.
            </p>
          </div>
          <Badge variant="outline" className="h-10 px-4 text-sm">
            {summary.unread} pendente(s)
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total" value={summary.total} icon={Bell} />
          <SummaryCard title="Pendentes" value={summary.unread} icon={CircleAlert} accent="primary" />
          <SummaryCard title="Criticas" value={summary.critical} icon={ShieldAlert} accent="destructive" />
          <SummaryCard title="Atencao" value={summary.warning} icon={Wrench} accent="warning" />
        </div>

        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtro das notificacoes
            </CardTitle>
            <CardDescription>Refine a lista por severidade ou por termos livres.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por titulo, mensagem ou tipo..."
            />
            <div className="flex flex-wrap gap-2">
              {severityOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={severityFilter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSeverityFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle>Central de alertas</CardTitle>
            <CardDescription>Itens ordenados por horario, destacando primeiro o que ainda pede acao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => <NotificationRow key={notification.id} notification={notification} />)
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Nenhuma notificacao corresponde ao filtro atual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const meta = getSeverityMeta(notification.severity);
  const Icon = meta.icon;

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        notification.read ? "border-border/60 bg-background/30" : "border-primary/20 bg-primary/5",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl", meta.className)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-foreground">{notification.title}</h2>
              <Badge variant="outline">{getKindLabel(notification.kind)}</Badge>
              <Badge variant="secondary">{meta.label}</Badge>
              {!notification.read ? <Badge className="bg-primary text-primary-foreground">Pendente</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            {notification.actionLabel ? (
              <p className="text-sm font-medium text-foreground">Acao sugerida: {notification.actionLabel}</p>
            ) : null}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>{formatDateTimeBR(notification.createdAt)}</p>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  accent = "default",
}: {
  title: string;
  value: number | string;
  icon: typeof Bell;
  accent?: "default" | "primary" | "warning" | "destructive";
}) {
  const accentClass =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "warning"
        ? "bg-warning/10 text-warning"
        : accent === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-foreground";

  return (
    <div className="stat-card flex items-center gap-4">
      <div className={cn("rounded-xl p-3", accentClass)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
