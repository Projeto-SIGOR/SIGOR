import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Activity, 
  Clock, 
  MapPin,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Car
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { statusLabels, priorityLabels, organizationLabels } from '@/types/sigor';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Stats {
  total: number;
  active: number;
  completed: number;
  byOrganization: { name: string; value: number }[];
  byStatus: { name: string; value: number; color: string }[];
}

interface RecentOccurrence {
  id: string;
  code: string;
  title: string;
  priority: string;
  status: string;
  type: string;
  created_at: string;
  organization: { name: string; type: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(43, 95%, 56%)',
  dispatched: 'hsl(210, 70%, 50%)',
  en_route: 'hsl(25, 95%, 50%)',
  on_scene: 'hsl(280, 60%, 50%)',
  transporting: 'hsl(180, 60%, 50%)',
  completed: 'hsl(122, 45%, 34%)',
  cancelled: 'hsl(210, 15%, 50%)',
};

export function ObserverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOccurrences, setRecentOccurrences] = useState<RecentOccurrence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all occurrences
      const { data: occurrences } = await supabase
        .from('occurrences')
        .select(`
          id,
          code,
          title,
          priority,
          status,
          type,
          created_at,
          organization:organizations(name, type)
        `)
        .order('created_at', { ascending: false });

      if (!occurrences) return;

      const activeStatuses = ['pending', 'dispatched', 'en_route', 'on_scene', 'transporting'];
      const active = occurrences.filter(o => activeStatuses.includes(o.status));
      const completed = occurrences.filter(o => o.status === 'completed');

      // Group by organization
      const orgGroups = occurrences.reduce((acc, o) => {
        const orgName = o.organization?.name || 'Desconhecido';
        acc[orgName] = (acc[orgName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by status
      const statusGroups = occurrences.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats({
        total: occurrences.length,
        active: active.length,
        completed: completed.length,
        byOrganization: Object.entries(orgGroups).map(([name, value]) => ({ name, value })),
        byStatus: Object.entries(statusGroups).map(([key, value]) => ({
          name: statusLabels[key as keyof typeof statusLabels] || key,
          value,
          color: STATUS_COLORS[key] || '#888',
        })),
      });

      setRecentOccurrences(occurrences.slice(0, 10) as unknown as RecentOccurrence[]);
    } catch (error) {
      console.error('Error fetching observer data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel('observer-occurrences')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'occurrences' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getPriorityClass = (priority: string) => {
    const classes: Record<string, string> = {
      critical: 'bg-emergency/20 text-emergency',
      high: 'bg-fire/20 text-fire',
      medium: 'bg-warning/20 text-warning-foreground',
      low: 'bg-success/20 text-success',
    };
    return classes[priority] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-6 w-6" />
            Painel de Monitoramento
          </h2>
          <p className="text-muted-foreground">Visão em tempo real de todas as ocorrências</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Activity className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.total > 0 
                    ? Math.round((stats.completed / stats.total) * 100) 
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Organização</CardTitle>
            <CardDescription>Distribuição de ocorrências por órgão</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.byOrganization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Ocorrências" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Status</CardTitle>
            <CardDescription>Situação atual das ocorrências</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Occurrences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ocorrências Recentes</CardTitle>
          <CardDescription>Últimas 10 ocorrências registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentOccurrences.map((occurrence) => (
              <div
                key={occurrence.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/occurrences/${occurrence.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={getPriorityClass(occurrence.priority)}>
                    {priorityLabels[occurrence.priority as keyof typeof priorityLabels]}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{occurrence.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {occurrence.code} • {occurrence.organization?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {statusLabels[occurrence.status as keyof typeof statusLabels]}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(occurrence.created_at), { 
                      locale: ptBR, 
                      addSuffix: true 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
