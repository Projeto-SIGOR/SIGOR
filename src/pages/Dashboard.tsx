import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OccurrencesList } from '@/components/occurrences/OccurrencesList';
import { OccurrenceForm } from '@/components/occurrences/OccurrenceForm';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Bell, BellOff } from 'lucide-react';

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
          <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-lg font-semibold">Painel de Ocorrências</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.organization?.name || 'Todas as organizações'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Desativar alertas sonoros' : 'Ativar alertas sonoros'}
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
                    <Button className="gap-2">
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
            </div>
          </header>
          
          {/* Content */}
          <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">
            <DashboardStats />
            <OccurrencesList />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
