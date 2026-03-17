import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  Car,
  Crown,
  Wrench,
  Zap,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateParkingFloorMutation,
  useDeleteParkingFloorMutation,
} from "@/hooks/useValetData";
import { buildSequentialSectionNames, getRegularSectionOrder } from "@/lib/parkingLayout";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ParkingSpot } from "@/types/valet";

type FloorSpotCategory = "regular" | "maintenance" | "vip" | "electric" | "accessible";

interface SectionPlan {
  name: string;
  capacity: number;
}

const categoryOptions: Array<{
  value: FloorSpotCategory;
  label: string;
  cardClass: string;
  icon: typeof Car;
}> = [
  { value: "regular", label: "Disponivel", cardClass: "border-success/70 bg-success/15 text-success", icon: Car },
  { value: "maintenance", label: "Manutencao", cardClass: "border-warning/70 bg-warning/15 text-warning", icon: Wrench },
  { value: "vip", label: "Credenciado / VIP", cardClass: "border-white/70 bg-white/10 text-white", icon: Crown },
  { value: "electric", label: "Eletrico", cardClass: "border-amber-400/70 bg-amber-400/15 text-amber-300", icon: Zap },
  { value: "accessible", label: "Cadeirante", cardClass: "border-info/70 bg-info/15 text-info", icon: Accessibility },
];

interface ParkingFloorManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spots: ParkingSpot[];
}

