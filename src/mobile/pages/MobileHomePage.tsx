import { Bell, CarFront, Clock3, MapPinned, MoveRight, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { MobileShell } from "@/mobile/components/MobileShell";
import { useActivitiesQuery, useCurrentCashSessionQuery, useNotificationsQuery, useParkingSpotsQuery, useVehiclesQuery } from "@/hooks/useValetData";
import { formatCurrencyBRL, formatDurationFromDate, formatTimeBR } from "@/lib/format";

export default function MobileHomePage() {
  const { data: vehicles = [] } = useVehiclesQuery();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: notifications = [] } = useNotificationsQuery();
  const { data: activities = [] } = useActivitiesQuery();
  const { data: currentCashSession } = useCurrentCashSessionQuery();

  const waitingVehicles = vehicles.filter((vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit");
  const parkedVehicles = vehicles.filter((vehicle) => vehicle.status === "parked");
  const freeSpots = parkingSpots.filter((spot) => spot.status === "available").length;
  const occupancyRate = parkingSpots.length > 0 ? Math.round(((parkingSpots.length - freeSpots) / parkingSpots.length) * 100) : 0;
  const unreadNotifications = notifications.filter((notification) => !notification.read).slice(0, 3);
  const recentActivities = activities.slice(0, 4);

  return (
    <MobileShell title="Inicio" subtitle="Resumo rapido da operacao no patio">
      <section className="grid grid-cols-2 gap-3">
        <MetricCard label="Em espera" value={String(waitingVehicles.length)} helper="Retiradas em andamento" icon={Clock3} />
        <MetricCard label="No patio" value={String(parkedVehicles.length)} helper="Veiculos estacionados" icon={CarFront} />
        <MetricCard label="Vagas livres" value={String(freeSpots)} helper="Disponiveis agora" icon={MapPinned} />
        <MetricCard label="Ocupacao" value={`${occupancyRate}%`} helper="Uso atual do patio" icon={TriangleAlert} />
      </section>

      <section className="rounded-[24px] bg-slate-950 p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">Caixa</p>
            <h2 className="mt-2 text-lg font-semibold">
              {currentCashSession ? "Caixa aberto" : "Caixa aguardando abertura"}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {currentCashSession
                ? `Aberto as ${formatTimeBR(currentCashSession.openedAt)} com ${formatCurrencyBRL(currentCashSession.openingAmount)}`
                : "As operacoes podem ficar limitadas ate a abertura do caixa."}
            </p>
          </div>
          <Link to="/m/vehicles" className="rounded-full border border-white/10 bg-white/10 p-3">
            <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Fila de retirada</h2>
            <p className="text-sm text-slate-500">Priorize os chamados mais antigos.</p>
          </div>
          <Link to="/m/vehicles" className="text-sm font-medium text-sky-700">
            Ver tudo
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {waitingVehicles.length > 0 ? (
            waitingVehicles.slice(0, 4).map((vehicle) => (
              <article key={vehicle.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{vehicle.plate}</p>
                    <p className="text-sm text-slate-500">{vehicle.clientName}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {vehicle.status === "in_transit" ? "Em deslocamento" : "Solicitado"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {vehicle.requestedAt ? `Esperando ha ${formatDurationFromDate(vehicle.requestedAt)}` : "Aguardando atendimento"}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              Nenhuma retirada pendente no momento.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Alertas recentes</h2>
        </div>

        <div className="mt-4 space-y-3">
          {unreadNotifications.length > 0 ? (
            unreadNotifications.map((notification) => (
              <article key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-950">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
              </article>
            ))
          ) : recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <article key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-950">{activity.title}</p>
                <p className="mt-1 text-sm text-slate-600">{activity.description}</p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              Sem alertas novos.
            </p>
          )}
        </div>
      </section>
    </MobileShell>
  );
}

function MetricCard({
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
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-semibold text-slate-950">{value}</p>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-950">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </article>
  );
}
