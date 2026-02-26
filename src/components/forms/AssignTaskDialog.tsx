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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAssignTaskMutation,
  useAttendantsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";

const schema = z.object({
  attendantId: z.string().min(1, "Selecione um manobrista"),
  vehicleId: z.string().min(1, "Selecione um veículo"),
});

type FormValues = z.infer<typeof schema>;

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAttendantId?: string;
}

export function AssignTaskDialog({ open, onOpenChange, initialAttendantId }: AssignTaskDialogProps) {
  const { data: attendants = [] } = useAttendantsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();
  const assignTask = useAssignTaskMutation();

  const availableAttendants = attendants.filter((attendant) => attendant.isOnline);
  const eligibleVehicles = vehicles.filter((vehicle) => vehicle.status !== "delivered");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      attendantId: initialAttendantId ?? "",
      vehicleId: "",
    },
  });

  useEffect(() => {
    if (initialAttendantId) {
      form.setValue("attendantId", initialAttendantId);
    }
  }, [form, initialAttendantId]);

  const onSubmit = form.handleSubmit(async (values) => {
    await assignTask.mutateAsync(values);
    form.reset({ attendantId: "", vehicleId: "" });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Tarefa</DialogTitle>
          <DialogDescription>Associe um veículo a um manobrista.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <Select
            value={form.watch("attendantId")}
            onValueChange={(value) => form.setValue("attendantId", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Manobrista" />
            </SelectTrigger>
            <SelectContent>
              {availableAttendants.map((attendant) => (
                <SelectItem key={attendant.id} value={attendant.id}>
                  {attendant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={form.watch("vehicleId")}
            onValueChange={(value) => form.setValue("vehicleId", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent>
              {eligibleVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">Selecione manobrista e veículo.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assignTask.isPending}>
              {assignTask.isPending ? "Salvando..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
