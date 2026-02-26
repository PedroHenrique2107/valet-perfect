import { AlertCircle, Plus, QrCode, Receipt, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  className?: string;
  permissions: {
    createVehicle: boolean;
    registerExit: boolean;
    createClient: boolean;
  };
  onNewEntry: () => void;
  onRegisterExit: () => void;
  onCreateClient: () => void;
}

const actions = [
  { id: "new-entry", icon: Plus, label: "Nova Entrada", description: "Registrar veículo", gradient: true },
  { id: "search", icon: Search, label: "Buscar Veículo", description: "Por placa ou cliente" },
  { id: "scan", icon: QrCode, label: "Ler QR Code", description: "Scanner rápido" },
  { id: "exit", icon: Receipt, label: "Registrar Saída", description: "Checkout" },
  { id: "new-client", icon: UserPlus, label: "Novo Cliente", description: "Cadastrar" },
  { id: "incident", icon: AlertCircle, label: "Reportar", description: "Incidente" },
] as const;

export function QuickActions({
  className,
  permissions,
  onNewEntry,
  onRegisterExit,
  onCreateClient,
}: QuickActionsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6", className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        const disabled =
          (action.id === "new-entry" && !permissions.createVehicle) ||
          (action.id === "exit" && !permissions.registerExit) ||
          (action.id === "new-client" && !permissions.createClient);
        const onClick =
          action.id === "new-entry"
            ? onNewEntry
            : action.id === "exit"
              ? onRegisterExit
              : action.id === "new-client"
                ? onCreateClient
                : undefined;

        return (
          <Button
            key={action.label}
            variant={action.gradient ? "default" : "outline"}
            className={cn(
              "h-auto flex-col gap-2 px-3 py-4",
              action.gradient && "border-0 bg-gradient-primary hover:opacity-90",
              !action.gradient && "hover:bg-muted/50",
            )}
            disabled={disabled}
            onClick={onClick}
          >
            <Icon className="h-5 w-5" />
            <div className="text-center">
              <p className="text-sm font-medium">{action.label}</p>
              <p className={cn("text-[10px]", action.gradient ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {action.description}
              </p>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
