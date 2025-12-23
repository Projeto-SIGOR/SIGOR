import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/ui/status-badge';
import { 
  Heart, 
  AlertTriangle, 
  Ambulance, 
  Clock, 
  Plus,
  MapPin,
  Activity
} from 'lucide-react';
import { Occurrence, Vehicle } from '@/types/sigor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SamuDispatcherDashboard() {
  const navigate = useNavigate();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('samu-dispatcher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'occurrences' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: occData } = await supabase
        .from('occurrences')
        .select('*, organization:organizations(*)')
        .eq('type', 'medical')
        .in('status', ['pending', 'dispatched', 'en_route', 'on_scene', 'transporting'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (occData) setOccurrences(occData as Occurrence[]);

      const { data: vehData } = await supabase
        .from('vehicles')
        .select('*, base:bases(*)')
        .eq('status', 'available');

      if (vehData) setVehicles(vehData as Vehicle[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = occurrences.filter(o => o.status === 'pending').length;
  const transportingCount = occurrences.filter(o => o.status === 'transporting').length;
  const criticalCount = occurrences.filter(o => o.priority === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-samu/20 flex items-center justify-center">
            <Heart className="h-6 w-6 text-samu" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Central SAMU 192</h1>
            <p className="text-muted-foreground">Serviço de Atendimento Móvel de Urgência</p>
          </div>
        </div>
        <Button onClick={() => navigate('/ocorrencias/nova')} className="gap-2 bg-samu hover:bg-samu/90">
          <Plus className="h-4 w-4" />
          Nova Ocorrência
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Despacho</p>
                <p className="text-3xl font-bold text-warning">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emergency">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Casos Críticos</p>
                <p className="text-3xl font-bold text-emergency">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-emergency" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-samu">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Transporte</p>
                <p className="text-3xl font-bold text-samu">{transportingCount}</p>
              </div>
              <Activity className="h-8 w-8 text-samu" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ambulâncias Livres</p>
                <p className="text-3xl font-bold text-success">{vehicles.length}</p>
              </div>
              <Ambulance className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Occurrences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-samu" />
              Chamados Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : occurrences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum chamado ativo
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {occurrences.map((occurrence) => (
                  <div
                    key={occurrence.id}
                    className="p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors border-l-4 border-l-samu"
                    onClick={() => navigate(`/ocorrencias/${occurrence.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-muted-foreground">
                            {occurrence.code}
                          </span>
                          <PriorityBadge priority={occurrence.priority} />
                          <Badge variant="outline">
                            {occurrence.status === 'transporting' ? 'Transportando' : 
                             occurrence.status === 'on_scene' ? 'No Local' : 
                             occurrence.status === 'en_route' ? 'A Caminho' : 'Pendente'}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground">{occurrence.title}</p>
                        {occurrence.location_address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {occurrence.location_address}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(occurrence.created_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ambulances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ambulance className="h-5 w-5 text-samu" />
              Ambulâncias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma ambulância disponível
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vehicle.identifier}</p>
                        <p className="text-sm text-muted-foreground">{vehicle.type}</p>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success">
                        Disponível
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
