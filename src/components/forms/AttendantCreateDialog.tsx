import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PARKING_OPTIONS } from "@/config/parkings";
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
import { useCreateAttendantMutation } from "@/hooks/useValetData";
import { useAppSettings } from "@/lib/app-settings";
import { useToast } from "@/hooks/use-toast";

const PHONE_REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;

const schema = z
  .object({
    name: z.string().min(3, "Informe nome completo"),
    phone: z.string().regex(PHONE_REGEX, "Use o formato (99) 99999-9999"),
    parkingId: z.string().min(1, "Selecione o estacionamento"),
    workPeriodStart: z.string().min(1, "Informe inicio"),
    workPeriodEnd: z.string().min(1, "Informe fim"),
    maxWorkHours: z.coerce.number().min(1, "Minimo 1 hora").max(24, "Maximo 24 horas"),
  })
  .refine((values) => values.workPeriodStart !== values.workPeriodEnd, {
    message: "Inicio e fim nao podem ser iguais",
    path: ["workPeriodEnd"],
  });

type FormValues = z.infer<typeof schema>;

interface AttendantCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getWorkHours(start: string, end: string): number {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const diff = endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
  return Math.max(1, Number((diff / 60).toFixed(2)));
}

function formatWorkHours(hours: number): string {
  const fullHours = Math.floor(hours);
  const minutes = Math.round((hours - fullHours) * 60);
  return `${fullHours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function AttendantCreateDialog({ open, onOpenChange }: AttendantCreateDialogProps) {
  const createAttendant = useCreateAttendantMutation();
  const settings = useAppSettings();
  const { toast } = useToast();
  const defaultShift = settings.shiftRules[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      parkingId: PARKING_OPTIONS[0].id,
      workPeriodStart: defaultShift?.startTime ?? "08:00",
      workPeriodEnd: defaultShift?.endTime ?? "17:00",
      maxWorkHours: defaultShift?.maxWorkHours ?? getWorkHours("08:00", "17:00"),
    },
  });

  const start = form.watch("workPeriodStart");
  const end = form.watch("workPeriodEnd");
  const calculatedHours = useMemo(() => getWorkHours(start, end), [end, start]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createAttendant.mutateAsync({
      ...values,
      maxWorkHours: calculatedHours,
      parkingId: PARKING_OPTIONS[0].id,
    });
    toast({
      title: "Manobrista criado",
      description: `${values.name} foi cadastrado com sucesso.`,
    });
    form.reset({
      name: "",
      phone: "",
      parkingId: PARKING_OPTIONS[0].id,
      workPeriodStart: defaultShift?.startTime ?? "08:00",
      workPeriodEnd: defaultShift?.endTime ?? "17:00",
      maxWorkHours: defaultShift?.maxWorkHours ?? getWorkHours("08:00", "17:00"),
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Manobrista</DialogTitle>
          <DialogDescription>
            Cadastro vinculado ao estacionamento {PARKING_OPTIONS[0].name}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            placeholder="Nome completo"
            value={form.watch("name")}
            onChange={(event) => form.setValue("name", event.target.value, { shouldValidate: true })}
          />

          <Input
            placeholder="(99) 99999-9999"
            value={form.watch("phone")}
            onChange={(event) =>
              form.setValue("phone", formatPhoneInput(event.target.value), { shouldValidate: true })
            }
            inputMode="numeric"
          />

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Patio/Estacionamento</p>
            <Input value={PARKING_OPTIONS[0].name} readOnly />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Inicio do periodo</p>
              <Input
                type="time"
                value={start}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  form.setValue("workPeriodStart", nextStart, { shouldValidate: true });
                  form.setValue("maxWorkHours", getWorkHours(nextStart, end), { shouldValidate: true });
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fim do periodo</p>
              <Input
                type="time"
                value={end}
                onChange={(event) => {
                  const nextEnd = event.target.value;
                  form.setValue("workPeriodEnd", nextEnd, { shouldValidate: true });
                  form.setValue("maxWorkHours", getWorkHours(start, nextEnd), { shouldValidate: true });
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Carga horaria calculada automaticamente</p>
            <Input value={formatWorkHours(calculatedHours)} readOnly />
          </div>

          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">Revise os campos obrigatorios.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createAttendant.isPending}>
              {createAttendant.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
