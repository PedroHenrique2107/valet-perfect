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
  usageRule: z.string().min(2, "Informe a regra de uso"),
  capacity: z.coerce.number().min(1, "Capacidade minima 1").max(10, "Capacidade maxima 10"),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ParkingSpotConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spot: ParkingSpot | null;
  mode?: "create" | "edit";
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
}: ParkingSpotConfigDialogProps) {
  const updateParkingSpot = useUpdateParkingSpotConfigMutation();
  const createParkingSpot = useCreateParkingSpotMutation();
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      floor: 1,
      section: "A",
      type: "regular",
      status: "available",
      usageRule: "Operacao geral",
      capacity: 1,
      observations: "",
    },
  });

  const isCreate = mode === "create";

  useEffect(() => {
    if (isCreate) {
      form.reset({
        code: "",
        floor: 1,
        section: "A",
        type: "regular",
        status: "available",
        usageRule: "Operacao geral",
        capacity: 1,
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
      usageRule: spot.usageRule ?? "Operacao geral",
      capacity: spot.capacity ?? 1,
      observations: spot.observations ?? "",
    });
  }, [form, isCreate, spot]);

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
        usageRule: values.usageRule,
        capacity: values.capacity,
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
      usageRule: values.usageRule,
      capacity: values.capacity,
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
              ? "Cadastre uma nova vaga com regras de uso e configuracao operacional."
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
              <Input type="number" min={1} {...form.register("floor")} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Secao</p>
              <Input {...form.register("section")} placeholder="Ex.: A, VIP, D" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capacidade</p>
              <Input type="number" min={1} max={10} {...form.register("capacity")} />
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Regra de uso</p>
            <Input {...form.register("usageRule")} placeholder="Ex.: Credenciado, carga e descarga, operacao geral" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observacoes operacionais</p>
            <Textarea
              {...form.register("observations")}
              placeholder="Informacoes adicionais, restricoes, observacoes de manutencao ou uso da vaga"
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
