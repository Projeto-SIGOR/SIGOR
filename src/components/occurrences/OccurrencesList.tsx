import { useOccurrences } from '@/hooks/useOccurrences';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { OrganizationBadge } from '@/components/ui/organization-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Phone, User, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Occurrence, OccurrenceStatus } from '@/types/sigor';

export function OccurrencesList() {
  const { profile } = useAuth();
  const { occurrences, loading, updateOccurrenceStatus } = useOccurrences(profile?.organization_id);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (occurrences.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma ocorrência</h3>
          <p className="text-muted-foreground">
            Não há ocorrências registradas no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeOccurrences = occurrences.filter(o => 
    !['completed', 'cancelled'].includes(o.status)
  );
  
  const recentOccurrences = occurrences.filter(o => 
    ['completed', 'cancelled'].includes(o.status)
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Active Occurrences */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emergency opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emergency"></span>
          </span>
          Ocorrências Ativas ({activeOccurrences.length})
        </h2>
        
        <div className="space-y-3">
          {activeOccurrences.map((occurrence) => (
            <OccurrenceCard key={occurrence.id} occurrence={occurrence} />
          ))}
        </div>
      </div>

      {/* Recent Completed */}
      {recentOccurrences.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Ocorrências Recentes</h2>
          <div className="space-y-3">
            {recentOccurrences.map((occurrence) => (
              <OccurrenceCard key={occurrence.id} occurrence={occurrence} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface OccurrenceCardProps {
  occurrence: Occurrence;
  compact?: boolean;
}

function OccurrenceCard({ occurrence, compact }: OccurrenceCardProps) {
  const isCritical = occurrence.priority === 'critical';
  const isPending = occurrence.status === 'pending';

  return (
    <Card 
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        isCritical && isPending && 'border-emergency/50 blink-critical'
      )}
    >
      <CardContent className={cn('p-4', compact && 'py-3')}>
        <div className="flex items-start gap-4">
          {/* Left - Priority indicator */}
          <div className={cn(
            'w-1 self-stretch rounded-full',
            occurrence.priority === 'critical' && 'bg-emergency',
            occurrence.priority === 'high' && 'bg-fire',
            occurrence.priority === 'medium' && 'bg-warning',
            occurrence.priority === 'low' && 'bg-success',
          )} />
          
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-muted-foreground">
                    {occurrence.code}
                  </span>
                  {occurrence.organization && (
                    <OrganizationBadge type={occurrence.organization.type} showLabel={false} />
                  )}
                </div>
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {occurrence.title}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <PriorityBadge priority={occurrence.priority} pulse={isCritical && isPending} />
                <StatusBadge status={occurrence.status} />
              </div>
            </div>
            
            {!compact && (
              <>
                {occurrence.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {occurrence.description}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {occurrence.location_address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{occurrence.location_address}</span>
                    </span>
                  )}
                  
                  {occurrence.caller_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {occurrence.caller_name}
                    </span>
                  )}
                  
                  {occurrence.caller_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {occurrence.caller_phone}
                    </span>
                  )}
                </div>
              </>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(occurrence.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
              
              <Button variant="ghost" size="sm" className="h-8">
                Ver detalhes
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
