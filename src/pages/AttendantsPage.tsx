import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { AttendantCard } from "@/components/dashboard/AttendantCard";
import { AttendantCreateDialog } from "@/components/forms/AttendantCreateDialog";
import { AttendantDetailsDialog } from "@/components/forms/AttendantDetailsDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClearAllAttendantsMutation, useAttendantsQuery } from "@/hooks/useValetData";
import { getStatusLabel, getWorkloadLevel } from "@/lib/attendantMetrics";
import { useToast } from "@/hooks/use-toast";
import type { Attendant } from "@/types/valet";

const statusFilters = ["all", "online", "offline", "lunch", "dinner", "commuting"] as const;

type StatusFilter = (typeof statusFilters)[number];

export default function AttendantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);

  const { data: attendants = [] } = useAttendantsQuery();
  const clearAllAttendants = useClearAllAttendantsMutation();
  const { toast } = useToast();
  const alertedOvertimeIds = useRef<Set<string>>(new Set());

  const filteredAttendants = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return attendants.filter((attendant) => {
      const matchesSearch =
        normalized.length === 0 || attendant.name.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "all" || attendant.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [attendants, searchQuery, statusFilter]);

  useEffect(() => {
    attendants.forEach((attendant) => {
      const level = getWorkloadLevel(attendant);
      if (level === "exceeded" && !alertedOvertimeIds.current.has(attendant.id)) {
        alertedOvertimeIds.current.add(attendant.id);
        toast({
          title: "Alerta de jornada excedida",
          description: `${attendant.name} esta acima do horario estabelecido.`,
          variant: "destructive",
        });
      }
      if (level !== "exceeded") {
        alertedOvertimeIds.current.delete(attendant.id);
      }
    });
  }, [attendants, toast]);

  const onlineCount = attendants.filter((attendant) => attendant.isOnline).length;

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manobristas</h1>
            <p className="text-muted-foreground">Gestao de equipe por patio e jornada</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={clearAllAttendants.isPending}
              onClick={() => clearAllAttendants.mutate()}
            >
              <Trash2 className="h-4 w-4" />
              Limpar manobristas (teste)
            </Button>
            <Button className="gap-2 bg-gradient-primary hover:opacity-90" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Manobrista
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="stat-card flex items-center gap-4">
            <div className="rounded-xl bg-success/10 p-3">
              <Users className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Online agora</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{attendants.length}</p>
              <p className="text-sm text-muted-foreground">Total cadastrados</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="rounded-xl bg-warning/10 p-3">
              <Users className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {attendants.filter((attendant) => getWorkloadLevel(attendant) === "exceeded").length}
              </p>
              <p className="text-sm text-muted-foreground">Jornada excedida</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "Todos os status" : getStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredAttendants.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAttendants.map((attendant) => (
              <AttendantCard
                key={attendant.id}
                attendant={attendant}
                onViewDetails={(item) => {
                  setSelectedAttendant(item);
                  setDetailsOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="stat-card flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold text-foreground">Nenhum manobrista encontrado</h3>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou realizar uma nova busca</p>
          </div>
        )}
      </div>

      <AttendantCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AttendantDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        attendant={selectedAttendant}
      />
    </MainLayout>
  );
}
