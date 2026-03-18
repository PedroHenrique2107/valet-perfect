import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Clock3, CreditCard, Layers, Plus, Ticket, Trash2, UserCog, Users } from "lucide-react";
import { ParkingFloorManagerDialog } from "@/components/forms/ParkingFloorManagerDialog";
import { ParkingSpotConfigDialog } from "@/components/forms/ParkingSpotConfigDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getRoleDisplayName, useAuth } from "@/contexts/AuthContext";
import {
  useCreateManagedUserMutation,
  useCreateUnitMutation,
  useParkingSpotsQuery,
  usePurgeUnitDataMutation,
  useRemoveUnitMemberMutation,
  useUnitInvitationsQuery,
  useUnitMembersQuery,
  useUnitsQuery,
  useUpdateMyProfileMutation,
  useUpdateUnitMemberRoleMutation,
} from "@/hooks/useValetData";
import { useToast } from "@/hooks/use-toast";
import { resetAppSettings, saveAppSettings, useAppSettings, type AppSettings } from "@/lib/app-settings";
import { getGlobalSectionOrder, sortSectionsByOrder } from "@/lib/parkingLayout";
import type { UserRole } from "@/types/auth";

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    agreementOptions: settings.agreementOptions.map((item) => ({ ...item })),
    pricingRules: settings.pricingRules.map((item) => ({ ...item })),
    shiftRules: settings.shiftRules.map((item) => ({ ...item })),
    operatingHours: settings.operatingHours.map((item) => ({ ...item })),
    alerts: { ...settings.alerts },
    entryDefaults: { ...settings.entryDefaults },
  };
}

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatHoursLabel(hours: number) {
  return hours <= 1 ? "Ate 1 hora" : `Ate ${hours} horas`;
}

