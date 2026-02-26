import { useEffect } from "react";
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
import { useRegisterVehicleExitMutation, useVehiclesQuery } from "@/hooks/useValetData";

const schema = z.object({
  vehicleId: z.string().min(1, "Selecione um veículo"),
  paymentMethod: z.enum(["pix", "credit", "debit", "cash", "monthly"]),
  amount: z.coerce.number().min(1, "Valor inválido"),
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
      amount: 45,
    },
  });

  useEffect(() => {
    if (initialVehicleId) {
      form.setValue("vehicleId", initialVehicleId);
    }
  }, [form, initialVehicleId]);

  const onSubmit = form.handleSubmit(async (values) => {
    await registerExit.mutateAsync(values);
    form.reset({
      vehicleId: "",
      paymentMethod: "pix",
      amount: 45,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Saída</DialogTitle>
          <DialogDescription>Finalize a permanência e gere a transação.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <Select
            value={form.watch("vehicleId")}
            onValueChange={(value) => form.setValue("vehicleId", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o veículo" />
            </SelectTrigger>
            <SelectContent>
              {activeVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.clientName}
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
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="debit">Débito</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="monthly">Mensalista</SelectItem>
            </SelectContent>
          </Select>

          <Input type="number" min={1} step="0.01" placeholder="Valor" {...form.register("amount")} />

          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">Confira os dados para registrar a saída.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={registerExit.isPending}>
              {registerExit.isPending ? "Salvando..." : "Registrar Saída"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
