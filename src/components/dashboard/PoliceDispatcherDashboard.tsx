import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge, StatusBadge } from '@/components/ui/status-badge';
import { 
  Shield, 
  AlertTriangle, 
  Car, 
  Clock, 
  Plus,
  MapPin,
  Radio
} from 'lucide-react';
import { Occurrence, Vehicle } from '@/types/sigor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PoliceDispatcherDashboard() {
  const navigate = useNavigate();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Real-time subscription
    const channel = supabase
      .channel('police-dispatcher')
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
      // Fetch police occurrences
      const { data: occData } = await supabase
        .from('occurrences')
        .select('*, organization:organizations(*)')
        .eq('type', 'police')
        .in('status', ['pending', 'dispatched', 'en_route', 'on_scene'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (occData) setOccurrences(occData as Occurrence[]);

      // Fetch available vehicles
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
  const criticalCount = occurrences.filter(o => o.priority === 'critical' || o.priority === 'high').length;
  const activeCount = occurrences.filter(o => o.status !== 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-police/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-police" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">COPOM - Central de Operações</h1>
            <p className="text-muted-foreground">Polícia Militar</p>
          </div>
        </div>
        <Button onClick={() => navigate('/ocorrencias/nova')} className="gap-2 bg-police hover:bg-police/90">
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
                <p className="text-sm text-muted-foreground">Alta Prioridade</p>
                <p className="text-3xl font-bold text-emergency">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-emergency" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Atendimento</p>
                <p className="text-3xl font-bold text-success">{activeCount}</p>
              </div>
              <Radio className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-police">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Viaturas Disponíveis</p>
                <p className="text-3xl font-bold text-police">{vehicles.length}</p>
              </div>
              <Car className="h-8 w-8 text-police" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending Occurrences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Ocorrências Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : occurrences.filter(o => o.status === 'pending').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma ocorrência pendente
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {occurrences
                  .filter(o => o.status === 'pending')
                  .map((occurrence) => (
                    <div
                      key={occurrence.id}
                      className="p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors border-l-4"
                      style={{
                        borderLeftColor: 
                          occurrence.priority === 'critical' ? 'hsl(var(--emergency))' :
                          occurrence.priority === 'high' ? 'hsl(var(--fire))' :
                          'hsl(var(--warning))'
                      }}
                      onClick={() => navigate(`/ocorrencias/${occurrence.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">
                              {occurrence.code}
                            </span>
                            <PriorityBadge priority={occurrence.priority} />
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

        {/* Available Vehicles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-police" />
              Viaturas Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma viatura disponível
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Button variant="outline" className="h-16" onClick={() => navigate('/mapa')}>
          <MapPin className="h-5 w-5 mr-2" />
          Mapa em Tempo Real
        </Button>
        <Button variant="outline" className="h-16" onClick={() => navigate('/ocorrencias')}>
          <AlertTriangle className="h-5 w-5 mr-2" />
          Todas Ocorrências
        </Button>
        <Button variant="outline" className="h-16" onClick={() => navigate('/veiculos')}>
          <Car className="h-5 w-5 mr-2" />
          Gerenciar Viaturas
        </Button>
        <Button variant="outline" className="h-16" onClick={() => navigate('/relatorios')}>
          <Radio className="h-5 w-5 mr-2" />
          Relatórios
        </Button>
      </div>
    </div>
  );
}