export default function SettingsPage() {
  const settings = useAppSettings();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: units = [] } = useUnitsQuery();
  const { data: unitMembers = [] } = useUnitMembersQuery();
  const { data: unitInvitations = [] } = useUnitInvitationsQuery();
  const createUnit = useCreateUnitMutation();
  const createManagedUser = useCreateManagedUserMutation();
  const updateMyProfile = useUpdateMyProfileMutation();
  const updateUnitMemberRole = useUpdateUnitMemberRoleMutation();
  const removeUnitMember = useRemoveUnitMemberMutation();
  const purgeUnitData = usePurgeUnitDataMutation();

  const [draft, setDraft] = useState(() => cloneSettings(settings));
  const [floorManagerOpen, setFloorManagerOpen] = useState(false);
  const [createSpotOpen, setCreateSpotOpen] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitLocation, setUnitLocation] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [invite, setInvite] = useState({
    unitId: "",
    name: "",
    email: "",
    phone: "",
    role: "attendant" as Exclude<UserRole, "admin">,
    workPeriodStart: settings.shiftRules[0]?.startTime ?? "08:00",
    workPeriodEnd: settings.shiftRules[0]?.endTime ?? "17:00",
    maxWorkHours: settings.shiftRules[0]?.maxWorkHours ?? 8,
    sendInviteEmail: true,
  });
  const [purgeConfig, setPurgeConfig] = useState({
    deleteClients: true,
    deleteAttendants: true,
    deleteVehicles: true,
  });

  useEffect(() => {
    setDraft(cloneSettings(settings));
  }, [settings]);

  useEffect(() => {
    setProfileDraft({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    });
  }, [user?.email, user?.name, user?.phone]);

  useEffect(() => {
    if (!invite.unitId && units[0]?.id) {
      setInvite((current) => ({ ...current, unitId: units[0].id }));
    }
  }, [invite.unitId, units]);

  const floorOptions = useMemo(
    () => Array.from(new Set(parkingSpots.map((spot) => spot.floor))).sort((left, right) => left - right),
    [parkingSpots],
  );
  const sectionOrder = useMemo(() => getGlobalSectionOrder(parkingSpots), [parkingSpots]);
  const sectionsByFloor = useMemo(() => {
    return parkingSpots.reduce(
      (acc, spot) => {
        if (!acc[spot.floor]) acc[spot.floor] = [];
        if (!acc[spot.floor].includes(spot.section)) {
          acc[spot.floor].push(spot.section);
          acc[spot.floor] = sortSectionsByOrder(acc[spot.floor], sectionOrder);
        }
        return acc;
      },
      {} as Record<number, string[]>,
    );
  }, [parkingSpots, sectionOrder]);

  const saveSettings = () => {
    saveAppSettings(draft);
    toast({
      title: "Configuracoes salvas",
      description: "Precos, convenios, turnos e defaults foram atualizados localmente.",
    });
  };

  const restoreDefaults = () => {
    resetAppSettings();
    toast({
      title: "Configuracoes restauradas",
      description: "Os valores padrao foram reaplicados.",
    });
  };

  const createNewUnit = async () => {
    if (!unitName.trim()) return;
    await createUnit.mutateAsync({ name: unitName, location: unitLocation });
    setUnitName("");
    setUnitLocation("");
    toast({ title: "Unidade criada", description: "A nova unidade foi adicionada." });
  };

  const createNewUser = async () => {
    if (!invite.unitId || !invite.name.trim() || !invite.email.trim()) return;
    await createManagedUser.mutateAsync(invite);
    setInvite((current) => ({
      ...current,
      name: "",
      email: "",
      phone: "",
      role: "attendant",
      sendInviteEmail: true,
    }));
    toast({
      title: "Usuario criado",
      description: invite.sendInviteEmail
        ? "A conta foi criada no Supabase e o convite por e-mail foi disparado."
        : "A conta foi criada no Supabase e vinculada a unidade.",
    });
  };

  const saveProfile = async () => {
    if (!profileDraft.name.trim() || !profileDraft.email.trim()) return;
    await updateMyProfile.mutateAsync(profileDraft);
    await refreshUser();
    toast({
      title: "Perfil atualizado",
      description: "Seu cadastro foi salvo. Se o e-mail mudou, o Supabase pode pedir confirmacao.",
    });
  };

  const purgeNow = async () => {
    const confirmed = window.confirm("Excluir os dados operacionais marcados da unidade atual no banco?");
    if (!confirmed) return;
    await purgeUnitData.mutateAsync(purgeConfig);
    toast({ title: "Limpeza concluida", description: "Os dados selecionados foram removidos da unidade." });
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuracoes</h1>
            <p className="text-muted-foreground">Ajuste base operacional, precos, convenios, usuarios e o seu proprio cadastro.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={restoreDefaults}>Restaurar padrao</Button>
            <Button onClick={saveSettings}>Salvar configuracoes locais</Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Base da operacao</CardTitle>
                <CardDescription>Os numeros abaixo agora mostram claramente o que cada campo controla.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input value={draft.companyName} onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))} placeholder="Empresa" />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input value={draft.unitName} onChange={(event) => setDraft((current) => ({ ...current, unitName: event.target.value }))} placeholder="Unidade" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Localizacao da unidade</Label>
                  <Input value={draft.unitLocation} onChange={(event) => setDraft((current) => ({ ...current, unitLocation: event.target.value }))} placeholder="Cidade, estado ou endereco" />
                </div>
                <div className="space-y-2">
                  <Label>Nome da tabela de cobranca</Label>
                  <Input value={draft.pricingTableName} onChange={(event) => setDraft((current) => ({ ...current, pricingTableName: event.target.value }))} placeholder="Tabela de preco" />
                </div>
                <div className="space-y-2">
                  <Label>Diaria maxima do patio</Label>
                  <NumberInput value={draft.parkingDailyRate} onValueChange={(value) => setDraft((current) => ({ ...current, parkingDailyRate: value }))} placeholder="Valor maximo cobrado por diaria" decimals />
                </div>
                <div className="space-y-2">
                  <Label>Alerta de lotacao (%)</Label>
                  <NumberInput value={draft.alerts.occupancyThreshold} onValueChange={(value) => setDraft((current) => ({ ...current, alerts: { ...current.alerts, occupancyThreshold: value } }))} placeholder="Percentual para destacar lotacao" />
                </div>
                <div className="space-y-2">
                  <Label>Alerta de manutencao (%)</Label>
                  <NumberInput value={draft.alerts.maintenanceThreshold} onValueChange={(value) => setDraft((current) => ({ ...current, alerts: { ...current.alerts, maintenanceThreshold: value } }))} placeholder="Percentual para destacar manutencao" />
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Criar vistoria por padrao</p>
                      <p className="text-xs text-muted-foreground">Toda nova entrada abre com vistoria ativada.</p>
                    </div>
                    <Switch checked={draft.entryDefaults.createInspection} onCheckedChange={(checked) => setDraft((current) => ({ ...current, entryDefaults: { ...current.entryDefaults, createInspection: checked } }))} />
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Cobranca antecipada por padrao</p>
                      <p className="text-xs text-muted-foreground">Novas entradas ja oferecem o fluxo de prepagamento.</p>
                    </div>
                    <Switch checked={draft.entryDefaults.prepaidEnabled} onCheckedChange={(checked) => setDraft((current) => ({ ...current, entryDefaults: { ...current.entryDefaults, prepaidEnabled: checked } }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Mensalistas e credenciados</CardTitle>
                <CardDescription>Restaurei os campos de configuracao separados para cada tipo de cliente.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-border/50 p-4">
                  <div>
                    <p className="font-medium text-foreground">Mensalistas</p>
                    <p className="text-sm text-muted-foreground">Valor base e acrescimo para cliente VIP.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Mensalidade base</Label>
                    <NumberInput value={draft.monthlyStandardRate} onValueChange={(value) => setDraft((current) => ({ ...current, monthlyStandardRate: value }))} decimals placeholder="Valor base do mensalista" />
                  </div>
                  <div className="space-y-2">
                    <Label>Multiplicador VIP</Label>
                    <NumberInput value={draft.monthlyVipMultiplier} onValueChange={(value) => setDraft((current) => ({ ...current, monthlyVipMultiplier: value }))} decimals placeholder="Ex.: 1.4" />
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-border/50 p-4">
                  <div>
                    <p className="font-medium text-foreground">Credenciados</p>
                    <p className="text-sm text-muted-foreground">Valor por vaga e acrescimo aplicado em vagas VIP.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor base por vaga</Label>
                    <NumberInput value={draft.agreementStandardSpotRate} onValueChange={(value) => setDraft((current) => ({ ...current, agreementStandardSpotRate: value }))} decimals placeholder="Valor da vaga credenciada" />
                  </div>
                  <div className="space-y-2">
                    <Label>Multiplicador VIP</Label>
                    <NumberInput value={draft.agreementVipMultiplier} onValueChange={(value) => setDraft((current) => ({ ...current, agreementVipMultiplier: value }))} decimals placeholder="Ex.: 1.2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Turnos e tabela avulsa</CardTitle>
                <CardDescription>Os turnos deixam claro que o numero representa horas maximas; a tabela avulsa mostra horas e valor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="grid gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid-cols-[1.1fr_1fr_1fr_0.9fr]">
                    <span>Nome do turno</span>
                    <span>Entrada</span>
                    <span>Saida</span>
                    <span>Maximo de horas</span>
                  </div>
                  {draft.shiftRules.map((item, index) => (
                    <div key={item.id} className="grid gap-3 rounded-xl border border-border/50 p-3 md:grid-cols-[1.1fr_1fr_1fr_0.9fr]">
                      <Input value={item.name} onChange={(event) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, name: event.target.value } : rule) }))} />
                      <Input type="time" value={item.startTime} onChange={(event) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, startTime: event.target.value } : rule) }))} />
                      <Input type="time" value={item.endTime} onChange={(event) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, endTime: event.target.value } : rule) }))} />
                      <NumberInput value={item.maxWorkHours} onValueChange={(value) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, maxWorkHours: value } : rule) }))} placeholder="Horas" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">Tabela avulsa por faixa</p>
                      <p className="text-sm text-muted-foreground">Removi a coluna de minutos da visualizacao e deixei apenas horas e valor.</p>
                    </div>
                    <Button variant="outline" onClick={() => setDraft((current) => {
                      const lastRule = current.pricingRules[current.pricingRules.length - 1];
                      const nextHours = Math.max(1, Math.round((lastRule?.upToMinutes ?? 0) / 60) + 1);
                      return {
                        ...current,
                        pricingRules: [
                          ...current.pricingRules,
                          { id: createLocalId("pricing"), label: formatHoursLabel(nextHours), upToMinutes: nextHours * 60, price: lastRule?.price ?? 0 },
                        ],
                      };
                    })}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova faixa
                    </Button>
                  </div>
                  <div className="grid gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid-cols-[1.2fr_0.7fr_0.8fr_auto]">
                    <span>Descricao</span>
                    <span>Horas</span>
                    <span>Valor</span>
                    <span />
                  </div>
                  {draft.pricingRules.map((item, index) => {
                    const currentHours = Math.max(1, Math.round(item.upToMinutes / 60));
                    return (
                      <div key={item.id} className="grid gap-3 rounded-xl border border-border/50 p-3 md:grid-cols-[1.2fr_0.7fr_0.8fr_auto]">
                        <Input value={item.label} onChange={(event) => setDraft((current) => ({ ...current, pricingRules: current.pricingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, label: event.target.value } : rule) }))} placeholder={formatHoursLabel(currentHours)} />
                        <NumberInput value={currentHours} onValueChange={(value) => setDraft((current) => ({ ...current, pricingRules: current.pricingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, upToMinutes: value * 60, label: rule.label.trim() ? rule.label : formatHoursLabel(value) } : rule).sort((left, right) => left.upToMinutes - right.upToMinutes) }))} placeholder="Horas" />
                        <NumberInput value={item.price} onValueChange={(value) => setDraft((current) => ({ ...current, pricingRules: current.pricingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, price: value } : rule) }))} decimals placeholder="Valor" />
                        <Button variant="outline" disabled={draft.pricingRules.length <= 1} onClick={() => setDraft((current) => ({ ...current, pricingRules: current.pricingRules.filter((rule) => rule.id !== item.id) }))}>Remover</Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-primary" />Convenios</CardTitle>
                <CardDescription>Edite nome, desconto e as opcoes de convenio que aparecem nas cobrancas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid-cols-[1.4fr_0.7fr_auto]">
                  <span>Nome do convenio</span>
                  <span>Desconto (%)</span>
                  <span />
                </div>
                {draft.agreementOptions.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-xl border border-border/50 p-3 md:grid-cols-[1.4fr_0.7fr_auto]">
                    <Input value={item.label} onChange={(event) => setDraft((current) => ({ ...current, agreementOptions: current.agreementOptions.map((option) => option.id === item.id ? { ...option, label: event.target.value } : option) }))} placeholder="Nome visivel na cobranca" />
                    <NumberInput value={item.discountPercent} onValueChange={(value) => setDraft((current) => ({ ...current, agreementOptions: current.agreementOptions.map((option) => option.id === item.id ? { ...option, discountPercent: value } : option) }))} placeholder="Percentual" />
                    <Button variant="outline" disabled={draft.agreementOptions.length <= 1} onClick={() => setDraft((current) => ({ ...current, agreementOptions: current.agreementOptions.filter((option) => option.id !== item.id) }))}>Remover</Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setDraft((current) => ({ ...current, agreementOptions: [...current.agreementOptions, { id: createLocalId("agreement"), label: `Convenio ${current.agreementOptions.length + 1}`, discountPercent: 0 }] }))}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar convenio
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card id="meu-perfil">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Meu perfil</CardTitle>
                <CardDescription>Seu nome fica em destaque e voce pode ajustar o cadastro por aqui.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-2xl font-semibold text-foreground">{profileDraft.name || "Usuario sem nome"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{profileDraft.email || "Sem e-mail"}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{getRoleDisplayName(user?.role)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={profileDraft.email} onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Seu e-mail" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={profileDraft.phone} onChange={(event) => setProfileDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Seu telefone" />
                </div>
                <Button className="w-full" disabled={updateMyProfile.isPending} onClick={() => void saveProfile()}>{updateMyProfile.isPending ? "Salvando..." : "Salvar meu perfil"}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Usuarios por unidade</CardTitle>
                <CardDescription>Agora a criacao tambem gera a conta no Supabase e pode disparar convite por e-mail.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={invite.unitId} onValueChange={(value) => setInvite((current) => ({ ...current, unitId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                    <SelectContent>{units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input placeholder="Nome completo" value={invite.name} onChange={(event) => setInvite((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail do usuario</Label>
                  <Input placeholder="E-mail" type="email" value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input placeholder="Telefone" value={invite.phone} onChange={(event) => setInvite((current) => ({ ...current, phone: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={invite.role} onValueChange={(value) => setInvite((current) => ({ ...current, role: value as Exclude<UserRole, "admin"> }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leader">Lider de posto</SelectItem>
                      <SelectItem value="attendant">Manobrista</SelectItem>
                      <SelectItem value="cashier">Caixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Inicio do turno</Label>
                    <Input type="time" value={invite.workPeriodStart} onChange={(event) => setInvite((current) => ({ ...current, workPeriodStart: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim do turno</Label>
                    <Input type="time" value={invite.workPeriodEnd} onChange={(event) => setInvite((current) => ({ ...current, workPeriodEnd: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Horas maximas</Label>
                    <NumberInput value={invite.maxWorkHours} onValueChange={(value) => setInvite((current) => ({ ...current, maxWorkHours: value }))} placeholder="Carga horaria" />
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Enviar convite por e-mail</p>
                      <p className="text-xs text-muted-foreground">O usuario ja fica criado no Supabase e recebe o acesso pelo e-mail cadastrado.</p>
                    </div>
                    <Switch checked={invite.sendInviteEmail} onCheckedChange={(checked) => setInvite((current) => ({ ...current, sendInviteEmail: checked }))} />
                  </div>
                </div>
                <Button className="w-full" disabled={createManagedUser.isPending} onClick={() => void createNewUser()}>{createManagedUser.isPending ? "Criando..." : "Criar usuario no Supabase"}</Button>

                {unitMembers.map((member) => (
                  <div key={`${member.userId}-${member.unitId}`} className="rounded-xl border border-border/50 p-3">
                    <p className="font-medium text-foreground">{member.fullName || member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                      <Select value={member.role} onValueChange={(value) => void updateUnitMemberRole.mutateAsync({ userId: member.userId, unitId: member.unitId, role: value as UserRole })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="leader">Lider de posto</SelectItem>
                          <SelectItem value="attendant">Manobrista</SelectItem>
                          <SelectItem value="cashier">Caixa</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" disabled={member.role === "admin" || removeUnitMember.isPending} onClick={() => void removeUnitMember.mutateAsync({ userId: member.userId, unitId: member.unitId })}>Remover</Button>
                    </div>
                  </div>
                ))}

                {unitInvitations.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/50 p-3 text-sm text-muted-foreground">
                    {item.name} • {item.email} • {getRoleDisplayName(item.role)} • {item.status}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />Patio</CardTitle>
                <CardDescription>Atalhos para pisos e vagas.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" onClick={() => setFloorManagerOpen(true)}>Gerenciar pisos</Button>
                <Button variant="outline" onClick={() => setCreateSpotOpen(true)} disabled={floorOptions.length === 0}>Nova vaga</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Criar unidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Nome da unidade" value={unitName} onChange={(event) => setUnitName(event.target.value)} />
                <Input placeholder="Localizacao" value={unitLocation} onChange={(event) => setUnitLocation(event.target.value)} />
                <Button className="w-full" disabled={createUnit.isPending} onClick={() => void createNewUnit()}>{createUnit.isPending ? "Criando..." : "Criar unidade"}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" />Limpeza total</CardTitle>
                <CardDescription>Exclui de uma vez clientes, manobristas e veiculos da unidade atual no banco.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-3"><span className="text-sm">Excluir clientes</span><Switch checked={purgeConfig.deleteClients} onCheckedChange={(checked) => setPurgeConfig((current) => ({ ...current, deleteClients: checked }))} /></div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-3"><span className="text-sm">Excluir manobristas</span><Switch checked={purgeConfig.deleteAttendants} onCheckedChange={(checked) => setPurgeConfig((current) => ({ ...current, deleteAttendants: checked }))} /></div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-3"><span className="text-sm">Excluir veiculos e transacoes</span><Switch checked={purgeConfig.deleteVehicles} onCheckedChange={(checked) => setPurgeConfig((current) => ({ ...current, deleteVehicles: checked }))} /></div>
                <Button variant="destructive" className="w-full" disabled={purgeUnitData.isPending} onClick={() => void purgeNow()}>{purgeUnitData.isPending ? "Limpando..." : "Executar limpeza total"}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />Sessao atual</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {user?.name ?? "Sem nome"} • {user?.email ?? "Sem e-mail"} • {getRoleDisplayName(user?.role)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ParkingFloorManagerDialog open={floorManagerOpen} onOpenChange={setFloorManagerOpen} spots={parkingSpots} />
      <ParkingSpotConfigDialog open={createSpotOpen} onOpenChange={setCreateSpotOpen} spot={null} mode="create" floorOptions={floorOptions.length > 0 ? floorOptions : [1]} sectionsByFloor={floorOptions.length > 0 ? sectionsByFloor : { 1: ["A"] }} />
    </MainLayout>
  );
}
