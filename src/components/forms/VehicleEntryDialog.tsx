import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useClientsQuery, useCreateVehicleMutation, useParkingSpotsQuery } from "@/hooks/useValetData";
import { useAppSettings } from "@/lib/app-settings";
import { findParkingSpotByIdentifier } from "@/lib/parking-spots";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyBRL } from "@/lib/format";
import { formatPhoneBR, isValidPlate, normalizePlate, normalizePlateLookup } from "@/lib/masks";
import type { Client, ContractType } from "@/types/valet";

const inspectionKeys = [
  "leftSide",
  "rightSide",
  "frontBumper",
  "rearBumper",
  "wheels",
  "mirrors",
  "roof",
  "windows",
  "interior",
] as const;

const inspectionLabel: Record<(typeof inspectionKeys)[number], string> = {
  leftSide: "Lado esquerdo (arranhoes?)",
  rightSide: "Lado direito",
  frontBumper: "Para-choque dianteiro",
  rearBumper: "Para-choque traseiro",
  wheels: "Rodas",
  mirrors: "Retrovisores",
  roof: "Teto",
  windows: "Vidros",
  interior: "Interior",
};

const schema = z
  .object({
    plate: z.string(),
    spotId: z.string().min(1, "Selecione a vaga"),
    model: z.string().min(1, "Modelo obrigatorio"),
    clientName: z.string().min(2, "Nome do cliente obrigatorio"),
    driverName: z.string().optional(),
    clientPhone: z.string().optional(),
    observations: z.string().optional(),
    contractType: z.enum(["hourly", "daily", "monthly", "agreement"]),
    createInspection: z.boolean(),
    prepaidEnabled: z.boolean(),
    leftSide: z.boolean(),
    rightSide: z.boolean(),
    frontBumper: z.boolean(),
    rearBumper: z.boolean(),
    wheels: z.boolean(),
    mirrors: z.boolean(),
    roof: z.boolean(),
    windows: z.boolean(),
    interior: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!isValidPlate(data.plate)) {
      ctx.addIssue({
        code: "custom",
        path: ["plate"],
        message: "Placa invalida (ex: ABC-1234 ou ABC1D23)",
      });
    }

    if (data.createInspection) {
      const selectedCount = inspectionKeys.filter((key) => data[key]).length;
      if (selectedCount === 0) {
        ctx.addIssue({
          code: "custom",
          path: [inspectionKeys[0]],
          message: "Selecione ao menos 1 item da vistoria.",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface VehicleEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function findClientByPlate(clients: Client[], plate: string) {
  const normalized = normalizePlateLookup(plate);
  return clients.find((client) =>
    client.vehicles.some((registeredPlate) => normalizePlateLookup(registeredPlate) === normalized),
  );
}

function findDriverNameByPlate(client: Client | undefined, plate: string) {
  if (!client?.vehicleDrivers) {
    return "";
  }

  return client.vehicleDrivers[normalizePlateLookup(plate)] ?? "";
}

function findVehicleModelByPlate(client: Client | undefined, plate: string) {
  if (!client?.vehicleModels) {
    return "";
  }

  return client.vehicleModels[normalizePlateLookup(plate)] ?? "";
}

function isBillingOverdue(client: Client) {
  return client.billingDueDate.getTime() < Date.now();
}

export function VehicleEntryDialog({ open, onOpenChange }: VehicleEntryDialogProps) {
  const createVehicle = useCreateVehicleMutation();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: clients = [] } = useClientsQuery();
  const settings = useAppSettings();
  const { toast } = useToast();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [prepaidSelection, setPrepaidSelection] = useState<PrepaidChargeSelection | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      plate: "",
      spotId: "",
      model: "",
      clientName: "",
      driverName: "",
      clientPhone: "",
      observations: "",
      contractType: "hourly",
      createInspection: settings.entryDefaults.createInspection,
      prepaidEnabled: settings.entryDefaults.prepaidEnabled,
      leftSide: false,
      rightSide: false,
      frontBumper: false,
      rearBumper: false,
      wheels: false,
      mirrors: false,
      roof: false,
      windows: false,
      interior: false,
    },
  });

  const plate = form.watch("plate");
  const phone = form.watch("clientPhone") ?? "";
  const prepaidEnabled = form.watch("prepaidEnabled");
  const createInspection = form.watch("createInspection");
  const matchedClient = useMemo(() => findClientByPlate(clients, plate), [clients, plate]);
  const matchedDriverName = useMemo(() => findDriverNameByPlate(matchedClient, plate), [matchedClient, plate]);
  const matchedVehicleModel = useMemo(() => findVehicleModelByPlate(matchedClient, plate), [matchedClient, plate]);
  const matchedClientOverdue = matchedClient ? isBillingOverdue(matchedClient) : false;
  const availableSpots = useMemo(() => {
    const available = parkingSpots.filter((spot) => spot.status === "available");
    return matchedClient?.isVip ? available.filter((spot) => spot.type === "vip") : available;
  }, [matchedClient?.isVip, parkingSpots]);

  useEffect(() => {
    const selectedSpotId = form.getValues("spotId");
    if (!selectedSpotId) {
      return;
    }

    if (!findParkingSpotByIdentifier(availableSpots, selectedSpotId)) {
      form.setValue("spotId", "", { shouldValidate: true });
    }
  }, [availableSpots, form]);

  useEffect(() => {
    if (!open) return;
    form.reset({
      plate: "",
      spotId: "",
      model: "",
      clientName: "",
      driverName: "",
      clientPhone: "",
      observations: "",
      contractType: "hourly",
      createInspection: settings.entryDefaults.createInspection,
      prepaidEnabled: settings.entryDefaults.prepaidEnabled,
      leftSide: false,
      rightSide: false,
      frontBumper: false,
      rearBumper: false,
      wheels: false,
      mirrors: false,
      roof: false,
      windows: false,
      interior: false,
    });
    setPrepaidSelection(null);
    setSubmitError(null);
  }, [form, open, settings.entryDefaults.createInspection, settings.entryDefaults.prepaidEnabled]);

  useEffect(() => {
    if (!matchedClient) return;
    form.setValue("clientName", matchedClient.name, { shouldValidate: true });
    form.setValue("driverName", matchedDriverName, { shouldValidate: false });
    if (matchedVehicleModel) {
      form.setValue("model", matchedVehicleModel, { shouldValidate: true });
    }
    form.setValue("clientPhone", matchedClient.phone, { shouldValidate: true });
    form.setValue("contractType", matchedClient.category as ContractType, { shouldValidate: true });
  }, [form, matchedClient, matchedDriverName, matchedVehicleModel]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const createdVehicle = await createVehicle.mutateAsync({
        plate: values.plate,
        spotId: values.spotId,
        model: values.model,
        clientName: values.clientName,
        driverName: values.driverName,
        clientPhone: values.clientPhone,
        observations: values.observations,
        contractType: values.contractType as ContractType,
        unitName: settings.unitName,
        createInspection: values.createInspection,
        inspection: values.createInspection
          ? {
              leftSide: values.leftSide,
              rightSide: values.rightSide,
              frontBumper: values.frontBumper,
              rearBumper: values.rearBumper,
              wheels: values.wheels,
              mirrors: values.mirrors,
              roof: values.roof,
              windows: values.windows,
              interior: values.interior,
              completedAt: new Date(),
            }
          : undefined,
        prepaidAmount: values.prepaidEnabled ? prepaidSelection?.amount : 0,
        prepaidAgreementId: values.prepaidEnabled ? prepaidSelection?.agreementId : "none",
        prepaidPaymentMethod: values.prepaidEnabled ? prepaidSelection?.paymentMethod : undefined,
      });

      if (createdVehicle.linkedClientId) {
        toast({
          title: "Cliente recorrente reconhecido",
          description:
            createdVehicle.recurringClientCategory === "monthly"
              ? `${createdVehicle.plate} reconhecido como mensalista. A saida sera isenta.`
              : `${createdVehicle.plate} reconhecido como credenciado. A saida sera isenta.`,
          variant: "default",
        });
      }

      form.reset();
      setPrepaidSelection(null);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel registrar o veiculo.";
      if (message.toLowerCase().includes("caixa aberto")) {
        setSubmitError("O caixa precisa estar aberto para registrar novas entradas.");
        return;
      }
      if (message.toLowerCase().includes("ja existe um veiculo ativo com esta placa")) {
        setSubmitError("Esta placa ja esta no sistema.");
        return;
      }
      setSubmitError(message);
    }
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Entrada</DialogTitle>
            <DialogDescription>Registre um veiculo no patio.</DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plate">Placa *</Label>
                <Input
                  id="plate"
                  placeholder="ABC-1234 ou ABC1D23"
                  value={plate}
                  onChange={(event) => {
                    form.setValue("plate", normalizePlate(event.target.value), { shouldValidate: true });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input id="model" placeholder="Modelo" {...form.register("model")} readOnly={Boolean(matchedVehicleModel)} />
              </div>

              <div className="space-y-2">
                <Label>Vaga *</Label>
                <Select
                  value={form.watch("spotId")}
                  onValueChange={(value) => form.setValue("spotId", value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a vaga" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSpots.map((spot) => (
                      <SelectItem key={spot.id} value={spot.id}>
                        {spot.code} - Piso {spot.floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input id="clientName" placeholder="Nome do cliente" {...form.register("clientName")} readOnly={Boolean(matchedClient)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverName">Nome do Condutor</Label>
                <Input id="driverName" placeholder="Nome do condutor" {...form.register("driverName")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Telefone do Cliente</Label>
                <Input
                  id="clientPhone"
                  placeholder="(19) 99999-9999"
                  value={phone}
                  readOnly={Boolean(matchedClient)}
                  onChange={(event) => form.setValue("clientPhone", formatPhoneBR(event.target.value), { shouldValidate: true })}
                />
              </div>
            </div>

            {matchedClient ? (
              <div className={matchedClientOverdue ? "rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" : "rounded-md border border-success/40 bg-success/5 p-3 text-sm"}>
                <p className="font-medium text-foreground">
                  Placa reconhecida como {matchedClient.category === "monthly" ? "mensalista" : "credenciado"}
                  {matchedClient.isVip ? " VIP" : ""}.
                </p>
                <p className="text-muted-foreground">
                  A saida sera isenta de cobranca por ser um cliente recorrente cadastrado.
                </p>
                {matchedDriverName ? <p className="text-muted-foreground">Condutor vinculado: {matchedDriverName}</p> : null}
                {matchedVehicleModel ? <p className="text-muted-foreground">Modelo vinculado: {matchedVehicleModel}</p> : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Tipo de contrato</Label>
              <Select
                value={form.watch("contractType")}
                onValueChange={(value) => form.setValue("contractType", value as FormValues["contractType"], { shouldValidate: true })}
                disabled={Boolean(matchedClient)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Avulso</SelectItem>
                  <SelectItem value="daily">Avulso (diaria)</SelectItem>
                  <SelectItem value="agreement">{matchedClient ? "Credenciado" : "Credenciado manual"}</SelectItem>
                  <SelectItem value="monthly">{matchedClient ? "Mensalista" : "Mensalista manual"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observacoes</Label>
              <Textarea id="observations" placeholder="Observacoes do veiculo" {...form.register("observations")} />
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="createInspection" checked={createInspection} onCheckedChange={(checked) => form.setValue("createInspection", Boolean(checked))} />
                <Label htmlFor="createInspection">Criar vistoria para este veiculo</Label>
              </div>

              {createInspection && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {inspectionKeys.map((key) => (
                    <div key={key} className="flex items-center gap-2 rounded border p-2 text-sm">
                      <Checkbox id={key} checked={form.watch(key)} onCheckedChange={(checked) => form.setValue(key, Boolean(checked), { shouldValidate: true })} />
                      <Label htmlFor={key}>{inspectionLabel[key]}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="prepaidEnabled"
                  checked={prepaidEnabled}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    form.setValue("prepaidEnabled", enabled);
                    if (!enabled) setPrepaidSelection(null);
                  }}
                />
                <Label htmlFor="prepaidEnabled">Cobrar diaria antecipada</Label>
              </div>

              {prepaidEnabled && (
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                    Configurar cobranca antecipada
                  </Button>
                  <p className="text-xs text-muted-foreground">Valor selecionado: {formatCurrencyBRL(prepaidSelection?.amount ?? 0)}</p>
                </div>
              )}
            </div>

            {Object.values(form.formState.errors).length > 0 && (
              <p className="text-sm text-destructive">Campos obrigatorios: placa, modelo, cliente e ao menos 1 item da vistoria (quando ativa).</p>
            )}
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
