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
  AGREEMENT_STANDARD_SPOT_RATE,
  AGREEMENT_VIP_MULTIPLIER,
  MONTHLY_STANDARD_RATE,
  MONTHLY_VIP_MULTIPLIER,
  calculateAgreementClientFee,
  calculateMonthlyClientFee,
} from "@/config/pricing";
import { useCreateClientMutation } from "@/hooks/useValetData";
import { formatCurrencyBRL } from "@/lib/format";

const plateRegex = /^(?:[A-Z]{3}-\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/;

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
    billingDueDate: z.string().min(1, "Informe o vencimento"),
    vehicle1: z.string().min(1, "Cadastre ao menos um veiculo"),
    vehicle2: z.string().optional(),
    vehicle3: z.string().optional(),
    vehicle4: z.string().optional(),
    vehicle5: z.string().optional(),
    vehicle6: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const vehicles = [data.vehicle1, data.vehicle2, data.vehicle3, data.vehicle4, data.vehicle5, data.vehicle6]
      .map((value) => value?.trim().toUpperCase())
      .filter(Boolean) as string[];

    vehicles.forEach((vehicle, index) => {
      if (!plateRegex.test(vehicle)) {
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

    if (data.category === "agreement") {
      if (!data.cnpj || data.cnpj.replace(/\D/g, "").length !== 14) {
        ctx.addIssue({
          code: "custom",
          path: ["cnpj"],
          message: "Credenciado precisa de um CNPJ valido",
        });
      }

      const includedSpots = Math.max(1, data.includedSpots ?? 1);
      const vipSpots = Math.max(0, data.vipSpots ?? 0);
      if (vipSpots > includedSpots) {
        ctx.addIssue({
          code: "custom",
          path: ["vipSpots"],
          message: "As vagas VIP nao podem superar o total de vagas",
        });
      }
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

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function normalizePlate(value: string) {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (raw.length <= 7 && /\d/.test(raw.slice(3, 4)) && /[A-Z]/.test(raw.slice(4, 5))) {
    return raw.slice(0, 7);
  }

  const letters = raw.replace(/\d/g, "").slice(0, 3);
  const numbers = raw.replace(/\D/g, "").slice(0, 4);
  return numbers.length > 0 ? `${letters}-${numbers}` : letters;
}

export function ClientCreateDialog({ open, onOpenChange }: ClientCreateDialogProps) {
  const createClient = useCreateClientMutation();
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
      billingDueDate: "",
      vehicle1: "",
      vehicle2: "",
      vehicle3: "",
      vehicle4: "",
      vehicle5: "",
      vehicle6: "",
    },
  });

  const category = form.watch("category");
  const isVip = form.watch("isVip");
  const includedSpots = Math.max(1, Number(form.watch("includedSpots") ?? 1));
  const vipSpots = Math.max(0, Number(form.watch("vipSpots") ?? 0));
  const fee = useMemo(
    () =>
      category === "monthly"
        ? calculateMonthlyClientFee(isVip)
        : calculateAgreementClientFee(includedSpots, vipSpots),
    [category, includedSpots, isVip, vipSpots],
  );

  const vehicleFields = category === "monthly" ? ["vehicle1", "vehicle2", "vehicle3"] : ["vehicle1", "vehicle2", "vehicle3", "vehicle4", "vehicle5", "vehicle6"];

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const vehicles = vehicleFields
        .map((field) => values[field as keyof FormValues] as string | undefined)
        .map((value) => value?.trim().toUpperCase())
        .filter(Boolean) as string[];

      await createClient.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone,
        cpf: category === "monthly" ? values.cpf : undefined,
        cnpj: category === "agreement" ? values.cnpj : undefined,
        category: values.category,
        isVip: values.isVip,
        includedSpots: category === "agreement" ? includedSpots : 1,
        vipSpots: category === "agreement" ? vipSpots : values.isVip ? 1 : 0,
        billingDueDate: values.billingDueDate,
        vehicles,
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
            Cadastre mensalistas ou credenciados com frota vinculada, vencimento e regra VIP.
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
                onChange={(event) => form.setValue("phone", formatPhoneInput(event.target.value), { shouldValidate: true })}
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
                <Input placeholder="Opcional" {...form.register("cpf")} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Vencimento da mensalidade</Label>
              <Input type="date" value={form.watch("billingDueDate")} onChange={(event) => form.setValue("billingDueDate", event.target.value, { shouldValidate: true })} />
            </div>

            {category === "agreement" ? (
              <>
                <div className="space-y-2">
                  <Label>Quantidade de vagas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={includedSpots}
                    onChange={(event) => form.setValue("includedSpots", Number(event.target.value), { shouldValidate: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de vagas VIP</Label>
                  <Input
                    type="number"
                    min={0}
                    max={includedSpots}
                    value={vipSpots}
                    onChange={(event) => form.setValue("vipSpots", Number(event.target.value), { shouldValidate: true })}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 sm:col-span-2">
                <p className="text-sm font-medium text-foreground">Mensalista padrao</p>
                <p className="text-sm text-muted-foreground">
                  1 vaga fixa, ate 3 veiculos cadastrados e mensalidade base de {formatCurrencyBRL(MONTHLY_STANDARD_RATE)}.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="client-vip"
                checked={isVip}
                onCheckedChange={(checked) => form.setValue("isVip", Boolean(checked), { shouldValidate: true })}
              />
              <Label htmlFor="client-vip">
                Cliente VIP
                {category === "monthly"
                  ? ` (+40% sobre ${formatCurrencyBRL(MONTHLY_STANDARD_RATE)})`
                  : ` (+20% por vaga VIP sobre ${formatCurrencyBRL(AGREEMENT_STANDARD_SPOT_RATE)})`}
              </Label>
            </div>
            {category === "agreement" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Valor de vaga comum: {formatCurrencyBRL(AGREEMENT_STANDARD_SPOT_RATE)}. Vaga VIP: {formatCurrencyBRL(AGREEMENT_STANDARD_SPOT_RATE * AGREEMENT_VIP_MULTIPLIER)}.
              </p>
            ) : isVip ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Mensalidade VIP: {formatCurrencyBRL(MONTHLY_STANDARD_RATE * MONTHLY_VIP_MULTIPLIER)}.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div>
              <p className="font-medium text-foreground">Veiculos vinculados</p>
              <p className="text-sm text-muted-foreground">
                {category === "monthly"
                  ? "Cadastre ate 3 placas. O sistema reconhece a placa na entrada e decide a cobranca na saida."
                  : "Cadastre a frota que deve ser reconhecida automaticamente no patio."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vehicleFields.map((field, index) => (
                <div key={field} className="space-y-2">
                  <Label>{`Placa ${index + 1}${index === 0 ? " *" : ""}`}</Label>
                  <Input
                    placeholder="ABC-1234 ou ABC1D23"
                    value={form.watch(field as keyof FormValues) as string}
                    onChange={(event) => form.setValue(field as keyof FormValues, normalizePlate(event.target.value) as never, { shouldValidate: true })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Valor mensal projetado</p>
            <p className="mt-1 text-2xl font-bold text-primary">{formatCurrencyBRL(fee)}</p>
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
