import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Layers, Plus, Trash2, UserCog, Users } from "lucide-react";
import { ParkingFloorManagerDialog } from "@/components/forms/ParkingFloorManagerDialog";
import { ParkingSpotConfigDialog } from "@/components/forms/ParkingSpotConfigDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getRoleDisplayName, useAuth } from "@/contexts/AuthContext";
import {
  useCreateUnitInvitationMutation,
  useCreateUnitMutation,
  useParkingSpotsQuery,
  usePurgeUnitDataMutation,
  useRemoveUnitMemberMutation,
  useUnitInvitationsQuery,
  useUnitMembersQuery,
  useUnitsQuery,
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

export default function SettingsPage() {
  const settings = useAppSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: units = [] } = useUnitsQuery();
  const { data: unitMembers = [] } = useUnitMembersQuery();
  const { data: unitInvitations = [] } = useUnitInvitationsQuery();
  const createUnit = useCreateUnitMutation();
  const createInvitation = useCreateUnitInvitationMutation();
  const updateUnitMemberRole = useUpdateUnitMemberRoleMutation();
  const removeUnitMember = useRemoveUnitMemberMutation();
  const purgeUnitData = usePurgeUnitDataMutation();

  const [draft, setDraft] = useState(() => cloneSettings(settings));
  const [floorManagerOpen, setFloorManagerOpen] = useState(false);
  const [createSpotOpen, setCreateSpotOpen] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitLocation, setUnitLocation] = useState("");
  const [invite, setInvite] = useState({
    unitId: "",
    name: "",
    email: "",
    phone: "",
    role: "attendant" as Exclude<UserRole, "admin">,
    workPeriodStart: settings.shiftRules[0]?.startTime ?? "08:00",
    workPeriodEnd: settings.shiftRules[0]?.endTime ?? "17:00",
    maxWorkHours: settings.shiftRules[0]?.maxWorkHours ?? 8,
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
    toast({ title: "Configuracoes salvas", description: "Turnos, faixas de preco, defaults e alertas foram atualizados localmente." });
  };

  const createNewUnit = async () => {
    if (!unitName.trim()) return;
    await createUnit.mutateAsync({ name: unitName, location: unitLocation });
    setUnitName("");
    setUnitLocation("");
    toast({ title: "Unidade criada", description: "A nova unidade foi adicionada." });
  };

  const createNewInvitation = async () => {
    if (!invite.unitId || !invite.name.trim() || !invite.email.trim()) return;
    await createInvitation.mutateAsync(invite);
    setInvite((current) => ({ ...current, name: "", email: "", phone: "", role: "attendant" }));
    toast({ title: "Usuario preparado", description: "O usuario foi vinculado ou salvo como convite pendente." });
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
            <p className="text-muted-foreground">Limpeza total, usuarios por unidade, novas unidades, turnos, preco por faixa e alertas.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => resetAppSettings()}>Restaurar padrao</Button>
            <Button onClick={saveSettings}>Salvar configuracoes locais</Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Base da operacao</CardTitle>
                <CardDescription>Esses campos controlam os defaults locais da unidade.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Input value={draft.companyName} onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))} placeholder="Empresa" />
                <Input value={draft.unitName} onChange={(event) => setDraft((current) => ({ ...current, unitName: event.target.value }))} placeholder="Unidade" />
                <Input className="md:col-span-2" value={draft.unitLocation} onChange={(event) => setDraft((current) => ({ ...current, unitLocation: event.target.value }))} placeholder="Localizacao" />
                <Input value={draft.pricingTableName} onChange={(event) => setDraft((current) => ({ ...current, pricingTableName: event.target.value }))} placeholder="Tabela de preco" />
                <Input type="number" value={draft.parkingDailyRate} onChange={(event) => setDraft((current) => ({ ...current, parkingDailyRate: Number(event.target.value) }))} placeholder="Diaria maxima" />
                <Input type="number" value={draft.alerts.occupancyThreshold} onChange={(event) => setDraft((current) => ({ ...current, alerts: { ...current.alerts, occupancyThreshold: Number(event.target.value) } }))} placeholder="Lotacao %" />
                <Input type="number" value={draft.alerts.maintenanceThreshold} onChange={(event) => setDraft((current) => ({ ...current, alerts: { ...current.alerts, maintenanceThreshold: Number(event.target.value) } }))} placeholder="Manutencao %" />
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Criar vistoria por padrao</span>
                    <Switch checked={draft.entryDefaults.createInspection} onCheckedChange={(checked) => setDraft((current) => ({ ...current, entryDefaults: { ...current.entryDefaults, createInspection: checked } }))} />
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cobranca antecipada por padrao</span>
                    <Switch checked={draft.entryDefaults.prepaidEnabled} onCheckedChange={(checked) => setDraft((current) => ({ ...current, entryDefaults: { ...current.entryDefaults, prepaidEnabled: checked } }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />Turnos e faixas de preco</CardTitle>
                <CardDescription>Edicao rapida dos principais itens que voce pediu para continuar evoluindo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {draft.shiftRules.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-xl border border-border/50 p-3 md:grid-cols-4">
                    <Input value={item.name} onChange={(event) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, name: event.target.value } : rule) }))} />
                    <Input type="time" value={item.startTime} onChange={(event) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, startTime: event.target.value } : rule) }))} />
                    <Input type="time" value={item.endTime} onChange={(event) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, endTime: event.target.value } : rule) }))} />
                    <Input type="number" value={item.maxWorkHours} onChange={(event) => setDraft((current) => ({ ...current, shiftRules: current.shiftRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, maxWorkHours: Number(event.target.value) } : rule) }))} />
                  </div>
                ))}
                {draft.pricingRules.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-xl border border-border/50 p-3 md:grid-cols-3">
                    <Input value={item.label} onChange={(event) => setDraft((current) => ({ ...current, pricingRules: current.pricingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, label: event.target.value } : rule) }))} />
                    <Input type="number" value={item.upToMinutes} onChange={(event) => setDraft((current) => ({ ...current, pricingRules: current.pricingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, upToMinutes: Number(event.target.value) } : rule).sort((left, right) => left.upToMinutes - right.upToMinutes) }))} />
                    <Input type="number" value={item.price} onChange={(event) => setDraft((current) => ({ ...current, pricingRules: current.pricingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, price: Number(event.target.value) } : rule) }))} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
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
                <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Usuarios por unidade</CardTitle>
                <CardDescription>Crie manobristas, lideres de posto e caixas por unidade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={invite.unitId} onValueChange={(value) => setInvite((current) => ({ ...current, unitId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                  <SelectContent>{units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Nome completo" value={invite.name} onChange={(event) => setInvite((current) => ({ ...current, name: event.target.value }))} />
                <Input placeholder="E-mail" type="email" value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} />
                <Input placeholder="Telefone" value={invite.phone} onChange={(event) => setInvite((current) => ({ ...current, phone: event.target.value }))} />
                <Select value={invite.role} onValueChange={(value) => setInvite((current) => ({ ...current, role: value as Exclude<UserRole, "admin"> }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leader">Lider de posto</SelectItem>
                    <SelectItem value="attendant">Manobrista</SelectItem>
                    <SelectItem value="cashier">Caixa</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" disabled={createInvitation.isPending} onClick={() => void createNewInvitation()}>{createInvitation.isPending ? "Salvando..." : "Criar usuario / convite"}</Button>

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
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Sessao atual</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {user?.name ?? "Sem nome"} • {user?.email ?? "Sem e-mail"} • {getRoleDisplayName(user?.role)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ParkingFloorManagerDialog open={floorManagerOpen} onOpenChange={setFloorManagerOpen} spots={parkingSpots} />
      <ParkingSpotConfigDialog
        open={createSpotOpen}
        onOpenChange={setCreateSpotOpen}
        spot={null}
        mode="create"
        floorOptions={floorOptions.length > 0 ? floorOptions : [1]}
        sectionsByFloor={floorOptions.length > 0 ? sectionsByFloor : { 1: ["A"] }}
      />
    </MainLayout>
  );
}
