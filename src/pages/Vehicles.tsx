import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, MapPin, ArrowLeft } from "lucide-react";
import { Vehicle, Base, VehicleStatus, vehicleStatusLabels } from "@/types/sigor";

const statusColors: Record<VehicleStatus, string> = {
  available: "bg-success text-success-foreground",
  busy: "bg-emergency text-emergency-foreground",
  maintenance: "bg-warning text-warning-foreground",
  off_duty: "bg-muted text-muted-foreground",
};

const Vehicles = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    identifier: "",
    type: "",
    base_id: "",
    capacity: 4,
  });

  useEffect(() => {
    fetchData();
    
    // Realtime subscription
    const channel = supabase
      .channel("vehicles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => fetchVehicles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchVehicles(), fetchBases()]);
    setLoading(false);
  };

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from("vehicles")
      .select("*, base:bases(*, organization:organizations(*))")
      .order("identifier");
    if (data) setVehicles(data as Vehicle[]);
  };

  const fetchBases = async () => {
    const { data } = await supabase.from("bases").select("*").eq("is_active", true);
    if (data) setBases(data as Base[]);
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from("vehicles").insert(formData);
      if (error) throw error;
      toast({ title: "Viatura cadastrada com sucesso!" });
      setIsDialogOpen(false);
      setFormData({ identifier: "", type: "", base_id: "", capacity: 4 });
    } catch (error) {
      toast({ title: "Erro ao cadastrar viatura", variant: "destructive" });
    }
  };

  const handleStatusChange = async (vehicleId: string, status: VehicleStatus) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ status })
        .eq("id", vehicleId);
      if (error) throw error;
      toast({ title: "Status atualizado!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  // Group vehicles by base
  const vehiclesByBase = vehicles.reduce((acc, vehicle) => {
    const baseId = vehicle.base_id;
    if (!acc[baseId]) acc[baseId] = [];
    acc[baseId].push(vehicle);
    return acc;
  }, {} as Record<string, Vehicle[]>);

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
                <h1 className="text-lg font-bold text-foreground">Viaturas</h1>
              </div>
            </div>
            {isAdmin() && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                <Button className="bg-success hover:bg-success/90 text-success-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Viatura
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Viatura</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Identificador</Label>
                      <Input
                        placeholder="Ex: VTR-001"
                        value={formData.identifier}
                        onChange={(e) =>
                          setFormData({ ...formData, identifier: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Input
                        placeholder="Ex: Viatura, Ambulância, Caminhão"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Base</Label>
                      <Select
                        value={formData.base_id}
                        onValueChange={(value) => setFormData({ ...formData, base_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a base" />
                        </SelectTrigger>
                        <SelectContent>
                          {bases.map((base) => (
                            <SelectItem key={base.id} value={base.id}>
                              {base.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Capacidade</Label>
                      <Input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) =>
                          setFormData({ ...formData, capacity: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <Button className="w-full" onClick={handleCreate}>
                      Cadastrar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </header>

          <div className="flex-1 p-4 lg:p-6 overflow-auto bg-muted/30">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vehicles.filter((v) => v.status === "available").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Disponíveis</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emergency/10 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-emergency" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vehicles.filter((v) => v.status === "busy").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Em Atendimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vehicles.filter((v) => v.status === "maintenance").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Manutenção</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vehicles.filter((v) => v.status === "off_duty").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Fora de Serviço</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vehicles by Base */}
          {loading ? (
            <div className="grid gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 h-48" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(vehiclesByBase).map(([baseId, baseVehicles]) => {
                const base = baseVehicles[0]?.base;
                return (
                  <Card key={baseId}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {base?.name || "Base Desconhecida"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {baseVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-muted-foreground" />
                                <span className="font-semibold">{vehicle.identifier}</span>
                              </div>
                              <Badge className={statusColors[vehicle.status]}>
                                {vehicleStatusLabels[vehicle.status]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {vehicle.type} • {vehicle.capacity} lugares
                            </p>
                            {isAdmin() && (
                              <Select
                                value={vehicle.status}
                                onValueChange={(value) =>
                                  handleStatusChange(vehicle.id, value as VehicleStatus)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(vehicleStatusLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Vehicles;
