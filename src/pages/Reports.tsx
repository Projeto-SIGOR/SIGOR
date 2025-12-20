import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { occurrenceTypeLabels, organizationLabels } from "@/types/sigor";

const COLORS = ["#1e3a5f", "#dc2626", "#f59e0b", "#16a34a", "#6366f1"];

const Reports = () => {
  const { isAdmin, isDispatcher } = useAuth();
  const [period, setPeriod] = useState("30");
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    avgResponseTime: 0,
    byType: [] as { name: string; value: number }[],
    byOrg: [] as { name: string; value: number }[],
    daily: [] as { date: string; total: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const { data: occurrences } = await supabase
      .from("occurrences")
      .select("*, organization:organizations(*)")
      .gte("created_at", startDate.toISOString());

    if (occurrences) {
      // Calculate stats
      const total = occurrences.length;
      const completed = occurrences.filter((o) => o.status === "completed").length;

      // By type
      const typeCount = occurrences.reduce((acc, o) => {
        acc[o.type] = (acc[o.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byType = Object.entries(typeCount).map(([type, count]) => ({
        name: OCCURRENCE_TYPE_LABELS[type as keyof typeof OCCURRENCE_TYPE_LABELS] || type,
        value: count,
      }));

      // By organization
      const orgCount = occurrences.reduce((acc, o) => {
        const orgType = o.organization?.type || "unknown";
        acc[orgType] = (acc[orgType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byOrg = Object.entries(orgCount).map(([type, count]) => ({
        name: ORGANIZATION_LABELS[type as keyof typeof ORGANIZATION_LABELS] || type,
        value: count,
      }));

      // Daily
      const dailyCount = occurrences.reduce((acc, o) => {
        const date = new Date(o.created_at).toLocaleDateString("pt-BR");
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const daily = Object.entries(dailyCount)
        .map(([date, total]) => ({ date, total }))
        .slice(-7);

      // Avg response time (simplified)
      const completedOccs = occurrences.filter(
        (o) => o.status === "completed" && o.closed_at
      );
      let avgResponseTime = 0;
      if (completedOccs.length > 0) {
        const totalTime = completedOccs.reduce((sum, o) => {
          const created = new Date(o.created_at).getTime();
          const closed = new Date(o.closed_at!).getTime();
          return sum + (closed - created);
        }, 0);
        avgResponseTime = Math.round(totalTime / completedOccs.length / 60000); // in minutes
      }

      setStats({ total, completed, avgResponseTime, byType, byOrg, daily });
    }
    setLoading(false);
  };

  if (!isAdmin() && !isDispatcher()) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Acesso restrito</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
              <p className="text-muted-foreground">Estatísticas e métricas do sistema</p>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 h-32" />
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sigor-green/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-sigor-green" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.completed}</p>
                        <p className="text-sm text-muted-foreground">Finalizadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sigor-yellow/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-sigor-yellow" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.avgResponseTime}min</p>
                        <p className="text-sm text-muted-foreground">Tempo Médio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {stats.total > 0
                            ? Math.round((stats.completed / stats.total) * 100)
                            : 0}
                          %
                        </p>
                        <p className="text-sm text-muted-foreground">Taxa Resolução</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Por Tipo de Ocorrência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.byType}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                          >
                            {stats.byType.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Por Organização</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.byOrg}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#1e3a5f" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Ocorrências por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#16a34a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Reports;
