import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Building2, 
  Car, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  Shield,
  Ambulance,
  Flame,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  LineChart,
  Line,
  Legend
} from 'recharts';

interface Stats {
  totalUsers: number;
  totalOrganizations: number;
  totalVehicles: number;
  totalOccurrences: number;
  activeOccurrences: number;
  criticalOccurrences: number;
  occurrencesByType: { name: string; value: number }[];
  occurrencesByPriority: { name: string; value: number; color: string }[];
  weeklyTrend: { day: string; occurrences: number }[];
  avgResponseTime: number;
  completionRate: number;
  responseTimeByOrg: { name: string; time: number }[];
  completionByOrg: { name: string; rate: number }[];
}

const PRIORITY_COLORS = {
  critical: 'hsl(0, 70%, 47%)',
  high: 'hsl(25, 95%, 50%)',
  medium: 'hsl(43, 95%, 56%)',
  low: 'hsl(122, 45%, 34%)',
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [usersRes, orgsRes, vehiclesRes, occurrencesRes, organizationsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('occurrences').select('*, organization:organizations(*)'),
        supabase.from('organizations').select('*'),
      ]);

      const occurrences = occurrencesRes.data || [];
      const organizations = organizationsRes.data || [];
      const activeStatuses = ['pending', 'dispatched', 'en_route', 'on_scene', 'transporting'];
      
      const activeOccurrences = occurrences.filter(o => activeStatuses.includes(o.status));
      const criticalOccurrences = activeOccurrences.filter(o => o.priority === 'critical');

      // Group by type
      const typeGroups = occurrences.reduce((acc, o) => {
        acc[o.type] = (acc[o.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const typeLabels: Record<string, string> = {
        police: 'Policial',
        medical: 'Médica',
        fire: 'Incêndio',
        rescue: 'Resgate',
        other: 'Outro',
      };

      // Group by priority
      const priorityGroups = occurrences.reduce((acc, o) => {
        acc[o.priority] = (acc[o.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityLabels: Record<string, string> = {
        critical: 'Crítica',
        high: 'Alta',
        medium: 'Média',
        low: 'Baixa',
      };

      // Weekly trend (last 7 days)
      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const today = new Date();
      const weeklyTrend = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const count = occurrences.filter(o => {
          const created = new Date(o.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length;
        
        weeklyTrend.push({
          day: weekDays[dayStart.getDay()],
          occurrences: count,
        });
      }

      // Calculate average response time (time from created to closed)
      const completedOccs = occurrences.filter(o => o.status === 'completed' && o.closed_at);
      let avgResponseTime = 0;
      if (completedOccs.length > 0) {
        const totalTime = completedOccs.reduce((sum, o) => {
          const created = new Date(o.created_at).getTime();
          const closed = new Date(o.closed_at!).getTime();
          return sum + (closed - created);
        }, 0);
        avgResponseTime = Math.round(totalTime / completedOccs.length / 60000); // in minutes
      }

      // Completion rate
      const completionRate = occurrences.length > 0 
        ? Math.round((completedOccs.length / occurrences.length) * 100) 
        : 0;

      // Response time and completion rate by organization
      const orgLabels: Record<string, string> = {
        police: 'Polícia',
        samu: 'SAMU',
        fire: 'Bombeiros',
      };

      const responseTimeByOrg = organizations.map(org => {
        const orgOccs = completedOccs.filter(o => o.organization_id === org.id);
        let time = 0;
        if (orgOccs.length > 0) {
          const totalTime = orgOccs.reduce((sum, o) => {
            const created = new Date(o.created_at).getTime();
            const closed = new Date(o.closed_at!).getTime();
            return sum + (closed - created);
          }, 0);
          time = Math.round(totalTime / orgOccs.length / 60000);
        }
        return {
          name: orgLabels[org.type] || org.name,
          time,
        };
      }).filter(item => item.time > 0);

      const completionByOrg = organizations.map(org => {
        const orgOccs = occurrences.filter(o => o.organization_id === org.id);
        const orgCompleted = orgOccs.filter(o => o.status === 'completed');
        const rate = orgOccs.length > 0 ? Math.round((orgCompleted.length / orgOccs.length) * 100) : 0;
        return {
          name: orgLabels[org.type] || org.name,
          rate,
        };
      }).filter(item => item.rate > 0);

      setStats({
        totalUsers: usersRes.count || 0,
        totalOrganizations: orgsRes.count || 0,
        totalVehicles: vehiclesRes.count || 0,
        totalOccurrences: occurrences.length,
        activeOccurrences: activeOccurrences.length,
        criticalOccurrences: criticalOccurrences.length,
        occurrencesByType: Object.entries(typeGroups).map(([key, value]) => ({
          name: typeLabels[key] || key,
          value,
        })),
        occurrencesByPriority: Object.entries(priorityGroups).map(([key, value]) => ({
          name: priorityLabels[key] || key,
          value,
          color: PRIORITY_COLORS[key as keyof typeof PRIORITY_COLORS] || '#888',
        })),
        weeklyTrend,
        avgResponseTime,
        completionRate,
        responseTimeByOrg,
        completionByOrg,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
          <h2 className="text-2xl font-bold text-foreground">Painel Administrativo</h2>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>
        <Button variant="outline" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-police/10 rounded-lg">
                <Building2 className="h-5 w-5 text-police" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOrganizations}</p>
                <p className="text-xs text-muted-foreground">Órgãos</p>
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
                <p className="text-2xl font-bold">{stats.totalVehicles}</p>
                <p className="text-xs text-muted-foreground">Viaturas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOccurrences}</p>
                <p className="text-xs text-muted-foreground">Total Ocorrências</p>
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
                <p className="text-2xl font-bold">{stats.activeOccurrences}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.criticalOccurrences > 0 ? 'border-emergency' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emergency/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-emergency" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.criticalOccurrences}</p>
                <p className="text-xs text-muted-foreground">Críticas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência Semanal
            </CardTitle>
            <CardDescription>Ocorrências nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="occurrences" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="Ocorrências"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Prioridade</CardTitle>
            <CardDescription>Distribuição de ocorrências por prioridade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.occurrencesByPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.occurrencesByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Tipo de Ocorrência</CardTitle>
            <CardDescription>Distribuição por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.occurrencesByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Response Time by Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tempo Médio de Resposta
            </CardTitle>
            <CardDescription>Por organização (em minutos)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-center">
              <span className="text-4xl font-bold text-primary">{stats.avgResponseTime}</span>
              <span className="text-lg text-muted-foreground ml-2">min (geral)</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.responseTimeByOrg} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => `${value} min`} />
                <Bar dataKey="time" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} name="Tempo" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Rate by Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Taxa de Conclusão
            </CardTitle>
            <CardDescription>Por organização (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-center">
              <span className="text-4xl font-bold text-success">{stats.completionRate}%</span>
              <span className="text-lg text-muted-foreground ml-2">(geral)</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.completionByOrg} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="rate" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Taxa" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href="/users">
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Usuários
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/organizations">
                <Building2 className="h-4 w-4 mr-2" />
                Gerenciar Órgãos
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/vehicles">
                <Car className="h-4 w-4 mr-2" />
                Gerenciar Viaturas
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/reports">
                <FileText className="h-4 w-4 mr-2" />
                Relatórios
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
