import { useMemo, useState } from "react";
import {
  Building2,
  CreditCard,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  UserCircle,
} from "lucide-react";
import { ClientCreateDialog } from "@/components/forms/ClientCreateDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/contexts/AuthContext";
import { useClientsQuery } from "@/hooks/useValetData";
import { formatCurrencyBRL, formatDateTimeBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/valet";

type ClientCategoryFilter = Client["category"] | "all";

const categoryLabels: Record<Client["category"], string> = {
  agreement: "Credenciado",
  monthly: "Mensalista",
};

const tierLabels: Record<Client["tier"], string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  diamond: "Diamante",
};

const categoryAccent: Record<Client["category"], string> = {
  agreement: "border-info/50 bg-info/10 text-info",
  monthly: "border-primary/50 bg-primary/10 text-primary",
};

export default function ClientsPage() {
  const { data: clients = [] } = useClientsQuery();
  const canCreateClient = useCan("create_client");
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ClientCategoryFilter>("all");

  const filteredClients = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesCategory = categoryFilter === "all" || client.category === categoryFilter;
      const matchesSearch =
        normalized.length === 0 ||
        client.name.toLowerCase().includes(normalized) ||
        client.email.toLowerCase().includes(normalized) ||
        client.phone.toLowerCase().includes(normalized) ||
        client.vehicles.some((plate) => plate.toLowerCase().includes(normalized));

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, clients, searchQuery]);

  const summary = useMemo(
    () => ({
      total: clients.length,
      agreement: clients.filter((client) => client.category === "agreement").length,
      monthly: clients.filter((client) => client.category === "monthly").length,
      activeVehicles: clients.reduce((total, client) => total + client.vehicles.length, 0),
    }),
    [clients],
  );

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">
              Central de cadastro com separacao entre credenciados e mensalistas.
            </p>
          </div>
          <Button
            className="gap-2 bg-gradient-primary hover:opacity-90"
            onClick={() => setCreateOpen(true)}
            disabled={!canCreateClient}
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total cadastrados" value={summary.total} icon={UserCircle} />
          <SummaryCard title="Credenciados" value={summary.agreement} icon={Building2} accent="info" />
          <SummaryCard title="Mensalistas" value={summary.monthly} icon={CreditCard} accent="primary" />
          <SummaryCard title="Veiculos vinculados" value={summary.activeVehicles} icon={Star} accent="warning" />
        </div>

        <div className="stat-card space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou placa..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterButton active={categoryFilter === "all"} label="Todos" count={summary.total} onClick={() => setCategoryFilter("all")} />
              <FilterButton active={categoryFilter === "agreement"} label="Credenciados" count={summary.agreement} onClick={() => setCategoryFilter("agreement")} />
              <FilterButton active={categoryFilter === "monthly"} label="Mensalistas" count={summary.monthly} onClick={() => setCategoryFilter("monthly")} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CategoryPanel
            title="Credenciados"
            description="Clientes vinculados a convenio, parceiros ou operacoes recorrentes."
            clients={filteredClients.filter((client) => client.category === "agreement")}
            emptyMessage="Nenhum cliente credenciado encontrado com o filtro atual."
          />
          <CategoryPanel
            title="Mensalistas"
            description="Clientes com relacao recorrente de mensalidade e previsibilidade de receita."
            clients={filteredClients.filter((client) => client.category === "monthly")}
            emptyMessage="Nenhum cliente mensalista encontrado com o filtro atual."
          />
        </div>
      </div>

      <ClientCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </MainLayout>
  );
}

function CategoryPanel({
  title,
  description,
  clients,
  emptyMessage,
}: {
  title: string;
  description: string;
  clients: Client[];
  emptyMessage: string;
}) {
  return (
    <section className="stat-card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {clients.length > 0 ? (
        <div className="space-y-3">
          {clients.map((client) => (
            <article key={client.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{client.name}</h3>
                    <Badge variant="outline" className={categoryAccent[client.category]}>
                      {categoryLabels[client.category]}
                    </Badge>
                    <Badge variant="secondary">{tierLabels[client.tier]}</Badge>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[220px]">
                  <Metric label="Visitas" value={String(client.totalVisits)} />
                  <Metric label="Total gasto" value={formatCurrencyBRL(client.totalSpent)} />
                  <Metric label="Cashback" value={formatCurrencyBRL(client.cashback)} />
                  <Metric label="Cadastro" value={formatDateTimeBR(client.createdAt)} />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Veiculos vinculados
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {client.vehicles.length > 0 ? (
                    client.vehicles.map((vehicle) => (
                      <Badge key={vehicle} variant="outline">
                        {vehicle}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum veiculo vinculado.</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </section>
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
  icon: typeof UserCircle;
  accent?: "default" | "primary" | "info" | "warning";
}) {
  const accentClass =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "info"
        ? "bg-info/10 text-info"
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

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick} className="gap-2">
      {label}
      <Badge variant="secondary" className={cn(active && "bg-primary-foreground/20 text-primary-foreground")}>
        {count}
      </Badge>
    </Button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}
