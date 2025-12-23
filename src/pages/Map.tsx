import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOccurrences } from '@/hooks/useOccurrences';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OccurrencesMap } from '@/components/map/OccurrencesMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, Truck, RefreshCw, ArrowLeft } from 'lucide-react';
import { Vehicle, Occurrence, priorityLabels, statusLabels } from '@/types/sigor';

const Map = () => {
  const navigate = useNavigate();
  const { occurrences, loading: occurrencesLoading } = useOccurrences();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();

    // Subscribe to vehicle changes
    const channel = supabase
      .channel('vehicles-map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => fetchVehicles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*, base:bases(*, organization:organizations(*))')
      .eq('status', 'busy');
    
    if (data) setVehicles(data as Vehicle[]);
    setLoading(false);
  };

  const activeOccurrences = occurrences.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );

  const criticalCount = activeOccurrences.filter((o) => o.priority === 'critical').length;
  const highCount = activeOccurrences.filter((o) => o.priority === 'high').length;

  const handleOccurrenceClick = (occurrence: Occurrence) => {
    navigate(`/occurrences/${occurrence.id}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground" />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold text-foreground">Mapa de Ocorrências</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchVehicles();
              }}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </header>

          <div className="flex-1 flex">
            {/* Map */}
            <div className="flex-1 relative">
              {occurrencesLoading || loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Carregando mapa...</p>
                  </div>
                </div>
              ) : (
                <OccurrencesMap
                  occurrences={occurrences}
                  vehicles={vehicles}
                  onOccurrenceClick={handleOccurrenceClick}
                />
              )}
            </div>

            {/* Sidebar with Stats */}
            <div className="w-80 border-l bg-card overflow-auto hidden lg:block">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold text-foreground">Resumo em Tempo Real</h2>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-emergency" />
                        <div>
                          <p className="text-2xl font-bold">{criticalCount}</p>
                          <p className="text-xs text-muted-foreground">Críticas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-fire" />
                        <div>
                          <p className="text-2xl font-bold">{highCount}</p>
                          <p className="text-xs text-muted-foreground">Alta</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{activeOccurrences.length}</p>
                          <p className="text-xs text-muted-foreground">Ativas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-police" />
                        <div>
                          <p className="text-2xl font-bold">{vehicles.length}</p>
                          <p className="text-xs text-muted-foreground">Viaturas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Occurrences */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ocorrências Recentes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeOccurrences.slice(0, 5).map((occ) => (
                      <div
                        key={occ.id}
                        className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleOccurrenceClick(occ)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {occ.code}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              occ.priority === 'critical'
                                ? 'border-emergency text-emergency'
                                : occ.priority === 'high'
                                ? 'border-fire text-fire'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {priorityLabels[occ.priority]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{occ.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {statusLabels[occ.status]}
                        </p>
                      </div>
                    ))}
                    {activeOccurrences.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma ocorrência ativa
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Active Vehicles */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Viaturas em Atendimento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {vehicles.slice(0, 5).map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-police" />
                          <div>
                            <p className="text-sm font-medium">{vehicle.identifier}</p>
                            <p className="text-xs text-muted-foreground">
                              {vehicle.base?.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {vehicles.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma viatura em atendimento
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Map;
