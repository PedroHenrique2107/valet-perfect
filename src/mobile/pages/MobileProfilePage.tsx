import { Clock3, Phone, ShieldCheck, Star } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAttendantsQuery } from "@/hooks/useValetData";
import { formatDurationMinutes, formatDurationPrecise } from "@/lib/format";
import { MobileShell } from "@/mobile/components/MobileShell";

export default function MobileProfilePage() {
  const { user } = useAuth();
  const { data: attendants = [] } = useAttendantsQuery();

  const currentAttendant = useMemo(
    () => attendants.find((attendant) => attendant.id === user?.id || attendant.name === user?.name),
    [attendants, user?.id, user?.name],
  );

  return (
    <MobileShell title="Perfil" subtitle="Seu resumo operacional no plantao">
      <section className="rounded-[24px] bg-slate-950 p-5 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">Perfil ativo</p>
        <h2 className="mt-3 text-2xl font-semibold">{user?.name ?? "Manobrista"}</h2>
        <p className="mt-1 text-sm text-slate-300">{user?.email}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <DarkInfoCard label="Turno" value={currentAttendant?.shift ?? "Nao definido"} />
          <DarkInfoCard label="Status" value={currentAttendant?.status ?? "offline"} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <LightInfoCard label="Hoje" value={String(currentAttendant?.vehiclesHandledToday ?? 0)} icon={Clock3} helper="Atendimentos do plantao" />
        <LightInfoCard label="Historico" value={String(currentAttendant?.vehiclesHandled ?? 0)} icon={ShieldCheck} helper="Veiculos movimentados" />
        <LightInfoCard label="Tempo medio" value={formatDurationPrecise(currentAttendant?.avgServiceTime ?? 0)} icon={Clock3} helper="Media por atendimento" />
        <LightInfoCard label="Jornada" value={formatDurationMinutes(currentAttendant?.accumulatedWorkMinutes ?? 0)} icon={Star} helper="Tempo acumulado" />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Contato e regras</h2>
        <div className="mt-4 space-y-3">
          <FieldRow icon={Phone} label="Telefone" value={user?.phone ?? currentAttendant?.phone ?? "Nao informado"} />
          <FieldRow icon={Clock3} label="Inicio do turno" value={currentAttendant?.workPeriodStart ?? "--:--"} />
          <FieldRow icon={Clock3} label="Fim do turno" value={currentAttendant?.workPeriodEnd ?? "--:--"} />
          <FieldRow icon={ShieldCheck} label="Carga maxima" value={`${currentAttendant?.maxWorkHours ?? 0}h`} />
        </div>
      </section>
    </MobileShell>
  );
}

function DarkInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-medium text-white">{value}</p>
    </div>
  );
}

function LightInfoCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Clock3;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-5 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

function FieldRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="rounded-2xl bg-white p-2 text-slate-700 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 font-medium text-slate-950">{value}</p>
      </div>
    </div>
  );
}
