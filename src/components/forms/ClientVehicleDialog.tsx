import { useState } from "react";
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
import { useAddClientVehicleMutation } from "@/hooks/useValetData";
import type { Client } from "@/types/valet";

const schema = z.object({
  plate: z.string().min(7, "Informe uma placa valida"),
  driverName: z.string().optional(),
  model: z.string().min(2, "Informe o modelo do veiculo"),
});

type FormValues = z.infer<typeof schema>;

function normalizePlate(value: string) {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const standard = `${raw.slice(0, 3)}-${raw.slice(3, 7)}`.replace(/-$/, "");
  return raw.length >= 7 && /\d/.test(raw.slice(3, 4)) && /[A-Z]/.test(raw.slice(4, 5)) ? raw.slice(0, 7) : standard;
}

interface ClientVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientVehicleDialog({ open, onOpenChange, client }: ClientVehicleDialogProps) {
  const addClientVehicle = useAddClientVehicleMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plate: "", driverName: "", model: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!client) return;
    setSubmitError(null);

    const normalizedPlate = normalizePlate(values.plate);

    if (client.vehicles.some((plate) => normalizePlate(plate) === normalizedPlate)) {
      setSubmitError("Esta placa ja esta vinculada a este cliente.");
      return;
    }

    if (client.category === "monthly" && client.vehicles.length >= 3) {
      setSubmitError("Mensalista pode cadastrar no maximo 3 placas.");
      return;
    }

    try {
      await addClientVehicle.mutateAsync({
        clientId: client.id,
        plate: normalizedPlate,
        driverName: values.driverName,
        model: values.model,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Nao foi possivel adicionar a placa.");
    }
  });

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar veiculo</DialogTitle>
          <DialogDescription>
            {client.category === "monthly"
              ? "Mensalista pode cadastrar no maximo 3 placas."
              : "Credenciado pode continuar ampliando a frota cadastrada."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            placeholder="ABC-1234 ou ABC1D23"
            value={form.watch("plate")}
            onChange={(event) => form.setValue("plate", normalizePlate(event.target.value), { shouldValidate: true })}
          />
          <Input
            placeholder="Modelo do veiculo"
            value={form.watch("model") ?? ""}
            onChange={(event) => form.setValue("model", event.target.value, { shouldValidate: true })}
          />
          {client.category === "agreement" ? (
            <Input
              placeholder="Nome do condutor"
              value={form.watch("driverName") ?? ""}
              onChange={(event) => form.setValue("driverName", event.target.value, { shouldValidate: true })}
            />
          ) : null}
          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addClientVehicle.isPending}>
              {addClientVehicle.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
