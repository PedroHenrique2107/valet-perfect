import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateParkingSpotConfigMutation } from "@/hooks/useValetData";
import { useToast } from "@/hooks/use-toast";
import type { ParkingSpot } from "@/types/valet";

type QuickCategory = "default" | "maintenance" | "vip" | "electric" | "accessible";

const categoryOptions: Array<{ value: QuickCategory; label: string }> = [
  { value: "default", label: "Disponivel" },
  { value: "maintenance", label: "Manutencao" },
  { value: "vip", label: "Credenciado / VIP" },
  { value: "electric", label: "Eletrico" },
  { value: "accessible", label: "Cadeirante" },
];

interface ParkingSpotStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spot: ParkingSpot | null;
}

function getCategoryFromSpot(spot: ParkingSpot | null): QuickCategory {
  if (!spot) return "default";
  if (spot.status === "maintenance") return "maintenance";
  if (spot.type === "vip") return "vip";
  if (spot.type === "electric") return "electric";
  if (spot.type === "accessible") return "accessible";
  return "default";
}

export function ParkingSpotStatusDialog({
  open,
  onOpenChange,
  spot,
}: ParkingSpotStatusDialogProps) {
  const updateParkingSpot = useUpdateParkingSpotConfigMutation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<QuickCategory>("default");

  useEffect(() => {
    if (!open) return;
    setSelectedCategory(getCategoryFromSpot(spot));
  }, [open, spot]);

  const isLocked = Boolean(spot?.vehicleId) || spot?.status === "occupied";

  const handleSubmit = async () => {
    if (!spot || isLocked) return;

    const nextType: ParkingSpot["type"] =
      selectedCategory === "vip"
        ? "vip"
        : selectedCategory === "electric"
          ? "electric"
          : selectedCategory === "accessible"
            ? "accessible"
            : "regular";
    const nextStatus: ParkingSpot["status"] = selectedCategory === "maintenance" ? "maintenance" : "available";

    await updateParkingSpot.mutateAsync({
      spotId: spot.id,
      code: spot.code,
      floor: spot.floor,
      section: spot.section,
      type: nextType,
      status: nextStatus,
      observations: spot.observations,
    });

    toast({
      title: "Status atualizado",
      description: `${spot.code} agora esta como ${categoryOptions.find((item) => item.value === selectedCategory)?.label}.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Status da vaga</DialogTitle>
          <DialogDescription>
            Escolha uma categoria rapida para a vaga selecionada ou volte ao padrao disponivel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vaga</p>
            <p className="mt-1 font-medium text-foreground">{spot?.code ?? "-"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as QuickCategory)} disabled={isLocked}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLocked ? (
            <p className="text-sm text-destructive">
              Nao e possivel alterar a categoria de uma vaga ocupada ou com veiculo vinculado.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={updateParkingSpot.isPending || isLocked}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
