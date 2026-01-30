import { cn } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  QrCode, 
  Receipt, 
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  className?: string;
}

const actions = [
  {
    icon: Plus,
    label: 'Nova Entrada',
    description: 'Registrar veículo',
    variant: 'default' as const,
    gradient: true,
  },
  {
    icon: Search,
    label: 'Buscar Veículo',
    description: 'Por placa ou cliente',
    variant: 'outline' as const,
  },
  {
    icon: QrCode,
    label: 'Ler QR Code',
    description: 'Scanner rápido',
    variant: 'outline' as const,
  },
  {
    icon: Receipt,
    label: 'Registrar Saída',
    description: 'Checkout',
    variant: 'outline' as const,
  },
  {
    icon: UserPlus,
    label: 'Novo Cliente',
    description: 'Cadastrar',
    variant: 'outline' as const,
  },
  {
    icon: AlertCircle,
    label: 'Reportar',
    description: 'Incidente',
    variant: 'outline' as const,
  },
];

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3', className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant={action.variant}
            className={cn(
              'h-auto flex-col gap-2 py-4 px-3',
              action.gradient && 'bg-gradient-primary hover:opacity-90 border-0',
              !action.gradient && 'hover:bg-muted/50'
            )}
          >
            <Icon className="h-5 w-5" />
            <div className="text-center">
              <p className="font-medium text-sm">{action.label}</p>
              <p className={cn(
                'text-[10px]',
                action.gradient ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                {action.description}
              </p>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
