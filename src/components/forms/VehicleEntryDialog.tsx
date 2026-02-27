import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DEFAULT_UNIT_NAME } from "@/config/pricing";
import { PrepaidChargeDialog, type PrepaidChargeSelection } from "@/components/forms/PrepaidChargeDialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVehicleMutation } from "@/hooks/useValetData";
import { formatCurrencyBRL } from "@/lib/format";
import type { ContractType } from "@/types/valet";

const standardPlateRegex = /^[A-Z]{3}-\d{4}$/;
const mercosulPlateRegex = /^[A-Z]{3}\d[A-Z]\d{2}$/;

const schema = z
  .object({
    isMercosul: z.boolean(),
    plate: z.string(),
    model: z.string().min(1, "Modelo obrigatorio"),
    clientName: z.string().min(2, "Nome do cliente obrigatorio"),
    clientPhone: z.string().optional(),
    observations: z.string().optional(),
    contractType: z.enum(["hourly", "daily", "monthly", "agreement"]),
    createInspection: z.boolean(),
    prepaidEnabled: z.boolean(),
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
          ? "Placa Mercosul invalida (ex: ABC1D23)"
          : "Placa invalida (ex: FRD-4486)",
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [prepaidSelection, setPrepaidSelection] = useState<PrepaidChargeSelection | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isMercosul: false,
      plate: "",
      model: "",
      clientName: "",
      clientPhone: "",
      observations: "",
      contractType: "hourly",
      createInspection: false,
      prepaidEnabled: false,
    },
  });

  const isMercosul = form.watch("isMercosul");
  const plate = form.watch("plate");
  const phone = form.watch("clientPhone") ?? "";
  const prepaidEnabled = form.watch("prepaidEnabled");

  const onSubmit = form.handleSubmit(async (values) => {
    await createVehicle.mutateAsync({
      plate: values.plate,
      model: values.model,
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      observations: values.observations,
      contractType: values.contractType as ContractType,
      unitName: DEFAULT_UNIT_NAME,
      createInspection: values.createInspection,
      prepaidAmount: values.prepaidEnabled ? prepaidSelection?.amount : 0,
      prepaidAgreementId: values.prepaidEnabled ? prepaidSelection?.agreementId : "none",
      prepaidPaymentMethod: values.prepaidEnabled ? prepaidSelection?.paymentMethod : undefined,
    });

    form.reset();
    setPrepaidSelection(null);
    onOpenChange(false);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Entrada</DialogTitle>
            <DialogDescription>Registre um veiculo no patio.</DialogDescription>
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
              <Label>Tipo de contrato</Label>
              <Select
                value={form.watch("contractType")}
                onValueChange={(value) =>
                  form.setValue("contractType", value as FormValues["contractType"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Avulso por hora</SelectItem>
                  <SelectItem value="daily">Diaria</SelectItem>
                  <SelectItem value="monthly">Mensalista</SelectItem>
                  <SelectItem value="agreement">Convenio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observacoes</Label>
              <Textarea id="observations" placeholder="Observacoes do veiculo" {...form.register("observations")} />
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createInspection"
                  checked={form.watch("createInspection")}
                  onCheckedChange={(checked) => form.setValue("createInspection", Boolean(checked))}
                />
                <Label htmlFor="createInspection">Criar vistoria para este veiculo</Label>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="prepaidEnabled"
                  checked={prepaidEnabled}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    form.setValue("prepaidEnabled", enabled);
                    if (!enabled) {
                      setPrepaidSelection(null);
                    }
                  }}
                />
                <Label htmlFor="prepaidEnabled">Cobrar diaria antecipada</Label>
              </div>

              {prepaidEnabled && (
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                    Configurar cobranca antecipada
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Valor selecionado: {formatCurrencyBRL(prepaidSelection?.amount ?? 0)}
                  </p>
                </div>
              )}
            </div>

            {Object.values(form.formState.errors).length > 0 && (
              <p className="text-sm text-destructive">Campos obrigatorios: placa, modelo e cliente.</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createVehicle.isPending || (prepaidEnabled && !prepaidSelection)}>
                {createVehicle.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PrepaidChargeDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        plate={form.watch("plate")}
        model={form.watch("model")}
        clientName={form.watch("clientName")}
        initial={prepaidSelection ?? undefined}
        onConfirm={setPrepaidSelection}
      />
    </>
  );
}
