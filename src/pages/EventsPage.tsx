import { useMemo, useState } from "react";
import { CalendarClock, CarFront, CheckCircle2, Clock3, Filter, ShieldAlert, Ticket, Users, Wrench } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEventsQuery } from "@/hooks/useValetData";
import { formatDateTimeBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventCategory, EventStatus, OperationEvent } from "@/types/valet";

type EventFilter = EventCategory | "all";

const filterOptions: Array<{ value: EventFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "operation", label: "Operacao" },
  { value: "billing", label: "Financeiro" },
  { value: "team", label: "Equipe" },
  { value: "vip", label: "VIP" },
  { value: "maintenance", label: "Patio" },
  { value: "cash", label: "Caixa" },
];

const statusLabel: Record<EventStatus, string> = {
  scheduled: "Agendado",
  in_progress: "Em andamento",
  attention: "Atencao",
  completed: "Concluido",
};

function getCategoryMeta(category: EventCategory) {
  switch (category) {
    case "operation":
      return { label: "Operacao", icon: CarFront, className: "bg-primary/10 text-primary" };
    case "billing":
      return { label: "Financeiro", icon: Ticket, className: "bg-info/10 text-info" };
    case "team":
      return { label: "Equipe", icon: Users, className: "bg-success/10 text-success" };
    case "vip":
      return { label: "VIP", icon: ShieldAlert, className: "bg-warning/10 text-warning" };
    case "maintenance":
      return { label: "Patio", icon: Wrench, className: "bg-destructive/10 text-destructive" };
    case "cash":
      return { label: "Caixa", icon: CalendarClock, className: "bg-muted text-foreground" };
  }
}

function summarize(events: OperationEvent[]) {
  return {
    total: events.length,
    attention: events.filter((event) => event.status === "attention").length,
    inProgress: events.filter((event) => event.status === "in_progress").length,
    today: events.filter((event) => {
      const scheduled = event.scheduledFor;
      const now = new Date();
      return scheduled.getFullYear() === now.getFullYear() && scheduled.getMonth() === now.getMonth() && scheduled.getDate() === now.getDate();
    }).length,
  };
}

export default function EventsPage() {
  const { data: events = [] } = useEventsQuery();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EventFilter>("all");

  const filteredEvents = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesFilter = filter === "all" || event.category === filter;
      const matchesSearch =
        normalized.length === 0 ||
        event.title.toLowerCase().includes(normalized) ||
        event.description.toLowerCase().includes(normalized) ||
        event.ownerName?.toLowerCase().includes(normalized) ||
        event.badge?.toLowerCase().includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [events, filter, search]);

  const summary = summarize(events);
  const highlightedEvents = filteredEvents.slice(0, 3);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
            <p className="text-muted-foreground">
              Agenda operacional alimentada pelos dados atuais do patio, caixa, equipe e carteira de clientes.
            </p>
          </div>
          <Badge variant="outline" className="h-10 px-4 text-sm">
            {filteredEvents.length} evento(s) visiveis
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Agenda total" value={summary.total} icon={CalendarClock} />
          <SummaryCard title="Exigem atencao" value={summary.attention} icon={ShieldAlert} accent="warning" />
          <SummaryCard title="Em andamento" value={summary.inProgress} icon={Clock3} accent="primary" />
          <SummaryCard title="Programados hoje" value={summary.today} icon={CheckCircle2} accent="success" />
        </div>

        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtros da agenda
            </CardTitle>
            <CardDescription>Use os filtros para separar eventos operacionais, financeiros, VIPs e manutencoes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por titulo, descricao, responsavel ou destaque..."
            />
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle>Destaques da operacao</CardTitle>
              <CardDescription>Os itens com mais impacto imediato na rotina da unidade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {highlightedEvents.length > 0 ? (
                highlightedEvents.map((event) => <FeaturedEventCard key={event.id} event={event} />)
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Nenhum evento encontrado para o filtro atual.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle>Linha do tempo</CardTitle>
              <CardDescription>Lista cronologica dos eventos derivados da operacao atual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => <TimelineRow key={event.id} event={event} />)
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  A agenda esta vazia com os filtros selecionados.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function FeaturedEventCard({ event }: { event: OperationEvent }) {
  const meta = getCategoryMeta(event.category);
  const Icon = meta.icon;

  return (
    <article className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-xl p-2", meta.className)}>
              <Icon className="h-4 w-4" />
            </span>
            <Badge variant="outline">{meta.label}</Badge>
            <Badge variant="secondary">{statusLabel[event.status]}</Badge>
            {event.badge ? <Badge variant="outline">{event.badge}</Badge> : null}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{event.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{formatDateTimeBR(event.scheduledFor)}</p>
          {event.ownerName ? <p className="mt-2 font-medium text-foreground">{event.ownerName}</p> : null}
        </div>
      </div>
    </article>
  );
}

function TimelineRow({ event }: { event: OperationEvent }) {
  const meta = getCategoryMeta(event.category);
  const Icon = meta.icon;

  return (
    <article className="flex gap-4 rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl", meta.className)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{event.title}</h3>
              <Badge variant="outline">{meta.label}</Badge>
              <Badge variant="secondary">{statusLabel[event.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{formatDateTimeBR(event.scheduledFor)}</p>
            {event.ownerName ? <p className="font-medium text-foreground">{event.ownerName}</p> : null}
          </div>
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
  icon: typeof CalendarClock;
  accent?: "default" | "primary" | "success" | "warning";
}) {
  const accentClass =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "success"
        ? "bg-success/10 text-success"
        : accent === "warning"
          ? "bg-warning/10 text-warning"
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
