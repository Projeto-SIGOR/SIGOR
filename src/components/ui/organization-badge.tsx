import { cn } from '@/lib/utils';
import { OrganizationType, organizationLabels } from '@/types/sigor';
import { Shield, Ambulance, Flame } from 'lucide-react';

interface OrganizationBadgeProps {
  type: OrganizationType;
  className?: string;
  showLabel?: boolean;
}

const orgColors: Record<OrganizationType, string> = {
  police: 'bg-police/10 text-police border-police/30',
  samu: 'bg-samu/10 text-samu border-samu/30',
  fire: 'bg-fire/10 text-fire border-fire/30',
};

const orgIcons: Record<OrganizationType, typeof Shield> = {
  police: Shield,
  samu: Ambulance,
  fire: Flame,
};

export function OrganizationBadge({ type, className, showLabel = true }: OrganizationBadgeProps) {
  const Icon = orgIcons[type];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
        orgColors[type],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel && organizationLabels[type]}
    </span>
  );
}
