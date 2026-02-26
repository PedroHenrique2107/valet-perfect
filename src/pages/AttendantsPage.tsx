import { useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { AttendantCard } from "@/components/dashboard/AttendantCard";
import { AssignTaskDialog } from "@/components/forms/AssignTaskDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/contexts/AuthContext";
import { useAttendantsQuery } from "@/hooks/useValetData";
import { filterAttendants } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import type { Attendant } from "@/types/valet";

const shiftFilters = [
  { value: "all", label: "Todos os Turnos" },
  { value: "morning", label: "Manhã" },
  { value: "afternoon", label: "Tarde" },
  { value: "night", label: "Noite" },
];

export default function AttendantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);

  const canAssignTask = useCan("assign_task");
  const { data: attendants = [] } = useAttendantsQuery();

  const filteredAttendants = filterAttendants(attendants, searchQuery, shiftFilter);
  const onlineCount = attendants.filter((attendant) => attendant.isOnline).length;
  const availableCount = attendants.filter((attendant) => attendant.status === "available").length;
  const busyCount = attendants.filter((attendant) => attendant.status === "busy").length;

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manobristas</h1>
            <p className="text-muted-foreground">Gerencie sua equipe de manobristas</p>
          </div>
          <Button className="gap-2 bg-gradient-primary hover:opacity-90" disabled={!canAssignTask}>
            <Plus className="h-4 w-4" />
            Novo Manobrista
          </Button>
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
              <p className="text-2xl font-bold text-foreground">{availableCount}</p>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="rounded-xl bg-warning/10 p-3">
              <Users className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{busyCount}</p>
              <p className="text-sm text-muted-foreground">Em atendimento</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {shiftFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={shiftFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShiftFilter(filter.value)}
                  className={cn(shiftFilter === filter.value && "bg-primary")}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {filteredAttendants.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAttendants.map((attendant) => (
              <AttendantCard
                key={attendant.id}
                attendant={attendant}
                canAssignTask={canAssignTask}
                onAssignTask={(item) => {
                  setSelectedAttendant(item);
                  setAssignOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="stat-card flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold text-foreground">Nenhum manobrista encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros ou realizar uma nova busca
            </p>
          </div>
        )}
      </div>

      <AssignTaskDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        initialAttendantId={selectedAttendant?.id}
      />
    </MainLayout>
  );
}
