import { cn } from "@/lib/utils";
import type { Activity } from "@/types/valet";
import { AlertTriangle, Car, CreditCard, LogIn, LogOut } from "lucide-react";

const activityIcons = {
  entry: { icon: LogIn, color: "text-success bg-success/10" },
  exit: { icon: LogOut, color: "text-info bg-info/10" },
  payment: { icon: CreditCard, color: "text-primary bg-primary/10" },
  alert: { icon: AlertTriangle, color: "text-warning bg-warning/10" },
  request: { icon: Car, color: "text-accent bg-accent/10" },
};

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Atividades Recentes</h3>
          <p className="text-sm text-muted-foreground">Tempo real</p>
        </div>
        <button className="text-xs text-primary hover:underline">Ver todas</button>
      </div>

      <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2">
        {activities.map((activity, index) => {
          const config = activityIcons[activity.type];
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className={cn("flex gap-3 animate-fade-in-up", {
                "animate-slide-in-right": index === 0,
              })}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn("h-fit rounded-lg p-2", config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  {activity.plate && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {activity.plate}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">{activity.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
