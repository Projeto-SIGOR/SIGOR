import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OccurrencesList } from '@/components/occurrences/OccurrencesList';
import { OccurrenceForm } from '@/components/occurrences/OccurrenceForm';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Bell, BellOff, Shield, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { profile, isDispatcher, isAdmin } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const canCreateOccurrence = isDispatcher() || isAdmin();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Painel de Ocorrências</h1>
                  <p className="text-sm text-muted-foreground">
                    {profile?.organization?.name || 'Todas as organizações'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Desativar alertas sonoros' : 'Ativar alertas sonoros'}
                className="text-foreground hover:bg-accent"
              >
                {soundEnabled ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
              
              {canCreateOccurrence && (
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nova Ocorrência</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        Registrar Nova Ocorrência
                      </DialogTitle>
                    </DialogHeader>
                    <OccurrenceForm onSuccess={() => setIsFormOpen(false)} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </header>
          
          {/* Content */}
          <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto bg-muted/30">
            <DashboardStats />
            <OccurrencesList />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
