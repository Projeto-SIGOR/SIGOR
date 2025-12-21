import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon, Shield, Search, Plus, X } from "lucide-react";
import { Profile, UserRole, Organization, AppRole, roleLabels } from "@/types/sigor";

const Users = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<(Profile & { roles: UserRole[]; organization?: Organization })[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, orgsRes] = await Promise.all([
      supabase.from("profiles").select("*, organization:organizations(*)"),
      supabase.from("organizations").select("*"),
    ]);

    if (profilesRes.data) {
      // Fetch roles for each profile
      const profilesWithRoles = await Promise.all(
        profilesRes.data.map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", profile.id);
          return { ...profile, roles: roles || [] } as Profile & { roles: UserRole[]; organization?: Organization };
        })
      );
      setProfiles(profilesWithRoles);
    }

    if (orgsRes.data) setOrganizations(orgsRes.data as Organization[]);
    setLoading(false);
  };

  const handleAddRole = async (userId: string) => {
    if (!newRole) return;
    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
      });
      if (error) throw error;
      toast({ title: "Função adicionada com sucesso!" });
      fetchData();
      setNewRole("");
    } catch (error) {
      toast({ title: "Erro ao adicionar função", variant: "destructive" });
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
      toast({ title: "Função removida!" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro ao remover função", variant: "destructive" });
    }
  };

  const handleUpdateOrganization = async (userId: string, organizationId: string | null) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ organization_id: organizationId })
        .eq("id", userId);
      if (error) throw error;
      toast({ title: "Organização atualizada!" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro ao atualizar organização", variant: "destructive" });
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.badge_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
              <p className="text-muted-foreground">Gestão de usuários e permissões</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profiles.length}</p>
                    <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {profiles.filter((p) => p.is_active).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emergency/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-emergency" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {profiles.filter((p) => p.roles.some((r) => r.role === "admin")).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Administradores</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProfiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">{profile.full_name}</h3>
                          {profile.badge_number && (
                            <span className="text-sm text-muted-foreground">
                              #{profile.badge_number}
                            </span>
                          )}
                          <Badge variant={profile.is_active ? "default" : "secondary"}>
                            {profile.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>

                        {/* Roles */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {profile.roles.map((role) => (
                            <Badge
                              key={role.id}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {roleLabels[role.role]}
                              <button
                                onClick={() => handleRemoveRole(role.id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Adicionar Função</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <Select
                                  value={newRole}
                                  onValueChange={(value) => setNewRole(value as AppRole)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma função" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(roleLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  className="w-full"
                                  onClick={() => handleAddRole(profile.id)}
                                  disabled={!newRole}
                                >
                                  Adicionar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {/* Organization */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Organização:</span>
                          <Select
                            value={profile.organization_id || "none"}
                            onValueChange={(value) =>
                              handleUpdateOrganization(profile.id, value === "none" ? null : value)
                            }
                          >
                            <SelectTrigger className="h-8 w-48">
                              <SelectValue placeholder="Sem organização" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem organização</SelectItem>
                              {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
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

export default Users;
