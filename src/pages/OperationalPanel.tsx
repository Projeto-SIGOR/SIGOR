import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDispatches } from "@/hooks/useDispatches";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, Clock, Volume2, VolumeX, Navigation, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dispatch, Occurrence, OccurrenceStatus } from "@/types/sigor";

const OperationalPanel = () => {
  const { profile, isOperational, isAdmin } = useAuth();
  const { toast } = useToast();
  const [dispatches, setDispatches] = useState<(Dispatch & { occurrence: Occurrence })[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousDispatchCount = useRef(0);

  useEffect(() => {
    fetchMyDispatches();

    // Realtime subscription
    const channel = supabase
      .channel("my-dispatches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dispatches" },
        (payload) => {
          fetchMyDispatches();
          if (payload.eventType === "INSERT" && soundEnabled) {
            playAlertSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const fetchMyDispatches = async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("dispatches")
      .select(`
        *,
        occurrence:occurrences(*, organization:organizations(*)),
        vehicle:vehicles(*)
      `)
      .in("status", ["dispatched", "en_route", "on_scene", "transporting"])
      .order("dispatched_at", { ascending: false });

    if (data) {
      // Filter by user's organization
      const myDispatches = data.filter(
        (d) => d.occurrence?.organization_id === profile.organization_id
      ) as (Dispatch & { occurrence: Occurrence })[];

      // Check for new dispatches
      if (myDispatches.length > previousDispatchCount.current && soundEnabled) {
        playAlertSound();
      }
      previousDispatchCount.current = myDispatches.length;

      setDispatches(myDispatches);
    }
    setLoading(false);
  };

  const playAlertSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAdQ6LU35p0DBAU8OCHb1QR");
      }
      audioRef.current.play().catch(() => {
        console.log("Audio autoplay blocked");
      });
    } catch (e) {
      console.log("Audio error:", e);
    }
  };

  const handleStatusUpdate = async (dispatchId: string, occurrenceId: string, newStatus: OccurrenceStatus) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Update dispatch status
      const updateData: Record<string, string> = { status: newStatus };
      if (newStatus === "en_route") updateData.acknowledged_at = new Date().toISOString();
      if (newStatus === "on_scene") updateData.arrived_at = new Date().toISOString();
      if (newStatus === "completed") updateData.completed_at = new Date().toISOString();

      await supabase.from("dispatches").update(updateData).eq("id", dispatchId);

      // Update occurrence status
      await supabase.from("occurrences").update({ status: newStatus }).eq("id", occurrenceId);

      // Add to history
      await supabase.from("occurrence_history").insert({
        occurrence_id: occurrenceId,
        dispatch_id: dispatchId,
        new_status: newStatus,
        changed_by: user.user.id,
      });

      // Free vehicle if completed
      if (newStatus === "completed") {
        const dispatch = dispatches.find((d) => d.id === dispatchId);
        if (dispatch?.vehicle_id) {
          await supabase
            .from("vehicles")
            .update({ status: "available" })
            .eq("id", dispatch.vehicle_id);
        }
      }

      toast({ title: "Status atualizado!" });
      fetchMyDispatches();
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const getNextAction = (status: OccurrenceStatus) => {
    switch (status) {
      case "dispatched":
        return { label: "Em Deslocamento", next: "en_route" as OccurrenceStatus, icon: Navigation };
      case "en_route":
        return { label: "Cheguei no Local", next: "on_scene" as OccurrenceStatus, icon: MapPin };
      case "on_scene":
        return { label: "Finalizar", next: "completed" as OccurrenceStatus, icon: CheckCircle };
      case "transporting":
        return { label: "Finalizar", next: "completed" as OccurrenceStatus, icon: CheckCircle };
      default:
        return null;
    }
  };

  if (!isOperational() && !isAdmin()) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Acesso restrito às equipes operacionais</p>
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
              <h1 className="text-2xl font-bold text-foreground">Painel Operacional</h1>
              <p className="text-muted-foreground">Suas ocorrências em andamento</p>
            </div>
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="sound" className="text-sm">Som</Label>
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </div>

          {/* Active Dispatches */}
          {loading ? (
            <div className="grid gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 h-40" />
                </Card>
              ))}
            </div>
          ) : dispatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma ocorrência ativa</h3>
                <p className="text-muted-foreground">
                  Você receberá uma notificação quando for designado para uma ocorrência.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {dispatches.map((dispatch) => {
                const action = getNextAction(dispatch.status);
                const occ = dispatch.occurrence;

                return (
                  <Card
                    key={dispatch.id}
                    className={`border-l-4 ${
                      occ.priority === "critical"
                        ? "border-l-priority-critical"
                        : occ.priority === "high"
                        ? "border-l-priority-high"
                        : "border-l-primary"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground">
                            {occ.code}
                          </span>
                          <PriorityBadge priority={occ.priority} pulse={occ.priority === "critical"} />
                          <StatusBadge status={dispatch.status} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(dispatch.dispatched_at), "HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold text-lg mb-2">{occ.title}</h3>

                      {occ.description && (
                        <p className="text-muted-foreground mb-3">{occ.description}</p>
                      )}

                      <div className="flex items-start gap-2 mb-4 p-3 bg-muted rounded-lg">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{occ.location_address || "Endereço não informado"}</p>
                          {occ.location_reference && (
                            <p className="text-sm text-muted-foreground">
                              Ref: {occ.location_reference}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Vehicle info */}
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <Truck className="h-4 w-4" />
                        <span>
                          {dispatch.vehicle?.identifier} - {dispatch.vehicle?.type}
                        </span>
                      </div>

                      {/* Action Button */}
                      {action && (
                        <Button
                          className="w-full h-14 text-lg font-semibold"
                          variant={dispatch.status === "on_scene" ? "default" : "secondary"}
                          onClick={() =>
                            handleStatusUpdate(dispatch.id, occ.id, action.next)
                          }
                        >
                          <action.icon className="h-6 w-6 mr-2" />
                          {action.label}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default OperationalPanel;
