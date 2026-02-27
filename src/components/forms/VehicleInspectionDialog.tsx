import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTimeBR } from "@/lib/format";
import type { Vehicle } from "@/types/valet";

interface VehicleInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

const checklistItems = [
  { key: "leftSide", label: "Lado esquerdo (arranhoes?)" },
  { key: "rightSide", label: "Lado direito" },
  { key: "frontBumper", label: "Para-choque dianteiro" },
  { key: "rearBumper", label: "Para-choque traseiro" },
  { key: "wheels", label: "Rodas" },
  { key: "mirrors", label: "Retrovisores" },
  { key: "roof", label: "Teto" },
  { key: "windows", label: "Vidros" },
  { key: "interior", label: "Interior" },
] as const;

export function VehicleInspectionDialog({ open, onOpenChange, vehicle }: VehicleInspectionDialogProps) {
  if (!vehicle) return null;

  const inspection = vehicle.inspection;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Vistoria - {vehicle.plate}</DialogTitle>
          <DialogDescription>Checklist obrigatorio do registro de entrada.</DialogDescription>
        </DialogHeader>

        {inspection ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {checklistItems.map((item) => (
                <label key={item.key} className="flex items-center gap-2 rounded border p-2">
                  <Checkbox checked={inspection[item.key]} disabled />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Vistoria finalizada em {formatDateTimeBR(inspection.completedAt)}</p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma vistoria registrada para este veiculo.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
