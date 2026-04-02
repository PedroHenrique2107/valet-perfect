import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { calculateAmountByDuration } from "@/config/pricing";
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
import { useRegisterVehicleExitMutation, useVehiclesQuery } from "@/hooks/useValetData";
import { useAppSettings } from "@/lib/app-settings";
import { formatCurrencyBRL, formatDurationPrecise } from "@/lib/format";

const schema = z.object({
  vehicleId: z.string().min(1, "Selecione um veiculo"),
  paymentMethod: z.enum(["pix", "credit", "debit", "cash", "monthly"]),
  agreementId: z.string().min(1),
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
  const settings = useAppSettings();
  const [now, setNow] = useState(Date.now());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== "delivered");
  const isLockedVehicle = Boolean(initialVehicleId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: initialVehicleId ?? "",
      paymentMethod: "pix",
      agreementId: "none",
    },
  });

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    setSubmitError(null);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (initialVehicleId) {
      form.setValue("vehicleId", initialVehicleId);
    }
  }, [form, initialVehicleId]);

  const selectedVehicle = activeVehicles.find((vehicle) => vehicle.id === form.watch("vehicleId"));
  const durationSeconds = selectedVehicle ? Math.max(1, Math.floor((now - selectedVehicle.entryTime.getTime()) / 1000)) : 0;
  const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const recurringExempt = Boolean(
    selectedVehicle?.linkedClientId &&
      (selectedVehicle.recurringClientCategory === "monthly" || selectedVehicle.recurringClientCategory === "agreement"),
  );

  const pricing = useMemo(() => {
    if (!selectedVehicle) return { gross: 0, discount: 0, net: 0 };
    if (selectedVehicle.prepaidPaid || recurringExempt) return { gross: 0, discount: 0, net: 0 };
    return calculateAmountByDuration(durationMinutes, form.watch("agreementId"));
  }, [durationMinutes, form, recurringExempt, selectedVehicle]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerExit.mutateAsync({
        vehicleId: values.vehicleId,
        paymentMethod: recurringExempt ? "monthly" : values.paymentMethod,
        amount: pricing.net,
      });
      form.reset({ vehicleId: initialVehicleId ?? "", paymentMethod: "pix", agreementId: "none" });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel registrar a saida.";
      if (message.toLowerCase().includes("caixa aberto")) {
        setSubmitError("O caixa precisa estar aberto para registrar saidas.");
        return;
      }
      setSubmitError(message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Saida</DialogTitle>
          <DialogDescription>Valor calculado automaticamente pelo tempo registrado.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          {!isLockedVehicle && (
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
                    {vehicle.driverName ? ` | ${vehicle.driverName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedVehicle && (
            <div className="rounded-md border p-3 text-sm">
              <p><strong>Placa:</strong> {selectedVehicle.plate}</p>
              <p><strong>Cliente:</strong> {selectedVehicle.clientName}</p>
              <p><strong>Condutor:</strong> {selectedVehicle.driverName || "-"}</p>
              <p><strong>Telefone:</strong> {selectedVehicle.clientPhone || "-"}</p>
              <p><strong>Tempo registrado:</strong> {formatDurationPrecise(durationSeconds)}</p>
              {selectedVehicle.linkedClientId ? (
                <p>
                  <strong>Tipo do cliente:</strong>{" "}
                  {selectedVehicle.recurringClientCategory === "monthly" ? "Mensalista" : selectedVehicle.recurringClientCategory === "agreement" ? "Credenciado" : "Avulso"}
                </p>
              ) : null}
            </div>
          )}

          {!recurringExempt && !selectedVehicle?.prepaidPaid && (
            <Select
              value={form.watch("agreementId")}
              onValueChange={(value) => form.setValue("agreementId", value, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Convenio" />
              </SelectTrigger>
              <SelectContent>
                {settings.agreementOptions.map((agreement) => (
                  <SelectItem key={agreement.id} value={agreement.id}>
                    {agreement.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!recurringExempt && !selectedVehicle?.prepaidPaid && (
            <Select
              value={form.watch("paymentMethod")}
              onValueChange={(value) => form.setValue("paymentMethod", value as FormValues["paymentMethod"], { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credit">Credito</SelectItem>
                <SelectItem value="debit">Debito</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          )}

          {selectedVehicle?.prepaidPaid ? (
            <div className="rounded-md border border-success/40 bg-success/5 p-3 text-xs">
              <p><strong>Diaria antecipada:</strong> a saida precisa permanecer zerada.</p>
            </div>
          ) : recurringExempt ? (
            <div className="rounded-md border border-success/40 bg-success/5 p-3 text-xs">
              <p><strong>Saida isenta:</strong> este veiculo pertence a um cliente recorrente cadastrado.</p>
            </div>
          ) : null}

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p>Valor bruto: {formatCurrencyBRL(pricing.gross)}</p>
            <p>Desconto convenio: {formatCurrencyBRL(pricing.discount)}</p>
            <p><strong>Valor final:</strong> {formatCurrencyBRL(pricing.net)}</p>
          </div>

          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">Confira os dados para registrar a saida.</p>
          )}
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={registerExit.isPending || !selectedVehicle}>
              {registerExit.isPending ? "Salvando..." : "Registrar Saida"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
