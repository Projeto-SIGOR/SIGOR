import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Phone,
  Plus,
  RefreshCw,
  Car,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OccurrenceForm } from '@/components/occurrences/OccurrenceForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { statusLabels, priorityLabels } from '@/types/sigor';

interface PendingOccurrence {
  id: string;
  code: string;
  title: string;
  priority: string;
  type: string;
  status: string;
  location_address: string | null;
  caller_phone: string | null;
  created_at: string;
}

interface AvailableVehicle {
  id: string;
  identifier: string;
  type: string;
  base: { name: string };
}

export function DispatcherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [pendingOccurrences, setPendingOccurrences] = useState<PendingOccurrence[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending occurrences
      let query = supabase
        .from('occurrences')
        .select('*')
        .in('status', ['pending', 'dispatched'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { data: occurrences } = await query;
      setPendingOccurrences((occurrences || []) as PendingOccurrence[]);

      // Fetch available vehicles
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select(`
          id,
          identifier,
          type,
          base:bases!inner(name, organization_id)
        `)
        .eq('status', 'available');

      const filteredVehicles = profile?.organization_id
        ? vehicles?.filter((v: any) => v.base.organization_id === profile.organization_id)
        : vehicles;

      setAvailableVehicles((filteredVehicles || []) as unknown as AvailableVehicle[]);
    } catch (error) {
      console.error('Error fetching dispatcher data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscription for occurrences
    const channel = supabase
      .channel('dispatcher-occurrences')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'occurrences' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id]);

  const getPriorityClass = (priority: string) => {
    const classes: Record<string, string> = {
      critical: 'bg-emergency/20 text-emergency border-emergency/30 blink-critical',
      high: 'bg-fire/20 text-fire border-fire/30',
      medium: 'bg-warning/20 text-warning-foreground border-warning/30',
      low: 'bg-success/20 text-success border-success/30',
    };
    return classes[priority] || '';
  };

  const criticalCount = pendingOccurrences.filter(o => o.priority === 'critical').length;
  const highCount = pendingOccurrences.filter(o => o.priority === 'high').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Central de Despacho</h2>
          <p className="text-muted-foreground">Gerencie ocorrências e viaturas em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ocorrência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
              </DialogHeader>
              <OccurrenceForm onSuccess={() => {
                setIsFormOpen(false);
                fetchData();
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={criticalCount > 0 ? 'border-emergency' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${criticalCount > 0 ? 'bg-emergency/20' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? 'text-emergency' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Críticas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-fire/10 rounded-lg">
                <Activity className="h-5 w-5 text-fire" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highCount}</p>
                <p className="text-xs text-muted-foreground">Alta Prioridade</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingOccurrences.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Car className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableVehicles.length}</p>
                <p className="text-xs text-muted-foreground">Viaturas Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Occurrences */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg">Ocorrências Aguardando</h3>
          
          {pendingOccurrences.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma ocorrência pendente no momento
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingOccurrences.map((occurrence) => (
                <Card 
                  key={occurrence.id} 
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    occurrence.priority === 'critical' ? 'border-emergency' : ''
                  }`}
                  onClick={() => navigate(`/occurrences/${occurrence.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getPriorityClass(occurrence.priority)}>
                            {priorityLabels[occurrence.priority as keyof typeof priorityLabels]}
                          </Badge>
                          <Badge variant="secondary">
                            {statusLabels[occurrence.status as keyof typeof statusLabels]}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {occurrence.code}
                          </span>
                        </div>
                        <h4 className="font-medium truncate">{occurrence.title}</h4>
                        {occurrence.location_address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {occurrence.location_address}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{format(new Date(occurrence.created_at), 'HH:mm', { locale: ptBR })}</p>
                        <p>{format(new Date(occurrence.created_at), 'dd/MM', { locale: ptBR })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Available Vehicles */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Viaturas Disponíveis</h3>
          
          {availableVehicles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma viatura disponível
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {availableVehicles.map((vehicle) => (
                <Card key={vehicle.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vehicle.identifier}</p>
                        <p className="text-xs text-muted-foreground">{vehicle.type}</p>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success">
                        Disponível
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
