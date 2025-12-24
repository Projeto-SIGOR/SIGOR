import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Clock, 
  Phone,
  RefreshCw,
  Navigation,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { statusLabels, priorityLabels } from '@/types/sigor';
import { useToast } from '@/hooks/use-toast';
import { VehicleCrewPanel } from '@/components/vehicles/VehicleCrewPanel';
import { useDispatchNotifications } from '@/hooks/useDispatchNotifications';

interface TeamDispatch {
  id: string;
  status: string;
  dispatched_at: string;
  acknowledged_at: string | null;
  arrived_at: string | null;
  occurrence: {
    id: string;
    code: string;
    title: string;
    priority: string;
    description: string | null;
    location_address: string | null;
    location_reference: string | null;
    caller_phone: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  vehicle: {
    identifier: string;
    type: string;
  };
}

export function TeamDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dispatches, setDispatches] = useState<TeamDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Initialize dispatch notifications
  useDispatchNotifications();

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      // Get dispatches for the user's organization
      const { data, error } = await supabase
        .from('dispatches')
        .select(`
          id,
          status,
          dispatched_at,
          acknowledged_at,
          arrived_at,
          occurrence:occurrences!inner(
            id,
            code,
            title,
            priority,
            description,
            location_address,
            location_reference,
            caller_phone,
            latitude,
            longitude
          ),
          vehicle:vehicles!inner(
            identifier,
            type
          )
        `)
        .in('status', ['dispatched', 'en_route', 'on_scene', 'transporting'])
        .order('dispatched_at', { ascending: false });

      if (error) throw error;
      setDispatches((data || []) as unknown as TeamDispatch[]);
    } catch (error) {
      console.error('Error fetching dispatches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();

    // Real-time subscription
    const channel = supabase
      .channel('team-dispatches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dispatches' },
        () => fetchDispatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateDispatchStatus = async (dispatchId: string, newStatus: string) => {
    if (!user) return;
    
    setUpdating(dispatchId);
    try {
      const updates: Record<string, any> = { status: newStatus };
      
      if (newStatus === 'en_route' && !dispatches.find(d => d.id === dispatchId)?.acknowledged_at) {
        updates.acknowledged_at = new Date().toISOString();
      }
      if (newStatus === 'on_scene') {
        updates.arrived_at = new Date().toISOString();
      }
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('dispatches')
        .update(updates)
        .eq('id', dispatchId);

      if (error) throw error;

      // Log to history
      const dispatch = dispatches.find(d => d.id === dispatchId);
      if (dispatch) {
        await supabase.from('occurrence_history').insert([{
          occurrence_id: dispatch.occurrence.id,
          dispatch_id: dispatchId,
          previous_status: dispatch.status as "pending" | "dispatched" | "en_route" | "on_scene" | "transporting" | "completed" | "cancelled",
          new_status: newStatus as "pending" | "dispatched" | "en_route" | "on_scene" | "transporting" | "completed" | "cancelled",
          changed_by: user.id,
        }]);

        // Update occurrence status
        await supabase
          .from('occurrences')
          .update({ status: newStatus as "pending" | "dispatched" | "en_route" | "on_scene" | "transporting" | "completed" | "cancelled" })
          .eq('id', dispatch.occurrence.id);
      }

      toast({
        title: 'Status atualizado',
        description: `Despacho atualizado para ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });

      fetchDispatches();
    } catch (error) {
      console.error('Error updating dispatch:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getPriorityClass = (priority: string) => {
    const classes: Record<string, string> = {
      critical: 'bg-emergency/20 text-emergency border-emergency/30',
      high: 'bg-fire/20 text-fire border-fire/30',
      medium: 'bg-warning/20 text-warning-foreground border-warning/30',
      low: 'bg-success/20 text-success border-success/30',
    };
    return classes[priority] || '';
  };

  const getNextStatus = (currentStatus: string) => {
    const flow: Record<string, string> = {
      dispatched: 'en_route',
      en_route: 'on_scene',
      on_scene: 'transporting',
      transporting: 'completed',
    };
    return flow[currentStatus];
  };

  const getStatusButton = (status: string) => {
    const labels: Record<string, string> = {
      dispatched: 'A Caminho',
      en_route: 'Chegou',
      on_scene: 'Transportando',
      transporting: 'Concluir',
    };
    return labels[status] || 'Próximo';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Crew Panel */}
      <VehicleCrewPanel />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meus Despachos</h2>
          <p className="text-muted-foreground">Acompanhe e atualize suas ocorrências</p>
        </div>
        <Button variant="outline" onClick={fetchDispatches}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {dispatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
            <h3 className="font-semibold text-lg mb-1">Nenhum despacho ativo</h3>
            <p className="text-muted-foreground">Você não possui ocorrências em andamento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dispatches.map((dispatch) => (
            <Card 
              key={dispatch.id}
              className={dispatch.occurrence.priority === 'critical' ? 'border-emergency' : ''}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getPriorityClass(dispatch.occurrence.priority)}>
                        {priorityLabels[dispatch.occurrence.priority as keyof typeof priorityLabels]}
                      </Badge>
                      <Badge variant="secondary">
                        {statusLabels[dispatch.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{dispatch.occurrence.title}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {dispatch.occurrence.code} • {dispatch.vehicle.identifier}
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(dispatch.dispatched_at), { 
                        locale: ptBR, 
                        addSuffix: true 
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dispatch.occurrence.description && (
                  <p className="text-sm">{dispatch.occurrence.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dispatch.occurrence.location_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="font-medium">{dispatch.occurrence.location_address}</p>
                        {dispatch.occurrence.location_reference && (
                          <p className="text-muted-foreground">{dispatch.occurrence.location_reference}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {dispatch.occurrence.caller_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${dispatch.occurrence.caller_phone}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {dispatch.occurrence.caller_phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t">
                  {dispatch.occurrence.latitude && dispatch.occurrence.longitude && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${dispatch.occurrence.latitude},${dispatch.occurrence.longitude}`,
                          '_blank'
                        );
                      }}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Abrir GPS
                    </Button>
                  )}

                  {getNextStatus(dispatch.status) && (
                    <Button
                      size="sm"
                      onClick={() => updateDispatchStatus(dispatch.id, getNextStatus(dispatch.status))}
                      disabled={updating === dispatch.id}
                    >
                      {updating === dispatch.id && (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {getStatusButton(dispatch.status)}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/occurrences/${dispatch.occurrence.id}`)}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
