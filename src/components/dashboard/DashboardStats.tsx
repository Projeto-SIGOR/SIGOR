import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CheckCircle, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  vehiclesAvailable: number;
  vehiclesBusy: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    fetchStats();
  }, [profile?.organization_id]);

  const fetchStats = async () => {
    try {
      let occurrencesQuery = supabase.from('occurrences').select('status', { count: 'exact' });
      
      if (profile?.organization_id) {
        occurrencesQuery = occurrencesQuery.eq('organization_id', profile.organization_id);
      }

      const { data: occurrences, count } = await occurrencesQuery;
      
      const pending = occurrences?.filter(o => o.status === 'pending').length || 0;
      const inProgress = occurrences?.filter(o => 
        ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(o.status)
      ).length || 0;
      const completed = occurrences?.filter(o => 
        ['completed', 'cancelled'].includes(o.status)
      ).length || 0;

      // Fetch vehicle stats
      const { data: vehicles } = await supabase.from('vehicles').select('status');
      
      const vehiclesAvailable = vehicles?.filter(v => v.status === 'available').length || 0;
      const vehiclesBusy = vehicles?.filter(v => v.status === 'busy').length || 0;

      setStats({
        total: count || 0,
        pending,
        inProgress,
        completed,
        vehiclesAvailable,
        vehiclesBusy,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pendentes',
      value: stats?.pending || 0,
      description: 'Aguardando despacho',
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Em Andamento',
      value: stats?.inProgress || 0,
      description: 'Ocorrências ativas',
      icon: Clock,
      color: 'text-police',
      bgColor: 'bg-police/10',
    },
    {
      title: 'Encerradas Hoje',
      value: stats?.completed || 0,
      description: 'Concluídas com sucesso',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Viaturas',
      value: `${stats?.vehiclesAvailable || 0}/${(stats?.vehiclesAvailable || 0) + (stats?.vehiclesBusy || 0)}`,
      description: 'Disponíveis para despacho',
      icon: Truck,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
