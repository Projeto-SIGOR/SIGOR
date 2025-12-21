import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOccurrences } from "@/hooks/useOccurrences";
import { useDispatches } from "@/hooks/useDispatches";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { OrganizationBadge } from "@/components/ui/organization-badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Clock,
  Truck,
  FileText,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Vehicle, OccurrenceHistory, OccurrenceStatus } from "@/types/sigor";

const OccurrenceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isDispatcher } = useAuth();
  const { occurrences, updateOccurrenceStatus } = useOccurrences();
  const { dispatches, createDispatch } = useDispatches(id);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [history, setHistory] = useState<OccurrenceHistory[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const occurrence = occurrences.find((o) => o.id === id);

  useEffect(() => {
    if (occurrence?.organization_id) {
      fetchVehicles();
    }
    if (id) {
      fetchHistory();
    }
  }, [occurrence?.organization_id, id]);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from("vehicles")
      .select("*, base:bases(*)")
      .eq("status", "available");
    if (data) setVehicles(data as Vehicle[]);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("occurrence_history")
      .select("*")
      .eq("occurrence_id", id)
      .order("created_at", { ascending: false });
    if (data) setHistory(data as OccurrenceHistory[]);
  };

  const handleDispatch = async () => {
    if (!selectedVehicle || !id) return;
    setLoading(true);
    try {
      await createDispatch({ occurrence_id: id, vehicle_id: selectedVehicle });
      toast({ title: "Viatura despachada com sucesso!" });
      setSelectedVehicle("");
      fetchVehicles();
    } catch (error) {
      toast({ title: "Erro ao despachar viatura", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: OccurrenceStatus) => {
    if (!id) return;
    try {
      await updateOccurrenceStatus(id, status);
      toast({ title: "Status atualizado!" });
      fetchHistory();
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  if (!occurrence) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Ocorrência não encontrada</p>
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
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-muted-foreground">{occurrence.code}</span>
                <PriorityBadge priority={occurrence.priority} />
                <StatusBadge status={occurrence.status} />
                {occurrence.organization && (
                  <OrganizationBadge type={occurrence.organization.type} />
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mt-1">{occurrence.title}</h1>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Descrição
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">
                    {occurrence.description || "Sem descrição"}
                  </p>
                </CardContent>
              </Card>

              {/* Location & Caller */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Endereço</p>
                      <p className="text-muted-foreground">
                        {occurrence.location_address || "Não informado"}
                      </p>
                      {occurrence.location_reference && (
                        <p className="text-sm text-muted-foreground">
                          Referência: {occurrence.location_reference}
                        </p>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Solicitante</p>
                      <p className="text-muted-foreground">
                        {occurrence.caller_name || "Não identificado"}
                      </p>
                    </div>
                  </div>
                  {occurrence.caller_phone && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Telefone</p>
                          <p className="text-muted-foreground">{occurrence.caller_phone}</p>
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Registrada em</p>
                      <p className="text-muted-foreground">
                        {format(new Date(occurrence.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dispatches */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Viaturas Despachadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dispatches.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhuma viatura despachada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dispatches.map((dispatch) => (
                        <div
                          key={dispatch.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {dispatch.vehicle?.identifier || "Viatura"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {dispatch.vehicle?.type}
                            </p>
                          </div>
                          <StatusBadge status={dispatch.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              {(isAdmin() || isDispatcher()) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Dispatch Vehicle */}
                    {occurrence.status !== "completed" && occurrence.status !== "cancelled" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Despachar Viatura</label>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma viatura" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.identifier} - {v.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          className="w-full"
                          onClick={handleDispatch}
                          disabled={!selectedVehicle || loading}
                        >
                          Despachar
                        </Button>
                      </div>
                    )}

                    <Separator />

                    {/* Status Change */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alterar Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        {occurrence.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-success/10 border-success text-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleStatusChange("completed")}
                          >
                            Finalizar
                          </Button>
                        )}
                        {occurrence.status !== "cancelled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-destructive/10 border-destructive text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleStatusChange("cancelled")}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Sem histórico
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((h) => (
                        <div key={h.id} className="border-l-2 border-muted pl-3 py-1">
                          <div className="flex items-center gap-2">
                            {h.previous_status && (
                              <>
                                <StatusBadge status={h.previous_status} />
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <StatusBadge status={h.new_status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(h.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                          {h.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{h.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default OccurrenceDetail;