export function ParkingFloorManagerDialog({
  open,
  onOpenChange,
  spots,
}: ParkingFloorManagerDialogProps) {
  const createParkingFloor = useCreateParkingFloorMutation();
  const deleteParkingFloor = useDeleteParkingFloorMutation();
  const { toast } = useToast();

  const [step, setStep] = useState<"quantity" | "configure">("quantity");
  const [totalSpots, setTotalSpots] = useState(0);
  const [sectionCountInput, setSectionCountInput] = useState("");
  const [spotsPerSectionInput, setSpotsPerSectionInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FloorSpotCategory>("regular");
  const [spotCategories, setSpotCategories] = useState<FloorSpotCategory[]>([]);

  const floorSummaries = useMemo(() => {
    return Array.from(new Set(spots.map((spot) => spot.floor)))
      .sort((left, right) => left - right)
      .map((floor) => {
        const floorSpots = spots.filter((spot) => spot.floor === floor);
        return {
          floor,
          total: floorSpots.length,
          occupied: floorSpots.filter((spot) => spot.status === "occupied").length,
        };
      });
  }, [spots]);

  const nextFloor = floorSummaries.length > 0 ? floorSummaries[floorSummaries.length - 1].floor + 1 : 1;
  const existingRegularSections = useMemo(() => getRegularSectionOrder(spots), [spots]);

  useEffect(() => {
    if (!open) return;
    setStep("quantity");
    setTotalSpots(0);
    setSectionCountInput("");
    setSpotsPerSectionInput("");
    setSelectedCategory("regular");
    setSpotCategories([]);
  }, [open]);

  const sectionPlan = useMemo<SectionPlan[]>(() => {
    if (totalSpots <= 0) return [];

    const parsedSectionCount = Number(sectionCountInput);
    const sectionCount =
      sectionCountInput.trim().length > 0 && Number.isFinite(parsedSectionCount) && parsedSectionCount > 0
        ? parsedSectionCount
        : 1;

    const sectionNames = buildSequentialSectionNames(sectionCount, existingRegularSections);
    const parsedSpotsPerSection = Number(spotsPerSectionInput);
    const hasExplicitCapacity =
      spotsPerSectionInput.trim().length > 0 && Number.isFinite(parsedSpotsPerSection) && parsedSpotsPerSection > 0;

    if (hasExplicitCapacity) {
      return sectionNames.map((name) => ({ name, capacity: parsedSpotsPerSection }));
    }

    const baseCapacity = Math.floor(totalSpots / sectionCount);
    const remainder = totalSpots % sectionCount;

    return sectionNames.map((name, index) => ({
      name,
      capacity: baseCapacity + (index < remainder ? 1 : 0),
    }));
  }, [existingRegularSections, sectionCountInput, spotsPerSectionInput, totalSpots]);

  const capacityOverflow =
    sectionPlan.length > 0 &&
    spotsPerSectionInput.trim().length > 0 &&
    sectionPlan.reduce((sum, section) => sum + section.capacity, 0) < totalSpots;

  const categoryCounts = useMemo(() => {
    return categoryOptions.reduce<Record<FloorSpotCategory, number>>(
      (acc, option) => {
        acc[option.value] = spotCategories.filter((category) => category === option.value).length;
        return acc;
      },
      {
        regular: 0,
        maintenance: 0,
        vip: 0,
        electric: 0,
        accessible: 0,
      },
    );
  }, [spotCategories]);

  const sectionRanges = useMemo(() => {
    let start = 0;
    return sectionPlan.map((section) => {
      const end = Math.min(start + section.capacity, totalSpots);
      const indices = Array.from({ length: Math.max(end - start, 0) }, (_, index) => start + index);
      start = end;
      return { ...section, indices };
    });
  }, [sectionPlan, totalSpots]);

  const handleContinue = () => {
    if (!Number.isFinite(totalSpots) || totalSpots <= 0) {
      toast({
        title: "Informe a quantidade de vagas",
        description: "Digite um numero maior que zero para continuar.",
        variant: "destructive",
      });
      return;
    }
    if (capacityOverflow) {
      toast({
        title: "Capacidade insuficiente",
        description: "As secoes configuradas nao comportam todas as vagas informadas.",
        variant: "destructive",
      });
      return;
    }
    if (sectionPlan.length === 0) {
      toast({
        title: "Configure ao menos uma secao",
        description: "Defina a estrutura do piso antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setSpotCategories(Array.from({ length: totalSpots }, () => "regular" as const));
    setStep("configure");
  };

  const handleSelectSpot = (index: number) => {
    setSpotCategories((current) => current.map((value, itemIndex) => (itemIndex === index ? selectedCategory : value)));
  };

  const handleCreateFloor = async () => {
    try {
      await createParkingFloor.mutateAsync({
        floor: nextFloor,
        totalSpots,
        spotCategories,
        sectionLayout: sectionPlan,
      });
      toast({
        title: "Piso criado",
        description: `Piso ${nextFloor} solicitado com ${totalSpots} vaga(s) planejada(s).`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Nao foi possivel criar o piso",
        description: error instanceof Error ? error.message : "Tente novamente apos revisar a configuracao.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFloor = async (value: string) => {
    const floor = Number(value);
    if (!Number.isFinite(floor)) return;

    const confirmed = window.confirm(`Excluir o piso ${floor} e todas as vagas sem veiculo vinculado?`);
    if (!confirmed) return;

    try {
      const result = await deleteParkingFloor.mutateAsync(floor);
      toast({
        title: "Piso excluido",
        description: `Piso ${result.floor} removido do mapa.`,
      });
    } catch (error) {
      toast({
        title: "Nao foi possivel excluir o piso",
        description: error instanceof Error ? error.message : "Verifique se existem vagas ou veiculos vinculados.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Gerenciar pisos</DialogTitle>
          <DialogDescription>
            Crie um novo piso na sequencia automatica ou exclua um piso sem veiculos vinculados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <div className="space-y-4">
            {step === "quantity" ? (
              <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proximo piso</p>
                    <Input value={nextFloor} disabled />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantidade de vagas</p>
                    <Input
                      type="number"
                      min={1}
                      value={totalSpots}
                      onChange={(event) => setTotalSpots(Number(event.target.value))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Quantidade de secoes
                    </p>
                    <Input
                      type="number"
                      min={1}
                      placeholder={`Opcional. Ex.: ${Math.max(existingRegularSections.length, 1)}`}
                      value={sectionCountInput}
                      onChange={(event) => setSectionCountInput(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Vagas por secao
                    </p>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Opcional"
                      value={spotsPerSectionInput}
                      onChange={(event) => setSpotsPerSectionInput(event.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Previa das secoes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sectionPlan.map((section) => (
                      <div key={section.name} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
                        <span className="font-semibold text-foreground">Secao {section.name}</span>
                        <span className="ml-2 text-muted-foreground">{section.capacity} vaga(s)</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Se a quantidade de secoes ficar vazia, o sistema cria apenas uma secao. Quando houver mais de uma,
                    ele segue a ordem das secoes existentes; se nao houver piso, comeca na secao A.
                  </p>
                  {capacityOverflow ? (
                    <p className="mt-2 text-sm text-destructive">
                      A configuracao atual de secoes nao comporta todas as vagas informadas.
                    </p>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                  <Button type="button" onClick={handleContinue}>
                    Continuar
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Piso {nextFloor}</p>
                    <p className="text-sm text-muted-foreground">
                      A posicao define a secao. O clique muda apenas a categoria da vaga.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setStep("quantity")}>
                    Voltar
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-all",
                        option.cardClass,
                        selectedCategory !== option.value && "opacity-70",
                        selectedCategory === option.value && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      onClick={() => setSelectedCategory(option.value)}
                    >
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <p className="text-xs font-medium uppercase tracking-wide">{option.label}</p>
                      </div>
                      <p className="mt-1 text-lg font-semibold">{categoryCounts[option.value]}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-5">
                  {sectionRanges.map((section) => (
                    <div key={section.name} className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/80">Secao {section.name}</p>
                        <p className="text-sm text-muted-foreground">{section.indices.length} vaga(s)</p>
                      </div>
                      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                        {section.indices.map((index) => {
                          const category = spotCategories[index];
                          const style = categoryOptions.find((option) => option.value === category)!;
                          const Icon = style.icon;
                          return (
                            <button
                              key={index}
                              type="button"
                              className={cn(
                                "aspect-[1.1/1] rounded-2xl border px-2 py-3 text-center transition-all hover:scale-[1.02]",
                                style.cardClass,
                              )}
                              onClick={() => handleSelectSpot(index)}
                            >
                              <Icon className="mx-auto h-5 w-5" />
                              <p className="mt-2 font-mono text-xl font-bold">{String(index + 1).padStart(2, "0")}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleCreateFloor} disabled={createParkingFloor.isPending}>
                    Criar piso
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-4">
            <div>
              <h3 className="font-semibold text-foreground">Excluir piso</h3>
              <p className="text-sm text-muted-foreground">
                A exclusao remove todas as vagas do piso. Pisos com veiculos vinculados nao podem ser removidos.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selecionar piso</p>
              <Select onValueChange={handleDeleteFloor} disabled={floorSummaries.length === 0 || deleteParkingFloor.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um piso para excluir" />
                </SelectTrigger>
                <SelectContent>
                  {floorSummaries.map((summary) => (
                    <SelectItem key={summary.floor} value={String(summary.floor)}>
                      Piso {summary.floor} - {summary.total} vaga(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {floorSummaries.map((summary) => (
                <div key={summary.floor} className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">Piso {summary.floor}</p>
                  <p className="text-muted-foreground">
                    {summary.total} vaga(s) no total, {summary.occupied} ocupada(s)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
