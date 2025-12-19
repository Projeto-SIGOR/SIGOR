import { cn } from '@/lib/utils';
import { OccurrenceStatus, PriorityLevel, statusLabels, priorityLabels } from '@/types/sigor';

interface StatusBadgeProps {
  status: OccurrenceStatus;
  className?: string;
}

const statusColors: Record<OccurrenceStatus, string> = {
  pending: 'bg-warning/20 text-warning-foreground border-warning/30',
  dispatched: 'bg-police/20 text-police border-police/30',
  en_route: 'bg-fire/20 text-fire border-fire/30',
  on_scene: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  transporting: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  completed: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusColors[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
  pulse?: boolean;
}

const priorityColors: Record<PriorityLevel, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning-foreground border-warning/30',
  high: 'bg-fire/20 text-fire border-fire/30',
  critical: 'bg-emergency/20 text-emergency border-emergency/30',
};

export function PriorityBadge({ priority, className, pulse }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        priorityColors[priority],
        pulse && priority === 'critical' && 'animate-pulse-emergency',
        className
      )}
    >
      {priorityLabels[priority]}
    </span>
  );
}
