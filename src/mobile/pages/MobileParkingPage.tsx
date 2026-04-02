import { useMemo } from "react";
import { CarFront, MapPinned, TriangleAlert } from "lucide-react";
import { useParkingSpotsQuery, useVehiclesQuery } from "@/hooks/useValetData";
import { MobileShell } from "@/mobile/components/MobileShell";

export default function MobileParkingPage() {
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();

  const floors = useMemo(() => {
    const grouped = new Map<number, typeof parkingSpots>();

    parkingSpots.forEach((spot) => {
      const current = grouped.get(spot.floor) ?? [];
      current.push(spot);
      grouped.set(spot.floor, current);
    });

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left - right)
      .map(([floor, spots]) => {
        const occupied = spots.filter((spot) => spot.status === "occupied").length;
        const available = spots.filter((spot) => spot.status === "available").length;
        const attention = spots.filter((spot) => spot.status === "maintenance" || spot.status === "blocked").length;

        return {
          floor,
          spots: spots.sort((left, right) => left.code.localeCompare(right.code)),
          occupied,
          available,
          attention,
        };
      });
  }, [parkingSpots]);

  const mappedVehicles = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        ...vehicle,
        spot: parkingSpots.find((spot) => spot.id === vehicle.spotId),
      })),
    [parkingSpots, vehicles],
  );

  return (
    <MobileShell title="Patio" subtitle="Mapa resumido para consulta rapida no celular">
      <section className="grid grid-cols-3 gap-3">
        <SummaryCard label="Pisos" value={String(floors.length)} icon={MapPinned} />
        <SummaryCard label="Ocupadas" value={String(parkingSpots.filter((spot) => spot.status === "occupied").length)} icon={CarFront} />
        <SummaryCard
          label="Atencao"
          value={String(parkingSpots.filter((spot) => spot.status === "maintenance" || spot.status === "blocked").length)}
          icon={TriangleAlert}
        />
      </section>

      <section className="space-y-3">
        {floors.length > 0 ? (
          floors.map((floor) => (
            <article key={floor.floor} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Piso {floor.floor}</h2>
                  <p className="text-sm text-slate-500">
                    {floor.available} livres, {floor.occupied} ocupadas, {floor.attention} com atencao
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {floor.spots.length} vagas
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {floor.spots.map((spot) => (
                  <div
                    key={spot.id}
                    className={`rounded-2xl px-3 py-2 text-sm font-medium ${
                      spot.status === "occupied"
                        ? "bg-rose-100 text-rose-700"
                        : spot.status === "available"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {spot.code}
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Nenhuma vaga cadastrada ainda.
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Onde cada carro esta</h2>
        <div className="mt-4 space-y-3">
          {mappedVehicles.length > 0 ? (
            mappedVehicles.map((vehicle) => (
              <article key={vehicle.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{vehicle.plate}</p>
                    <p className="text-sm text-slate-500">{vehicle.clientName}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    {vehicle.spot?.code ?? "Sem vaga"}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              Nenhum veiculo estacionado.
            </p>
          )}
        </div>
      </section>
    </MobileShell>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof MapPinned;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </article>
  );
}
