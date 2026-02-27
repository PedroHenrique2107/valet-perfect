import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Vehicle } from "@/types/valet";

interface VehicleInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

export function VehicleInspectionDialog({ open, onOpenChange, vehicle }: VehicleInspectionDialogProps) {
  if (!vehicle) {
    return null;
  }

  const inspection = vehicle.inspection;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Vistoria - {vehicle.plate}</DialogTitle>
          <DialogDescription>Checklist visual registrado no momento da entrada.</DialogDescription>
        </DialogHeader>

        {inspection ? (
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <Field label="Lado esquerdo (arranhoes?)" value={inspection.leftSide} />
            <Field label="Lado direito" value={inspection.rightSide} />
            <Field label="Para-choque dianteiro" value={inspection.frontBumper} />
            <Field label="Para-choque traseiro" value={inspection.rearBumper} />
            <Field label="Rodas" value={inspection.wheels} />
            <Field label="Retrovisores" value={inspection.mirrors} />
            <Field label="Teto" value={inspection.roof} />
            <Field label="Vidros" value={inspection.windows} />
            <Field label="Interior" value={inspection.interior} />
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
