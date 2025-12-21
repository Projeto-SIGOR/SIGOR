import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOccurrences } from "@/hooks/useOccurrences";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { OrganizationBadge } from "@/components/ui/organization-badge";
import { OccurrenceForm } from "@/components/occurrences/OccurrenceForm";
import { Plus, Search, MapPin, Phone, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { statusLabels } from "@/types/sigor";

const Occurrences = () => {
  const navigate = useNavigate();
  const { isAdmin, isDispatcher } = useAuth();
  const { occurrences, loading } = useOccurrences();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOccurrences = occurrences.filter((occ) => {
    const matchesSearch =
      occ.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      occ.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      occ.location_address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || occ.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ocorrências</h1>
              <p className="text-muted-foreground">Gerenciamento de todas as ocorrências</p>
            </div>
            {(isAdmin() || isDispatcher()) && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-success hover:bg-success/90 text-success-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Ocorrência
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
                  </DialogHeader>
                  <OccurrenceForm onSuccess={() => setIsFormOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, título ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Occurrences List */}
          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24" />
                </Card>
              ))}
            </div>
          ) : filteredOccurrences.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma ocorrência encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredOccurrences.map((occurrence) => (
                <Card
                  key={occurrence.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/occurrences/${occurrence.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-muted-foreground">
                            {occurrence.code}
                          </span>
                          <PriorityBadge priority={occurrence.priority} />
                          <StatusBadge status={occurrence.status} />
                          {occurrence.organization && (
                            <OrganizationBadge type={occurrence.organization.type} />
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">
                          {occurrence.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {occurrence.location_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {occurrence.location_address}
                            </div>
                          )}
                          {occurrence.caller_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {occurrence.caller_phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(occurrence.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
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

export default Occurrences;
