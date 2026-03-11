import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateParkingSpotMutation,
  useUpdateParkingSpotConfigMutation,
} from "@/hooks/useValetData";
import type { ParkingSpot } from "@/types/valet";

const schema = z.object({
  code: z.string().min(2, "Informe o codigo da vaga"),
  floor: z.coerce.number().min(1, "Piso minimo 1"),
  section: z.string().min(1, "Informe a secao"),
  type: z.enum(["regular", "vip", "accessible", "electric", "motorcycle"]),
  status: z.enum(["available", "maintenance", "blocked", "occupied"]),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ParkingSpotConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spot: ParkingSpot | null;
  mode?: "create" | "edit";
  floorOptions: number[];
  sectionsByFloor: Record<number, string[]>;
}

const typeLabels: Record<ParkingSpot["type"], string> = {
  regular: "Regular",
  vip: "Credenciado / VIP",
  accessible: "Cadeirante",
  electric: "Eletrico",
  motorcycle: "Moto",
};

const statusLabels: Record<ParkingSpot["status"], string> = {
  available: "Disponivel",
  occupied: "Ocupada",
  maintenance: "Manutencao",
  blocked: "Bloqueada",
};

export function ParkingSpotConfigDialog({
  open,
  onOpenChange,
  spot,
  mode = "edit",
  floorOptions,
  sectionsByFloor,
}: ParkingSpotConfigDialogProps) {
  const updateParkingSpot = useUpdateParkingSpotConfigMutation();
  const createParkingSpot = useCreateParkingSpotMutation();
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      floor: floorOptions[0] ?? 1,
      section: sectionsByFloor[floorOptions[0] ?? 1]?.[0] ?? "",
      type: "regular",
      status: "available",
      observations: "",
    },
  });

  const isCreate = mode === "create";

  useEffect(() => {
    if (isCreate) {
      form.reset({
        code: "",
        floor: floorOptions[0] ?? 1,
        section: sectionsByFloor[floorOptions[0] ?? 1]?.[0] ?? "",
        type: "regular",
        status: "available",
        observations: "",
      });
      return;
    }

    if (!spot) return;
    form.reset({
      code: spot.code,
      floor: spot.floor,
      section: spot.section,
      type: spot.type,
      status: spot.status,
      observations: spot.observations ?? "",
    });
  }, [floorOptions, form, isCreate, sectionsByFloor, spot]);

  const selectedFloor = form.watch("floor");
  const availableSections = sectionsByFloor[selectedFloor] ?? [];

  useEffect(() => {
    if (!open) return;
    const currentSection = form.getValues("section");
    if (!availableSections.includes(currentSection)) {
      form.setValue("section", availableSections[0] ?? "", { shouldValidate: true });
    }
  }, [availableSections, form, open, selectedFloor]);

  const allowedStatuses = useMemo(() => {
    if (spot?.vehicleId) {
      return ["occupied"] as const;
    }
    return ["available", "maintenance", "blocked"] as const;
  }, [spot?.vehicleId]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isCreate) {
      await createParkingSpot.mutateAsync({
        code: values.code,
        floor: values.floor,
        section: values.section,
        type: values.type,
        status: values.status === "occupied" ? "available" : values.status,
        observations: values.observations,
      });
      toast({
        title: "Vaga criada",
        description: `${values.code.toUpperCase()} foi adicionada ao mapa.`,
      });
      onOpenChange(false);
      return;
    }

    if (!spot) return;
    await updateParkingSpot.mutateAsync({
      spotId: spot.id,
      code: values.code,
      floor: values.floor,
      section: values.section,
      type: values.type,
      status: values.status,
      observations: values.observations,
    });

    toast({
      title: "Vaga atualizada",
      description: `${values.code.toUpperCase()} foi atualizada com sucesso.`,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Nova vaga" : `Editar vaga ${spot?.code ?? ""}`}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Cadastre uma nova vaga escolhendo um piso e uma secao ja existentes."
              : "Renomeie, mova e ajuste a vaga selecionada."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Codigo</p>
              <Input {...form.register("code")} placeholder="Ex.: A-26" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Piso</p>
              <Select
                value={String(selectedFloor)}
                onValueChange={(value) => form.setValue("floor", Number(value), { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o piso" />
                </SelectTrigger>
                <SelectContent>
                  {floorOptions.map((floor) => (
                    <SelectItem key={floor} value={String(floor)}>
                      Piso {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Secao</p>
              <Select
                value={form.watch("section")}
                onValueChange={(value) => form.setValue("section", value, { shouldValidate: true })}
                disabled={availableSections.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a secao" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((section) => (
                    <SelectItem key={section} value={section}>
                      Secao {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</p>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as FormValues["type"], { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as FormValues["status"], { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusLabels[value]}
                    </SelectItem>
                  ))}
                  {isCreate && (
                    <SelectItem value="occupied" disabled>
                      Ocupada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observacoes operacionais</p>
            <Textarea
              {...form.register("observations")}
              placeholder="Informacoes adicionais, restricoes ou observacoes de manutencao"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateParkingSpot.isPending || createParkingSpot.isPending}
            >
              {isCreate ? "Criar vaga" : "Salvar alteracoes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
