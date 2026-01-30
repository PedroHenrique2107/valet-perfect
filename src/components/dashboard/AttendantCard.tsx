import { cn } from '@/lib/utils';
import { Attendant } from '@/types/valet';
import { Star, Timer, Car, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AttendantCardProps {
  attendant: Attendant;
  className?: string;
}

const statusConfig = {
  available: {
    label: 'Disponível',
    className: 'status-available',
    dotColor: 'bg-success',
  },
  busy: {
    label: 'Ocupado',
    className: 'status-busy',
    dotColor: 'bg-warning animate-pulse',
  },
  break: {
    label: 'Intervalo',
    className: 'status-occupied',
    dotColor: 'bg-muted-foreground',
  },
  offline: {
    label: 'Offline',
    className: 'bg-muted text-muted-foreground border-muted',
    dotColor: 'bg-muted-foreground',
  },
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function AttendantCard({ attendant, className }: AttendantCardProps) {
  const status = statusConfig[attendant.status];

  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50',
        !attendant.isOnline && 'opacity-60',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={attendant.photo} alt={attendant.name} />
            <AvatarFallback>{attendant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card',
              status.dotColor
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{attendant.name}</h3>
          <Badge variant="outline" className={cn('text-xs mt-1', status.className)}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1 text-warning mb-1">
            <Star className="h-3.5 w-3.5 fill-warning" />
            <span className="font-bold text-sm">{attendant.rating.toFixed(1)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase">Avaliação</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1 text-info mb-1">
            <Timer className="h-3.5 w-3.5" />
            <span className="font-bold text-sm font-mono">{formatTime(attendant.avgServiceTime)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase">Tempo Médio</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1 text-success mb-1">
            <Car className="h-3.5 w-3.5" />
            <span className="font-bold text-sm">{attendant.vehiclesHandled}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase">Veículos</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          disabled={!attendant.isOnline}
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
          Mensagem
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs bg-primary hover:bg-primary/90"
          disabled={attendant.status !== 'available'}
        >
          Atribuir Tarefa
        </Button>
      </div>

      {/* Shift Badge */}
      <div className="absolute top-2 right-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase font-medium">
          {attendant.shift === 'morning' && 'Manhã'}
          {attendant.shift === 'afternoon' && 'Tarde'}
          {attendant.shift === 'night' && 'Noite'}
        </span>
      </div>
    </div>
  );
}
