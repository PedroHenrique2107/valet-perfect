import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVehicleMutation } from "@/hooks/useValetData";

const standardPlateRegex = /^[A-Z]{3}-\d{4}$/;
const mercosulPlateRegex = /^[A-Z]{3}\d[A-Z]\d{2}$/;

const schema = z
  .object({
    isMercosul: z.boolean(),
    plate: z.string(),
    model: z.string().min(1, "Modelo obrigatório"),
    clientName: z.string().min(2, "Nome do cliente obrigatório"),
    clientPhone: z.string().optional(),
    observations: z.string().optional(),
    prepaidAmount: z.coerce.number().min(0, "Valor inválido").optional(),
  })
  .superRefine((data, ctx) => {
    const validPlate = data.isMercosul
      ? mercosulPlateRegex.test(data.plate)
      : standardPlateRegex.test(data.plate);

    if (!validPlate) {
      ctx.addIssue({
        code: "custom",
        path: ["plate"],
        message: data.isMercosul
          ? "Placa Mercosul inválida (ex: ABC1D23)"
          : "Placa inválida (ex: FRD-4486)",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface VehicleEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatStandardPlate(value: string): string {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const letters = raw.replace(/\d/g, "").slice(0, 3);
  const numbers = raw.replace(/\D/g, "").slice(0, 4);
  return numbers.length > 0 ? `${letters}-${numbers}` : letters;
}

function formatMercosulPlate(value: string): string {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const pattern: Array<"L" | "N"> = ["L", "L", "L", "N", "L", "N", "N"];

  let result = "";
  let rawIndex = 0;

  for (const item of pattern) {
    while (rawIndex < raw.length) {
      const char = raw[rawIndex];
      rawIndex += 1;
      if (item === "L" && /[A-Z]/.test(char)) {
        result += char;
        break;
      }
      if (item === "N" && /\d/.test(char)) {
        result += char;
        break;
      }
    }
  }

  return result;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const firstPart = digits.slice(2, 7);
  const secondPart = digits.slice(7, 11);

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${ddd}` : "";
  }
  if (digits.length <= 7) {
    return `(${ddd}) ${firstPart}`;
  }
  return `(${ddd}) ${firstPart}-${secondPart}`;
}

export function VehicleEntryDialog({ open, onOpenChange }: VehicleEntryDialogProps) {
  const createVehicle = useCreateVehicleMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isMercosul: false,
      plate: "",
      model: "",
      clientName: "",
      clientPhone: "",
      observations: "",
      prepaidAmount: 0,
    },
  });

  const isMercosul = form.watch("isMercosul");
  const plate = form.watch("plate");
  const phone = form.watch("clientPhone") ?? "";

  const onSubmit = form.handleSubmit(async (values) => {
    await createVehicle.mutateAsync({
      plate: values.plate,
      model: values.model,
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      observations: values.observations,
      prepaidAmount: values.prepaidAmount,
    });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Entrada</DialogTitle>
          <DialogDescription>Registre um veículo no pátio.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="plate">Placa *</Label>
            <Input
              id="plate"
              placeholder={isMercosul ? "ABC1D23" : "FRD-4486"}
              value={plate}
              onChange={(event) => {
                const formatted = isMercosul
                  ? formatMercosulPlate(event.target.value)
                  : formatStandardPlate(event.target.value);
                form.setValue("plate", formatted, { shouldValidate: true });
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isMercosul"
              checked={isMercosul}
              onCheckedChange={(checked) => {
                const enabled = Boolean(checked);
                form.setValue("isMercosul", enabled);
                form.setValue(
                  "plate",
                  enabled ? formatMercosulPlate(plate) : formatStandardPlate(plate),
                  { shouldValidate: true },
                );
              }}
            />
            <Label htmlFor="isMercosul">Placa Mercosul (ABC1D23)</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modelo *</Label>
            <Input id="model" placeholder="Modelo" {...form.register("model")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Nome do Cliente *</Label>
            <Input id="clientName" placeholder="Nome do cliente" {...form.register("clientName")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Telefone do Cliente</Label>
            <Input
              id="clientPhone"
              placeholder="(11) 12345-6789"
              value={phone}
              onChange={(event) => {
                form.setValue("clientPhone", formatPhone(event.target.value), { shouldValidate: true });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea id="observations" placeholder="Observações do veículo" {...form.register("observations")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prepaidAmount">Pagamento Antecipado</Label>
            <Input
              id="prepaidAmount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              {...form.register("prepaidAmount")}
            />
          </div>

          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">Campos obrigatórios: Placa, Modelo e Nome do Cliente.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createVehicle.isPending}>
              {createVehicle.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
