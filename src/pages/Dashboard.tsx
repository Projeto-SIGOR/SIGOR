import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { PoliceDispatcherDashboard } from '@/components/dashboard/PoliceDispatcherDashboard';
import { FireDispatcherDashboard } from '@/components/dashboard/FireDispatcherDashboard';
import { SamuDispatcherDashboard } from '@/components/dashboard/SamuDispatcherDashboard';
import { TeamDashboard } from '@/components/dashboard/TeamDashboard';
import { ObserverDashboard } from '@/components/dashboard/ObserverDashboard';
import { Shield } from 'lucide-react';

export default function Dashboard() {
  const { profile, roles, isAdmin, isObserver } = useAuth();

  const renderDashboard = () => {
    if (isAdmin()) return <AdminDashboard />;
    if (roles.includes('dispatcher_police')) return <PoliceDispatcherDashboard />;
    if (roles.includes('dispatcher_fire')) return <FireDispatcherDashboard />;
    if (roles.includes('dispatcher_samu')) return <SamuDispatcherDashboard />;
    if (roles.includes('police_officer') || roles.includes('firefighter') || roles.includes('samu_team')) {
      return <TeamDashboard />;
    }
    if (isObserver()) return <ObserverDashboard />;
    return <PoliceDispatcherDashboard />;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center px-4 lg:px-6 shadow-sm">
            <SidebarTrigger className="text-foreground mr-4" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">SIGOR</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.full_name || 'Sistema de Gestão'}
                </p>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-4 lg:p-6 overflow-auto bg-muted/30">
            {renderDashboard()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
