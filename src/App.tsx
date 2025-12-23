import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Occurrences from "./pages/Occurrences";
import OccurrenceDetail from "./pages/OccurrenceDetail";
import Vehicles from "./pages/Vehicles";
import Users from "./pages/Users";
import Organizations from "./pages/Organizations";
import Reports from "./pages/Reports";
import OperationalPanel from "./pages/OperationalPanel";
import Profile from "./pages/Profile";
import Map from "./pages/Map";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/ocorrencias" element={<PrivateRoute><Occurrences /></PrivateRoute>} />
      <Route path="/occurrences" element={<PrivateRoute><Occurrences /></PrivateRoute>} />
      <Route path="/ocorrencias/nova" element={<PrivateRoute><Occurrences /></PrivateRoute>} />
      <Route path="/ocorrencias/:id" element={<PrivateRoute><OccurrenceDetail /></PrivateRoute>} />
      <Route path="/occurrences/:id" element={<PrivateRoute><OccurrenceDetail /></PrivateRoute>} />
      <Route path="/veiculos" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
      <Route path="/vehicles" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
      <Route path="/usuarios" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/organizacoes" element={<PrivateRoute><Organizations /></PrivateRoute>} />
      <Route path="/organizations" element={<PrivateRoute><Organizations /></PrivateRoute>} />
      <Route path="/relatorios" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/operacional" element={<PrivateRoute><OperationalPanel /></PrivateRoute>} />
      <Route path="/operational" element={<PrivateRoute><OperationalPanel /></PrivateRoute>} />
      <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/mapa" element={<PrivateRoute><Map /></PrivateRoute>} />
      <Route path="/map" element={<PrivateRoute><Map /></PrivateRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
