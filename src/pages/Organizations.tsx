import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OrganizationBadge } from "@/components/ui/organization-badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, MapPin } from "lucide-react";
import { Organization, Base, OrganizationType, organizationLabels } from "@/types/sigor";

const Organizations = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<(Organization & { bases: Base[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isBaseDialogOpen, setIsBaseDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  // Form states
  const [orgForm, setOrgForm] = useState({
    name: "",
    code: "",
    type: "" as OrganizationType | "",
    phone: "",
  });

  const [baseForm, setBaseForm] = useState({
    name: "",
    address: "",
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("*")
      .order("name");

    if (orgs) {
      const orgsWithBases = await Promise.all(
        orgs.map(async (org) => {
          const { data: bases } = await supabase
            .from("bases")
            .select("*")
            .eq("organization_id", org.id)
            .order("name");
          return { ...org, bases: bases || [] } as Organization & { bases: Base[] };
        })
      );
      setOrganizations(orgsWithBases);
    }
    setLoading(false);
  };

  const handleCreateOrg = async () => {
    if (!orgForm.name || !orgForm.code || !orgForm.type) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("organizations").insert({
        name: orgForm.name,
        code: orgForm.code,
        type: orgForm.type,
        phone: orgForm.phone || null,
      });
      if (error) throw error;
      toast({ title: "Organização criada com sucesso!" });
      setIsOrgDialogOpen(false);
      setOrgForm({ name: "", code: "", type: "", phone: "" });
      fetchOrganizations();
    } catch (error) {
      toast({ title: "Erro ao criar organização", variant: "destructive" });
    }
  };

  const handleCreateBase = async () => {
    if (!baseForm.name || !selectedOrgId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("bases").insert({
        name: baseForm.name,
        address: baseForm.address || null,
        organization_id: selectedOrgId,
      });
      if (error) throw error;
      toast({ title: "Base criada com sucesso!" });
      setIsBaseDialogOpen(false);
      setBaseForm({ name: "", address: "" });
      fetchOrganizations();
    } catch (error) {
      toast({ title: "Erro ao criar base", variant: "destructive" });
    }
  };

  if (!isAdmin()) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Acesso restrito a administradores</p>
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
              <h1 className="text-2xl font-bold text-foreground">Organizações</h1>
              <p className="text-muted-foreground">Gestão de organizações e bases</p>
            </div>
            <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
              <DialogTrigger asChild>
              <Button className="bg-success hover:bg-success/90 text-success-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Organização
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Organização</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      placeholder="Ex: 1º BPM"
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código *</Label>
                    <Input
                      placeholder="Ex: 1BPM"
                      value={orgForm.code}
                      onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select
                      value={orgForm.type}
                      onValueChange={(value) =>
                        setOrgForm({ ...orgForm, type: value as OrganizationType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(organizationLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(00) 0000-0000"
                      value={orgForm.phone}
                      onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreateOrg}>
                    Criar Organização
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {organizations.filter((o) => o.type === "police").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Polícia</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {organizations.filter((o) => o.type === "samu").length}
                    </p>
                    <p className="text-sm text-muted-foreground">SAMU</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {organizations.filter((o) => o.type === "fire").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Bombeiros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organizations List */}
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
              {organizations.map((org) => (
                <Card key={org.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle>{org.name}</CardTitle>
                        <OrganizationBadge type={org.type} />
                      </div>
                      <Dialog open={isBaseDialogOpen && selectedOrgId === org.id} onOpenChange={(open) => {
                        setIsBaseDialogOpen(open);
                        if (open) setSelectedOrgId(org.id);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Nova Base
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Criar Base - {org.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Nome *</Label>
                              <Input
                                placeholder="Ex: Central"
                                value={baseForm.name}
                                onChange={(e) =>
                                  setBaseForm({ ...baseForm, name: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Endereço</Label>
                              <Input
                                placeholder="Endereço da base"
                                value={baseForm.address}
                                onChange={(e) =>
                                  setBaseForm({ ...baseForm, address: e.target.value })
                                }
                              />
                            </div>
                            <Button className="w-full" onClick={handleCreateBase}>
                              Criar Base
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Código: {org.code} {org.phone && `• Tel: ${org.phone}`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {org.bases.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhuma base cadastrada
                      </p>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {org.bases.map((base) => (
                          <div
                            key={base.id}
                            className="p-4 border rounded-lg bg-card flex items-start gap-3"
                          >
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">{base.name}</p>
                              {base.address && (
                                <p className="text-sm text-muted-foreground">{base.address}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Organizations;
