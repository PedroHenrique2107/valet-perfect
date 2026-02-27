import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AGREEMENT_OPTIONS, calculateAmountByDuration } from "@/config/pricing";
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
import { useRegisterVehicleExitMutation, useVehiclesQuery } from "@/hooks/useValetData";
import { formatCurrencyBRL, formatDurationMinutes } from "@/lib/format";

const schema = z.object({
  vehicleId: z.string().min(1, "Selecione um veiculo"),
  paymentMethod: z.enum(["pix", "credit", "debit", "cash", "monthly"]),
  agreementId: z.string().min(1),
  amount: z.coerce.number().min(1, "Valor invalido"),
});

type FormValues = z.infer<typeof schema>;

interface VehicleExitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVehicleId?: string;
}

export function VehicleExitDialog({ open, onOpenChange, initialVehicleId }: VehicleExitDialogProps) {
  const { data: vehicles = [] } = useVehiclesQuery();
  const registerExit = useRegisterVehicleExitMutation();

  const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== "delivered");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: initialVehicleId ?? "",
      paymentMethod: "pix",
      agreementId: "none",
      amount: 45,
    },
  });

  useEffect(() => {
    if (initialVehicleId) {
      form.setValue("vehicleId", initialVehicleId);
    }
  }, [form, initialVehicleId]);

  const selectedVehicle = activeVehicles.find((vehicle) => vehicle.id === form.watch("vehicleId"));
  const durationMinutes = selectedVehicle
    ? Math.max(1, Math.round((Date.now() - selectedVehicle.entryTime.getTime()) / 60000))
    : 0;

  const pricing = useMemo(() => {
    if (!selectedVehicle) {
      return { gross: 0, discount: 0, net: 0 };
    }
    return calculateAmountByDuration(durationMinutes, form.watch("agreementId"));
  }, [durationMinutes, form, selectedVehicle]);

  useEffect(() => {
    if (selectedVehicle) {
      form.setValue("amount", pricing.net, { shouldValidate: true });
    }
  }, [form, pricing.net, selectedVehicle]);

  const onSubmit = form.handleSubmit(async (values) => {
    await registerExit.mutateAsync({
      vehicleId: values.vehicleId,
      paymentMethod: values.paymentMethod,
      amount: values.amount,
    });
    form.reset({
      vehicleId: "",
      paymentMethod: "pix",
      agreementId: "none",
      amount: 45,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Saida</DialogTitle>
          <DialogDescription>Finalize a permanencia e gere a transacao.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <Select
            value={form.watch("vehicleId")}
            onValueChange={(value) => form.setValue("vehicleId", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o veiculo" />
            </SelectTrigger>
            <SelectContent>
              {activeVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedVehicle && (
            <div className="rounded-md border p-3 text-sm">
              <p><strong>Placa:</strong> {selectedVehicle.plate}</p>
              <p><strong>Cliente:</strong> {selectedVehicle.clientName}</p>
              <p><strong>Telefone:</strong> {selectedVehicle.clientPhone || "-"}</p>
              <p><strong>Tempo registrado:</strong> {formatDurationMinutes(durationMinutes)}</p>
            </div>
          )}

          <Select
            value={form.watch("agreementId")}
            onValueChange={(value) => form.setValue("agreementId", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Convenio" />
            </SelectTrigger>
            <SelectContent>
              {AGREEMENT_OPTIONS.map((agreement) => (
                <SelectItem key={agreement.id} value={agreement.id}>
                  {agreement.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={form.watch("paymentMethod")}
            onValueChange={(value) =>
              form.setValue("paymentMethod", value as FormValues["paymentMethod"], { shouldValidate: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Forma de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="credit">Credito</SelectItem>
              <SelectItem value="debit">Debito</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="monthly">Mensalista</SelectItem>
            </SelectContent>
          </Select>

          <Input type="number" min={1} step="0.01" placeholder="Valor" {...form.register("amount")} />

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p>Valor bruto: {formatCurrencyBRL(pricing.gross)}</p>
            <p>Desconto convenio: {formatCurrencyBRL(pricing.discount)}</p>
            <p><strong>Valor sugerido:</strong> {formatCurrencyBRL(pricing.net)}</p>
          </div>

          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">Confira os dados para registrar a saida.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={registerExit.isPending}>
              {registerExit.isPending ? "Salvando..." : "Registrar Saida"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
