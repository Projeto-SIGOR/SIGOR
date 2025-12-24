import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, TrendingUp, Clock, CheckCircle, Download, ArrowLeft, Calendar, Building2 } from "lucide-react";
import { occurrenceTypeLabels, organizationLabels, Organization } from "@/types/sigor";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["#1e3a5f", "#dc2626", "#f59e0b", "#16a34a", "#6366f1"];

interface Occurrence {
  id: string;
  code: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  organization: Organization | null;
}

const Reports = () => {
  const navigate = useNavigate();
  const { isAdmin, isDispatcher } = useAuth();
  const [period, setPeriod] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [organizationId, setOrganizationId] = useState("all");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
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
    fetchOrganizations();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [period, startDate, endDate, organizationId]);

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .order("name");
    if (data) setOrganizations(data as Organization[]);
  };

  const fetchStats = async () => {
    setLoading(true);
    
    let startDateFilter: Date;
    let endDateFilter: Date;

    if (startDate && endDate) {
      startDateFilter = new Date(startDate);
      endDateFilter = new Date(endDate);
      endDateFilter.setHours(23, 59, 59, 999);
    } else {
      endDateFilter = new Date();
      startDateFilter = new Date();
      startDateFilter.setDate(startDateFilter.getDate() - parseInt(period));
    }

    let query = supabase
      .from("occurrences")
      .select("*, organization:organizations(*)")
      .gte("created_at", startDateFilter.toISOString())
      .lte("created_at", endDateFilter.toISOString());

    if (organizationId !== "all") {
      query = query.eq("organization_id", organizationId);
    }

    const { data: occurrencesData } = await query;

    if (occurrencesData) {
      setOccurrences(occurrencesData as Occurrence[]);
      
      // Calculate stats
      const total = occurrencesData.length;
      const completed = occurrencesData.filter((o) => o.status === "completed").length;

      // By type
      const typeCount = occurrencesData.reduce((acc, o) => {
        acc[o.type] = (acc[o.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byType = Object.entries(typeCount).map(([type, count]) => ({
        name: occurrenceTypeLabels[type as keyof typeof occurrenceTypeLabels] || type,
        value: count as number,
      }));

      // By organization
      const orgCount = occurrencesData.reduce((acc, o) => {
        const orgType = o.organization?.type || "unknown";
        acc[orgType] = (acc[orgType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byOrg = Object.entries(orgCount).map(([type, count]) => ({
        name: organizationLabels[type as keyof typeof organizationLabels] || type,
        value: count as number,
      }));

      // Daily
      const dailyCount = occurrencesData.reduce((acc, o) => {
        const date = new Date(o.created_at).toLocaleDateString("pt-BR");
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const daily = Object.entries(dailyCount)
        .map(([date, total]) => ({ date, total }))
        .slice(-14);

      // Avg response time (simplified)
      const completedOccs = occurrencesData.filter(
        (o) => o.status === "completed" && o.closed_at
      );
      let avgResponseTime = 0;
      if (completedOccs.length > 0) {
        const totalTime = completedOccs.reduce((sum, o) => {
          const created = new Date(o.created_at).getTime();
          const closed = new Date(o.closed_at!).getTime();
          return sum + (closed - created);
        }, 0);
        avgResponseTime = Math.round(totalTime / completedOccs.length / 60000);
      }

      setStats({ total, completed, avgResponseTime, byType, byOrg, daily });
    }
    setLoading(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text("Relatório de Ocorrências - SIGOR", pageWidth / 2, 20, { align: "center" });

    // Date range
    doc.setFontSize(10);
    const dateText = startDate && endDate
      ? `Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}`
      : `Últimos ${period} dias`;
    doc.text(dateText, pageWidth / 2, 28, { align: "center" });

    // Organization filter
    if (organizationId !== "all") {
      const org = organizations.find(o => o.id === organizationId);
      doc.text(`Organização: ${org?.name || "N/A"}`, pageWidth / 2, 34, { align: "center" });
    }

    // Summary stats
    doc.setFontSize(12);
    doc.text("Resumo", 14, 45);
    doc.setFontSize(10);
    doc.text(`Total de Ocorrências: ${stats.total}`, 14, 52);
    doc.text(`Finalizadas: ${stats.completed}`, 14, 58);
    doc.text(`Taxa de Resolução: ${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`, 14, 64);
    doc.text(`Tempo Médio de Resposta: ${stats.avgResponseTime} minutos`, 14, 70);

    // By type table
    doc.setFontSize(12);
    doc.text("Por Tipo de Ocorrência", 14, 82);
    
    autoTable(doc, {
      startY: 86,
      head: [["Tipo", "Quantidade", "%"]],
      body: stats.byType.map(item => [
        item.name,
        item.value.toString(),
        `${stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0}%`
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
    });

    // By organization table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Por Organização", 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 4,
      head: [["Organização", "Quantidade", "%"]],
      body: stats.byOrg.map(item => [
        item.name,
        item.value.toString(),
        `${stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0}%`
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
    });

    // Occurrences list (new page)
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Lista de Ocorrências", 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["Código", "Título", "Tipo", "Prioridade", "Status", "Data"]],
      body: occurrences.slice(0, 50).map(o => [
        o.code,
        o.title.substring(0, 30) + (o.title.length > 30 ? "..." : ""),
        occurrenceTypeLabels[o.type as keyof typeof occurrenceTypeLabels] || o.type,
        o.priority,
        o.status,
        format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 8 },
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const fileName = `relatorio-sigor-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
    doc.save(fileName);
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
              <div>
                <h1 className="text-lg font-bold text-foreground">Relatórios</h1>
                <p className="text-sm text-muted-foreground">Estatísticas e métricas</p>
              </div>
            </div>
            <Button onClick={exportToPDF} className="bg-primary">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </header>

          <div className="flex-1 p-4 lg:p-6 overflow-auto bg-muted/30">
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Período Rápido</Label>
                    <Select value={period} onValueChange={(val) => {
                      setPeriod(val);
                      setStartDate("");
                      setEndDate("");
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Últimos 7 dias</SelectItem>
                        <SelectItem value="30">Últimos 30 dias</SelectItem>
                        <SelectItem value="90">Últimos 90 dias</SelectItem>
                        <SelectItem value="365">Último ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Organização
                    </Label>
                    <Select value={organizationId} onValueChange={setOrganizationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as organizações</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-success" />
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
                        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-warning" />
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Reports;