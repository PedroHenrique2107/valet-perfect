import { cn } from '@/lib/utils';
import { ParkingSpot } from '@/types/valet';
import { Car, Zap, Accessibility, Crown, Bike, Wrench } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ParkingMapProps {
  spots: ParkingSpot[];
  className?: string;
}

const spotTypeIcons = {
  regular: Car,
  vip: Crown,
  accessible: Accessibility,
  electric: Zap,
  motorcycle: Bike,
};

const statusColors = {
  available: 'bg-success/20 border-success/50 hover:bg-success/30',
  occupied: 'bg-destructive/20 border-destructive/50',
  reserved: 'bg-info/20 border-info/50',
  maintenance: 'bg-muted border-muted-foreground/30',
};

const statusLabels = {
  available: 'Disponível',
  occupied: 'Ocupado',
  reserved: 'Reservado',
  maintenance: 'Manutenção',
};

export function ParkingMap({ spots, className }: ParkingMapProps) {
  // Group spots by section
  const spotsBySection = spots.reduce((acc, spot) => {
    if (!acc[spot.section]) {
      acc[spot.section] = [];
    }
    acc[spot.section].push(spot);
    return acc;
  }, {} as Record<string, ParkingSpot[]>);

  const stats = {
    available: spots.filter((s) => s.status === 'available').length,
    occupied: spots.filter((s) => s.status === 'occupied').length,
    reserved: spots.filter((s) => s.status === 'reserved').length,
    maintenance: spots.filter((s) => s.status === 'maintenance').length,
  };

  return (
    <div className={cn('stat-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Mapa do Pátio</h3>
          <p className="text-sm text-muted-foreground">Piso 1 • Visão em tempo real</p>
        </div>
        <div className="flex gap-4 text-xs">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-3 w-3 rounded border',
                  statusColors[key as keyof typeof statusColors]
                )}
              />
              <span className="text-muted-foreground">
                {label} ({stats[key as keyof typeof stats]})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Grid */}
      <div className="space-y-6">
        {Object.entries(spotsBySection).map(([section, sectionSpots]) => (
          <div key={section}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Seção {section}
            </h4>
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {sectionSpots.map((spot) => {
                const Icon = spotTypeIcons[spot.type];
                const isInteractive = spot.status === 'available';

                return (
                  <Tooltip key={spot.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'relative aspect-[3/2] rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center gap-0.5',
                          statusColors[spot.status],
                          isInteractive && 'cursor-pointer',
                          !isInteractive && 'cursor-default'
                        )}
                        disabled={!isInteractive}
                      >
                        <Icon className={cn(
                          'h-4 w-4',
                          spot.status === 'available' && 'text-success',
                          spot.status === 'occupied' && 'text-destructive',
                          spot.status === 'reserved' && 'text-info',
                          spot.status === 'maintenance' && 'text-muted-foreground',
                        )} />
                        <span className="text-[10px] font-mono font-medium text-foreground/80">
                          {spot.code.split('-')[1]}
                        </span>
                        {spot.status === 'maintenance' && (
                          <Wrench className="absolute -top-1 -right-1 h-3 w-3 text-warning" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-sm">
                        <p className="font-semibold">{spot.code}</p>
                        <p className="text-muted-foreground">
                          {spot.type === 'regular' && 'Regular'}
                          {spot.type === 'vip' && 'VIP'}
                          {spot.type === 'accessible' && 'Acessível'}
                          {spot.type === 'electric' && 'Elétrico'}
                          {spot.type === 'motorcycle' && 'Moto'}
                        </p>
                        <p className={cn(
                          'font-medium',
                          spot.status === 'available' && 'text-success',
                          spot.status === 'occupied' && 'text-destructive',
                          spot.status === 'reserved' && 'text-info',
                        )}>
                          {statusLabels[spot.status]}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
