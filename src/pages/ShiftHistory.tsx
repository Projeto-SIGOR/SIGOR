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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Calendar, Clock, Truck, User } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ShiftRecord {
  id: string;
  vehicle_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  vehicle?: {
    id: string;
    identifier: string;
    type: string;
    base?: {
      id: string;
      name: string;
    };
  };
  profile?: {
    id: string;
    full_name: string;
  };
}

interface VehicleSummary {
  vehicleId: string;
  identifier: string;
  type: string;
  baseName: string;
  totalMinutes: number;
  shifts: number;
}

interface OperatorSummary {
  userId: string;
  name: string;
  totalMinutes: number;
  shifts: number;
  vehicles: string[];
}

const ShiftHistory = () => {
  const navigate = useNavigate();
  const { isAdmin, isDispatcher, profile } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [operatorId, setOperatorId] = useState("all");
  const [vehicleId, setVehicleId] = useState("all");
  const [operators, setOperators] = useState<{ id: string; full_name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; identifier: string }[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "byVehicle" | "byOperator">("list");

  useEffect(() => {
    fetchFilters();
    // Set default dates to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchShifts();
    }
  }, [startDate, endDate, operatorId, vehicleId]);

  const fetchFilters = async () => {
    const [operatorsRes, vehiclesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("vehicles").select("id, identifier").order("identifier"),
    ]);
    if (operatorsRes.data) setOperators(operatorsRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
  };

  const fetchShifts = async () => {
    setLoading(true);
    
    const startFilter = new Date(startDate);
    const endFilter = new Date(endDate);
    endFilter.setHours(23, 59, 59, 999);

    let query = supabase
      .from("vehicle_crew")
      .select(`
        *,
        vehicle:vehicles(id, identifier, type, base:bases(id, name))
      `)
      .gte("joined_at", startFilter.toISOString())
      .lte("joined_at", endFilter.toISOString())
      .order("joined_at", { ascending: false });

    if (operatorId !== "all") {
      query = query.eq("user_id", operatorId);
    }
    if (vehicleId !== "all") {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data } = await query;
    if (data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      const profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = { id: p.id, full_name: p.full_name };
        return acc;
      }, {} as Record<string, { id: string; full_name: string }>);

      const shiftsWithProfiles = data.map(d => ({
        ...d,
        profile: profilesMap[d.user_id],
      })) as ShiftRecord[];
      setShifts(shiftsWithProfiles);
    }
    setLoading(false);
  };

  const calculateDuration = (joined: string, left: string | null): number => {
    const endTime = left ? new Date(left) : new Date();
    return differenceInMinutes(endTime, new Date(joined));
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getVehicleSummary = (): VehicleSummary[] => {
    const summary: Record<string, VehicleSummary> = {};
    
    shifts.forEach((shift) => {
      if (!shift.vehicle) return;
      const key = shift.vehicle_id;
      if (!summary[key]) {
        summary[key] = {
          vehicleId: shift.vehicle_id,
          identifier: shift.vehicle.identifier,
          type: shift.vehicle.type,
          baseName: shift.vehicle.base?.name || "N/A",
          totalMinutes: 0,
          shifts: 0,
        };
      }
      summary[key].totalMinutes += calculateDuration(shift.joined_at, shift.left_at);
      summary[key].shifts += 1;
    });

    return Object.values(summary).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  const getOperatorSummary = (): OperatorSummary[] => {
    const summary: Record<string, OperatorSummary> = {};
    
    shifts.forEach((shift) => {
      if (!shift.profile) return;
      const key = shift.user_id;
      if (!summary[key]) {
        summary[key] = {
          userId: shift.user_id,
          name: shift.profile.full_name,
          totalMinutes: 0,
          shifts: 0,
          vehicles: [],
        };
      }
      summary[key].totalMinutes += calculateDuration(shift.joined_at, shift.left_at);
      summary[key].shifts += 1;
      if (shift.vehicle && !summary[key].vehicles.includes(shift.vehicle.identifier)) {
        summary[key].vehicles.push(shift.vehicle.identifier);
      }
    });

    return Object.values(summary).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text("Relatório de Turnos - SIGOR", pageWidth / 2, 20, { align: "center" });

    // Date range
    doc.setFontSize(10);
    doc.text(
      `Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}`,
      pageWidth / 2, 28, { align: "center" }
    );

    // Summary stats
    const totalMinutes = shifts.reduce((sum, s) => sum + calculateDuration(s.joined_at, s.left_at), 0);
    doc.setFontSize(12);
    doc.text("Resumo Geral", 14, 42);
    doc.setFontSize(10);
    doc.text(`Total de Turnos: ${shifts.length}`, 14, 50);
    doc.text(`Horas Trabalhadas: ${formatDuration(totalMinutes)}`, 14, 56);

    // By Vehicle
    doc.setFontSize(12);
    doc.text("Horas por Viatura", 14, 70);
    
    const vehicleSummary = getVehicleSummary();
    autoTable(doc, {
      startY: 74,
      head: [["Viatura", "Tipo", "Base", "Turnos", "Total Horas"]],
      body: vehicleSummary.map((v) => [
        v.identifier,
        v.type,
        v.baseName,
        v.shifts.toString(),
        formatDuration(v.totalMinutes),
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
    });

    // By Operator
    const operatorY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Horas por Operador", 14, operatorY);
    
    const operatorSummary = getOperatorSummary();
    autoTable(doc, {
      startY: operatorY + 4,
      head: [["Operador", "Turnos", "Viaturas", "Total Horas"]],
      body: operatorSummary.map((o) => [
        o.name,
        o.shifts.toString(),
        o.vehicles.join(", "),
        formatDuration(o.totalMinutes),
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
    });

    // Detailed list (new page)
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Lista Detalhada de Turnos", 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["Operador", "Viatura", "Entrada", "Saída", "Duração"]],
      body: shifts.map((s) => [
        s.profile?.full_name || "N/A",
        s.vehicle?.identifier || "N/A",
        format(new Date(s.joined_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        s.left_at ? format(new Date(s.left_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Em serviço",
        formatDuration(calculateDuration(s.joined_at, s.left_at)),
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

    const fileName = `relatorio-turnos-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
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

  const vehicleSummary = getVehicleSummary();
  const operatorSummary = getOperatorSummary();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground" />
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Histórico de Turnos</h1>
                <p className="text-sm text-muted-foreground">Controle de horas trabalhadas</p>
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
                      <User className="h-4 w-4" />
                      Operador
                    </Label>
                    <Select value={operatorId} onValueChange={setOperatorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os operadores</SelectItem>
                        {operators.map((op) => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Viatura
                    </Label>
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as viaturas</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.identifier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
              >
                Lista Detalhada
              </Button>
              <Button
                variant={view === "byVehicle" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("byVehicle")}
              >
                Por Viatura
              </Button>
              <Button
                variant={view === "byOperator" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("byOperator")}
              >
                Por Operador
              </Button>
            </div>

            {loading ? (
              <Card className="animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ) : (
              <>
                {view === "list" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Turnos ({shifts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {shifts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum turno encontrado no período selecionado
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Operador</TableHead>
                              <TableHead>Viatura</TableHead>
                              <TableHead>Entrada</TableHead>
                              <TableHead>Saída</TableHead>
                              <TableHead>Duração</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {shifts.map((shift) => (
                              <TableRow key={shift.id}>
                                <TableCell className="font-medium">
                                  {shift.profile?.full_name || "N/A"}
                                </TableCell>
                                <TableCell>
                                  {shift.vehicle?.identifier || "N/A"}
                                  {shift.vehicle?.type && (
                                    <span className="text-muted-foreground text-sm ml-1">
                                      ({shift.vehicle.type})
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(shift.joined_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  {shift.left_at
                                    ? format(new Date(shift.left_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {formatDuration(calculateDuration(shift.joined_at, shift.left_at))}
                                </TableCell>
                                <TableCell>
                                  {shift.is_active ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                                      Em serviço
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                      Finalizado
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}

                {view === "byVehicle" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Horas por Viatura
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {vehicleSummary.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum dado encontrado
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Viatura</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Base</TableHead>
                              <TableHead>Turnos</TableHead>
                              <TableHead>Total Horas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vehicleSummary.map((v) => (
                              <TableRow key={v.vehicleId}>
                                <TableCell className="font-medium">{v.identifier}</TableCell>
                                <TableCell>{v.type}</TableCell>
                                <TableCell>{v.baseName}</TableCell>
                                <TableCell>{v.shifts}</TableCell>
                                <TableCell className="font-semibold">
                                  {formatDuration(v.totalMinutes)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}

                {view === "byOperator" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Horas por Operador
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {operatorSummary.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum dado encontrado
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Operador</TableHead>
                              <TableHead>Turnos</TableHead>
                              <TableHead>Viaturas</TableHead>
                              <TableHead>Total Horas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {operatorSummary.map((o) => (
                              <TableRow key={o.userId}>
                                <TableCell className="font-medium">{o.name}</TableCell>
                                <TableCell>{o.shifts}</TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {o.vehicles.join(", ")}
                                  </span>
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {formatDuration(o.totalMinutes)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ShiftHistory;
