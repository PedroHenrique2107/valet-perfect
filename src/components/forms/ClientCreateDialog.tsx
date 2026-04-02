import { useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateAgreementClientFee,
  calculateMonthlyClientFee,
} from "@/config/pricing";
import { useCreateClientMutation, useParkingSpotsQuery } from "@/hooks/useValetData";
import { useAppSettings } from "@/lib/app-settings";
import { formatCurrencyBRL, formatDateTimeBR } from "@/lib/format";
import { formatCnpj, formatCpf, formatPhoneBR, isValidPlate, normalizePlate } from "@/lib/masks";

const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

const schema = z
  .object({
    name: z.string().min(2, "Nome obrigatorio"),
    email: z.string().email("E-mail invalido"),
    phone: z.string().min(15, "Telefone obrigatorio"),
    cpf: z.string().optional(),
    cnpj: z.string().optional(),
    category: z.enum(["agreement", "monthly"]),
    isVip: z.boolean(),
    includedSpots: z.coerce.number().min(1).optional(),
    vipSpots: z.coerce.number().min(0).optional(),
    vehicle1: z.string().min(1, "Cadastre ao menos uma placa"),
    vehicle2: z.string().optional(),
    vehicle3: z.string().optional(),
    vehicle4: z.string().optional(),
    vehicle5: z.string().optional(),
    vehicle6: z.string().optional(),
    vehicle1Model: z.string().optional(),
    vehicle2Model: z.string().optional(),
    vehicle3Model: z.string().optional(),
    vehicle4Model: z.string().optional(),
    vehicle5Model: z.string().optional(),
    vehicle6Model: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const vehicles = [data.vehicle1, data.vehicle2, data.vehicle3, data.vehicle4, data.vehicle5, data.vehicle6]
      .map((value) => value?.trim().toUpperCase())
      .filter(Boolean) as string[];

    vehicles.forEach((vehicle, index) => {
      if (!isValidPlate(vehicle)) {
        ctx.addIssue({
          code: "custom",
          path: [`vehicle${index + 1}`],
          message: "Placa invalida",
        });
      }
    });

    const duplicated = vehicles.find((vehicle, index) => vehicles.indexOf(vehicle) !== index);
    if (duplicated) {
      ctx.addIssue({
        code: "custom",
        path: ["vehicle1"],
        message: `A placa ${duplicated} foi repetida`,
      });
    }

    if (data.category === "monthly" && data.cpf && !CPF_REGEX.test(data.cpf)) {
      ctx.addIssue({
        code: "custom",
        path: ["cpf"],
        message: "CPF invalido. Use o formato 000.000.000-00",
      });
    }

    if (data.category === "agreement" && (!data.cnpj || data.cnpj.replace(/\D/g, "").length !== 14)) {
      ctx.addIssue({
        code: "custom",
        path: ["cnpj"],
        message: "Credenciado precisa de um CNPJ valido",
      });
    }

    if (data.category === "agreement" && (data.vipSpots ?? 0) > (data.includedSpots ?? 1)) {
      ctx.addIssue({
        code: "custom",
        path: ["vipSpots"],
        message: "As vagas VIP nao podem superar o total de vagas",
      });
    }

    if (data.category === "monthly" && vehicles.length > 3) {
      ctx.addIssue({
        code: "custom",
        path: ["vehicle4"],
        message: "Mensalista pode cadastrar no maximo 3 veiculos",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface ClientCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function CounterField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(Math.max(min, value - 1))}>
          -
        </Button>
        <div className="flex-1 rounded-lg border border-border/60 bg-muted/20 px-4 py-2 text-center text-lg font-semibold">
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function ClientCreateDialog({ open, onOpenChange }: ClientCreateDialogProps) {
  const createClient = useCreateClientMutation();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const settings = useAppSettings();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      cnpj: "",
      category: "agreement",
      isVip: false,
      includedSpots: 1,
      vipSpots: 0,
      vehicle1: "",
      vehicle2: "",
      vehicle3: "",
      vehicle4: "",
      vehicle5: "",
      vehicle6: "",
      vehicle1Model: "",
      vehicle2Model: "",
      vehicle3Model: "",
      vehicle4Model: "",
      vehicle5Model: "",
      vehicle6Model: "",
    },
  });

  const category = form.watch("category");
  const isVip = form.watch("isVip");
  const includedSpots = Math.max(1, Number(form.watch("includedSpots") ?? 1));
  const vipSpots = Math.max(0, Number(form.watch("vipSpots") ?? 0));
  const totalSpotCapacity = parkingSpots.length;
  const vipSpotCapacity = parkingSpots.filter((spot) => spot.type === "vip").length;
  const fee = useMemo(
    () =>
      category === "monthly"
        ? calculateMonthlyClientFee(isVip)
        : calculateAgreementClientFee(includedSpots, vipSpots),
    [category, includedSpots, isVip, vipSpots],
  );
  const initialDueDate = useMemo(() => addMonths(new Date(), 1), []);
  const vehicleFields =
    category === "monthly"
      ? ["vehicle1", "vehicle2", "vehicle3"]
      : ["vehicle1", "vehicle2", "vehicle3", "vehicle4", "vehicle5", "vehicle6"];

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    if (category === "agreement" && totalSpotCapacity === 0) {
      setSubmitError("Cadastre as vagas do patio antes de criar um credenciado.");
      return;
    }
    if (category === "agreement" && includedSpots > Math.max(1, totalSpotCapacity)) {
      setSubmitError(`O patio possui ${totalSpotCapacity} vagas cadastradas no total.`);
      return;
    }
    if (category === "agreement" && vipSpots > vipSpotCapacity) {
      setSubmitError(`O patio possui ${vipSpotCapacity} vagas VIP cadastradas.`);
      return;
    }
    try {
      const vehicles = vehicleFields
        .map((field) => values[field as keyof FormValues] as string | undefined)
        .map((value) => value?.trim().toUpperCase())
        .filter(Boolean) as string[];
      const vehicleModels = Object.fromEntries(
        vehicleFields
          .map((field) => {
            const index = field.replace("vehicle", "");
            const plate = values[field as keyof FormValues] as string | undefined;
            const model = values[`vehicle${index}Model` as keyof FormValues] as string | undefined;
            return [plate?.trim().toUpperCase(), model?.trim()] as const;
          })
          .filter(([plate, model]) => Boolean(plate && model)),
      );

      await createClient.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone,
        cpf: category === "monthly" ? values.cpf : undefined,
        cnpj: category === "agreement" ? values.cnpj : undefined,
        category: values.category,
        isVip: values.category === "monthly" ? values.isVip : undefined,
        includedSpots: category === "agreement" ? includedSpots : 1,
        vipSpots: category === "agreement" ? vipSpots : values.isVip ? 1 : 0,
        monthlyFee: fee,
        billingDueDay: initialDueDate.getDate(),
        billingDueDate: initialDueDate.toISOString(),
        vehicles,
        vehicleModels,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Nao foi possivel cadastrar o cliente.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            O vencimento inicial sera automaticamente em 1 mes a partir do cadastro.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Tipo de cliente</Label>
              <Select
                value={category}
                onValueChange={(value) => form.setValue("category", value as FormValues["category"], { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agreement">Credenciado</SelectItem>
                  <SelectItem value="monthly">Mensalista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{category === "agreement" ? "Empresa" : "Nome do cliente"}</Label>
              <Input placeholder={category === "agreement" ? "Razao social ou nome fantasia" : "Nome completo"} {...form.register("name")} />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input placeholder="contato@email.com" type="email" {...form.register("email")} />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(19) 99999-9999"
                inputMode="numeric"
                value={form.watch("phone")}
                onChange={(event) => form.setValue("phone", formatPhoneBR(event.target.value), { shouldValidate: true })}
              />
            </div>

            {category === "agreement" ? (
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  value={form.watch("cnpj")}
                  onChange={(event) => form.setValue("cnpj", formatCnpj(event.target.value), { shouldValidate: true })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  value={form.watch("cpf") ?? ""}
                  onChange={(event) => form.setValue("cpf", formatCpf(event.target.value), { shouldValidate: true })}
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Vencimento inicial</p>
            <p className="mt-1 text-lg font-semibold text-primary">{formatDateTimeBR(initialDueDate)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Depois voce pode alterar apenas o dia de vencimento no menu do cliente.
            </p>
          </div>

          {category === "agreement" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CounterField
                label="Quantidade de vagas"
                value={includedSpots}
                min={1}
                max={Math.max(1, totalSpotCapacity)}
                onChange={(value) => form.setValue("includedSpots", Math.min(value, Math.max(1, totalSpotCapacity)), { shouldValidate: true })}
              />
              <CounterField
                label="Quantidade de vagas VIP"
                value={vipSpots}
                min={0}
                max={Math.min(includedSpots, vipSpotCapacity)}
                onChange={(value) => form.setValue("vipSpots", Math.min(value, Math.min(includedSpots, vipSpotCapacity)), { shouldValidate: true })}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="client-vip"
                  checked={isVip}
                  onCheckedChange={(checked) => form.setValue("isVip", Boolean(checked), { shouldValidate: true })}
                />
                <Label htmlFor="client-vip">
                  Cliente VIP (+{Math.round((settings.monthlyVipMultiplier - 1) * 100)}% sobre {formatCurrencyBRL(settings.monthlyStandardRate)})
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Mensalista tem 1 vaga e pode cadastrar ate 3 placas.
              </p>
            </div>
          )}

          {category === "agreement" ? (
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <p className="text-sm font-medium text-foreground">VIP para credenciado</p>
              <p className="text-sm text-muted-foreground">
                O valor das vagas VIP ja e calculado automaticamente com acrescimo configurado. Vaga comum: {formatCurrencyBRL(settings.agreementStandardSpotRate)}. Vaga VIP: {formatCurrencyBRL(settings.agreementStandardSpotRate * settings.agreementVipMultiplier)}.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Limite atual do patio: {totalSpotCapacity} vagas no total, sendo {vipSpotCapacity} VIP.
              </p>
            </div>
          ) : null}

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div>
              <p className="font-medium text-foreground">Veiculos vinculados</p>
              <p className="text-sm text-muted-foreground">
                {category === "monthly"
                  ? "Cadastre de 1 a 3 placas. A primeira e obrigatoria."
                  : "Cadastre de 1 a 6 placas agora. Depois voce pode continuar adicionando mais pelo card."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {vehicleFields.map((field, index) => (
                <div key={field} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{`Placa ${index + 1}${index === 0 ? " *" : ""}`}</Label>
                    <Input
                      placeholder="ABC-1234 ou ABC1D23"
                      value={form.watch(field as keyof FormValues) as string}
                      onChange={(event) => form.setValue(field as keyof FormValues, normalizePlate(event.target.value) as never, { shouldValidate: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{`Modelo ${index + 1}`}</Label>
                    <Input
                      placeholder="Modelo do veiculo"
                      value={form.watch(`vehicle${index + 1}Model` as keyof FormValues) as string}
                      onChange={(event) =>
                        form.setValue(`vehicle${index + 1}Model` as keyof FormValues, event.target.value as never, {
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Valor mensal projetado</p>
            <p className="mt-1 text-2xl font-bold text-primary">{formatCurrencyBRL(fee)}</p>
            {category === "monthly" && isVip ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Mensalidade VIP usa multiplicador de {settings.monthlyVipMultiplier}x.
              </p>
            ) : null}
          </div>

          {(Object.keys(form.formState.errors).length > 0 || submitError) && (
            <div className="space-y-1">
              {Object.values(form.formState.errors).map((error, index) =>
                error?.message ? (
                  <p key={`${error.message}-${index}`} className="text-sm text-destructive">
                    {error.message}
                  </p>
                ) : null,
              )}
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
