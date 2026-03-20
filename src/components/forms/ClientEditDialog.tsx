import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUpdateClientMutation } from "@/hooks/useValetData";
import { useAppSettings } from "@/lib/app-settings";
import { formatCurrencyBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { calculateAgreementClientFee, calculateMonthlyClientFee } from "@/config/pricing";
import type { Client } from "@/types/valet";

const schema = z.object({
  name: z.string().min(2, "Nome obrigatorio"),
  email: z.string().email("E-mail invalido"),
  phone: z.string().min(15, "Telefone obrigatorio"),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  dueDay: z.coerce.number().min(1).max(31),
  includedSpots: z.coerce.number().min(1).optional(),
  vipSpots: z.coerce.number().min(0).optional(),
  isVip: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

function buildNextPreviewDate(baseDate: Date, dueDay: number) {
  const nextMonth = new Date(baseDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), clampDayToMonth(nextMonth.getFullYear(), nextMonth.getMonth(), dueDay));
}

interface ClientEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientEditDialog({ open, onOpenChange, client }: ClientEditDialogProps) {
  const updateClient = useUpdateClientMutation();
  const settings = useAppSettings();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [driverNames, setDriverNames] = useState<Record<string, string>>({});
  const [vehicleModels, setVehicleModels] = useState<Record<string, string>>({});
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      cnpj: "",
      dueDay: 1,
      includedSpots: 1,
      vipSpots: 0,
      isVip: false,
    },
  });

  useEffect(() => {
    if (!client || !open) return;
    form.reset({
      name: client.name,
      email: client.email,
      phone: client.phone,
      cpf: client.cpf ?? "",
      cnpj: client.cnpj ?? "",
      dueDay: client.billingDueDay,
      includedSpots: client.includedSpots,
      vipSpots: client.vipSpots,
      isVip: client.isVip,
    });
    setDriverNames(client.vehicleDrivers ?? {});
    setVehicleModels(client.vehicleModels ?? {});
  }, [client, form, open]);

  const dueDay = form.watch("dueDay");
  const includedSpots = Math.max(1, Number(form.watch("includedSpots") ?? 1));
  const vipSpots = Math.max(0, Number(form.watch("vipSpots") ?? 0));
  const isVip = form.watch("isVip");
  const projectedFee = useMemo(() => {
    if (!client) return 0;
    return client.category === "agreement"
      ? calculateAgreementClientFee(includedSpots, vipSpots)
      : calculateMonthlyClientFee(isVip);
  }, [client, includedSpots, isVip, vipSpots]);

  const nextPreviewDate = client ? buildNextPreviewDate(client.billingDueDate, dueDay) : null;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!client) return;
    setSubmitError(null);
    try {
      await updateClient.mutateAsync({
        clientId: client.id,
        name: values.name,
        email: values.email,
        phone: values.phone,
        cpf: client.category === "monthly" ? values.cpf : undefined,
        cnpj: client.category === "agreement" ? values.cnpj : undefined,
        dueDay: values.dueDay,
        isVip: client.category === "monthly" ? values.isVip : undefined,
        includedSpots: client.category === "agreement" ? includedSpots : undefined,
        vipSpots: client.category === "agreement" ? vipSpots : undefined,
        monthlyFee: projectedFee,
        vehicleDrivers: client.category === "agreement" ? driverNames : undefined,
        vehicleModels,
      });
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Nao foi possivel atualizar o cliente.");
    }
  });

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>
            A mudanca do dia de vencimento passa a valer no proximo ciclo, sem encurtar o periodo atual.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{client.category === "agreement" ? "Empresa" : "Nome do cliente"}</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.watch("phone")} onChange={(event) => form.setValue("phone", formatPhoneInput(event.target.value), { shouldValidate: true })} />
            </div>
            {client.category === "agreement" ? (
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input {...form.register("cnpj")} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input {...form.register("cpf")} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Dia de vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button" className={cn("w-full justify-between")}>
                    <span>Dia {dueDay}</span>
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(2026, 2, Math.min(28, dueDay))}
                    onSelect={(date) => {
                      if (date) {
                        form.setValue("dueDay", date.getDate(), { shouldValidate: true });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground">
                Vencimento atual: {client.billingDueDate.toLocaleDateString("pt-BR")}
              </p>
              <p className="text-sm text-muted-foreground">
                Proximo ciclo: {nextPreviewDate?.toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Valor projetado</p>
              <p className="mt-1 text-2xl font-bold text-primary">{formatCurrencyBRL(projectedFee)}</p>
            </div>
          </div>

          {client.category === "agreement" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantidade de vagas</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => form.setValue("includedSpots", Math.max(1, includedSpots - 1), { shouldValidate: true })}>-</Button>
                    <div className="flex-1 rounded-lg border border-border/60 bg-muted/20 px-4 py-2 text-center text-lg font-semibold">{includedSpots}</div>
                    <Button type="button" variant="outline" size="icon" onClick={() => form.setValue("includedSpots", includedSpots + 1, { shouldValidate: true })}>+</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de vagas VIP</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => form.setValue("vipSpots", Math.max(0, vipSpots - 1), { shouldValidate: true })}>-</Button>
                    <div className="flex-1 rounded-lg border border-border/60 bg-muted/20 px-4 py-2 text-center text-lg font-semibold">{vipSpots}</div>
                    <Button type="button" variant="outline" size="icon" onClick={() => form.setValue("vipSpots", Math.min(includedSpots, vipSpots + 1), { shouldValidate: true })}>+</Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Dados por veiculo</p>
                  <p className="text-sm text-muted-foreground">
                    Ajuste condutor e modelo de cada placa cadastrada para aparecer automaticamente no registro de entrada e saida.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {client.vehicles.map((plate) => (
                    <div key={plate} className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_1fr] sm:items-center">
                      <div className="rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-sm">
                        {plate}
                      </div>
                      <Input
                        placeholder="Nome do condutor"
                        value={driverNames[plate.replace(/[^A-Z0-9]/gi, "").toUpperCase()] ?? ""}
                        onChange={(event) =>
                          setDriverNames((current) => ({
                            ...current,
                            [plate.replace(/[^A-Z0-9]/gi, "").toUpperCase()]: event.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Modelo do veiculo"
                        value={vehicleModels[plate.replace(/[^A-Z0-9]/gi, "").toUpperCase()] ?? ""}
                        onChange={(event) =>
                          setVehicleModels((current) => ({
                            ...current,
                            [plate.replace(/[^A-Z0-9]/gi, "").toUpperCase()]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center gap-2">
                <Checkbox id="edit-vip" checked={isVip} onCheckedChange={(checked) => form.setValue("isVip", Boolean(checked), { shouldValidate: true })} />
                <Label htmlFor="edit-vip">Cliente VIP ({settings.monthlyVipMultiplier}x sobre a mensalidade base)</Label>
              </div>
            </div>
          )}

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateClient.isPending}>
              {updateClient.isPending ? "Salvando..." : "Salvar alteracoes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
