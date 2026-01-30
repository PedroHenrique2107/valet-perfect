import { cn } from '@/lib/utils';
import { 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  CreditCard, 
  User,
  Car,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'entry' | 'exit' | 'payment' | 'alert' | 'request';
  title: string;
  description: string;
  time: string;
  plate?: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'request',
    title: 'Veículo Solicitado',
    description: 'Maria Santos solicitou o veículo XYZ-5678',
    time: '2 min atrás',
    plate: 'XYZ-5678',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Pagamento Recebido',
    description: 'PIX de R$ 45,00 - João Silva',
    time: '5 min atrás',
  },
  {
    id: '3',
    type: 'entry',
    title: 'Nova Entrada',
    description: 'Honda Civic prata entrou - Vaga B-18',
    time: '8 min atrás',
    plate: 'QWE-4567',
  },
  {
    id: '4',
    type: 'exit',
    title: 'Saída Registrada',
    description: 'Toyota Corolla branco - 2h 15min',
    time: '12 min atrás',
    plate: 'RTY-8901',
  },
  {
    id: '5',
    type: 'alert',
    title: 'Alerta de Ocupação',
    description: 'Ocupação atingiu 85% - Considere redistribuição',
    time: '15 min atrás',
  },
  {
    id: '6',
    type: 'entry',
    title: 'Cliente VIP',
    description: 'BMW X5 branco - Carlos Oliveira',
    time: '20 min atrás',
    plate: 'DEF-9012',
  },
];

const activityIcons = {
  entry: { icon: LogIn, color: 'text-success bg-success/10' },
  exit: { icon: LogOut, color: 'text-info bg-info/10' },
  payment: { icon: CreditCard, color: 'text-primary bg-primary/10' },
  alert: { icon: AlertTriangle, color: 'text-warning bg-warning/10' },
  request: { icon: Car, color: 'text-accent bg-accent/10' },
};

interface ActivityFeedProps {
  className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Atividades Recentes</h3>
          <p className="text-sm text-muted-foreground">Tempo real</p>
        </div>
        <button className="text-xs text-primary hover:underline">Ver todas</button>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {mockActivities.map((activity, index) => {
          const config = activityIcons[activity.type];
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className={cn(
                'flex gap-3 animate-fade-in-up',
                { 'animate-slide-in-right': index === 0 }
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn('p-2 rounded-lg h-fit', config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground">{activity.title}</p>
                  {activity.plate && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {activity.plate}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
