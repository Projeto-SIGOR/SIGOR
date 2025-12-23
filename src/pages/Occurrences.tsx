import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOccurrences } from "@/hooks/useOccurrences";
import { useAlertSoundWithPrefs } from "@/hooks/useAlertSoundWithPrefs";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { OrganizationBadge } from "@/components/ui/organization-badge";
import { OccurrenceForm } from "@/components/occurrences/OccurrenceForm";
import { OccurrenceFilters, OccurrenceFiltersState } from "@/components/occurrences/OccurrenceFilters";
import { Plus, MapPin, Phone, Clock, AlertTriangle, ArrowLeft } from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Occurrence, Organization } from "@/types/sigor";

const Occurrences = () => {
  const navigate = useNavigate();
  const { isAdmin, isDispatcher } = useAuth();
  const { occurrences, loading } = useOccurrences();
  const { playAlertSound } = useAlertSoundWithPrefs();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const previousOccurrencesRef = useRef<string[]>([]);
  
  const [filters, setFilters] = useState<OccurrenceFiltersState>({
    search: '',
    status: 'all',
    priority: 'all',
    type: 'all',
    organizationId: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  // Fetch organizations for filter
  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase.from('organizations').select('id, name').order('name');
      if (data) setOrganizations(data as Organization[]);
    };
    fetchOrgs();
  }, []);

  // Alert sound for new occurrences
  useEffect(() => {
    const currentIds = occurrences.map(o => o.id);
    const previousIds = previousOccurrencesRef.current;

    // Check for new occurrences
    const newOccurrences = occurrences.filter(o => !previousIds.includes(o.id));

    if (newOccurrences.length > 0 && previousIds.length > 0) {
      // Play sound based on highest priority new occurrence
      const highestPriority = newOccurrences.reduce((highest, occ) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[occ.priority] > priorityOrder[highest] ? occ.priority : highest;
      }, 'low' as 'low' | 'medium' | 'high' | 'critical');

      playAlertSound(highestPriority);
    }

    previousOccurrencesRef.current = currentIds;
  }, [occurrences, playAlertSound]);

  // Apply filters
  const filteredOccurrences = occurrences.filter((occ) => {
    // Search filter
    const matchesSearch =
      filters.search === '' ||
      occ.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      occ.code.toLowerCase().includes(filters.search.toLowerCase()) ||
      occ.location_address?.toLowerCase().includes(filters.search.toLowerCase());

    // Status filter
    const matchesStatus = filters.status === 'all' || occ.status === filters.status;

    // Priority filter
    const matchesPriority = filters.priority === 'all' || occ.priority === filters.priority;

    // Type filter
    const matchesType = filters.type === 'all' || occ.type === filters.type;

    // Organization filter
    const matchesOrg = filters.organizationId === 'all' || occ.organization_id === filters.organizationId;

    // Date filters
    const occDate = new Date(occ.created_at);
    const matchesDateFrom = !filters.dateFrom || isAfter(occDate, startOfDay(filters.dateFrom));
    const matchesDateTo = !filters.dateTo || isBefore(occDate, endOfDay(filters.dateTo));

    return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesOrg && matchesDateFrom && matchesDateTo;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          {/* Header */}
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
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h1 className="text-lg font-bold text-foreground">Ocorrências</h1>
              </div>
            </div>
            {(isAdmin() || isDispatcher()) && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-success hover:bg-success/90 text-success-foreground gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nova Ocorrência</span>
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
          </header>

          {/* Content */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto bg-muted/30">
            {/* Filters */}
            <div className="mb-6">
              <OccurrenceFilters
                filters={filters}
                onFiltersChange={setFilters}
                organizations={organizations}
              />
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {filteredOccurrences.length} ocorrência{filteredOccurrences.length !== 1 ? 's' : ''} encontrada{filteredOccurrences.length !== 1 ? 's' : ''}
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
                    className={`cursor-pointer hover:border-primary/50 transition-colors ${
                      occurrence.priority === 'critical' ? 'border-emergency/50 animate-pulse' : ''
                    }`}
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Occurrences;
