import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, BadgeCheck, Bell, Volume2, Mail, Save, Shield } from 'lucide-react';
import { roleLabels } from '@/types/sigor';

const Profile = () => {
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    badge_number: '',
  });

  // Notification preferences (stored in localStorage for now)
  const [notifications, setNotifications] = useState({
    soundEnabled: true,
    criticalAlerts: true,
    highPriorityAlerts: true,
    emailNotifications: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        badge_number: profile.badge_number || '',
      });
    }

    // Load notification preferences from localStorage
    const savedNotifications = localStorage.getItem('sigor_notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          badge_number: formData.badge_number || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar perfil',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    localStorage.setItem('sigor_notifications', JSON.stringify(newNotifications));
    toast({ title: 'Preferências atualizadas!' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center px-4 lg:px-6 shadow-sm">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Meu Perfil</h1>
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-6 overflow-auto bg-muted/30">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Profile Header */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src="" alt={profile?.full_name} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {getInitials(profile?.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground">
                        {profile?.full_name || 'Usuário'}
                      </h2>
                      <p className="text-muted-foreground">{user?.email}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {roles.map((role, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                          >
                            {roleLabels[role]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5" />
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription>
                    Atualize suas informações de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="badge_number">Matrícula</Label>
                      <Input
                        id="badge_number"
                        value={formData.badge_number}
                        onChange={(e) =>
                          setFormData({ ...formData, badge_number: e.target.value })
                        }
                        placeholder="Número da matrícula"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Organização</Label>
                    <Input
                      value={profile?.organization?.name || 'Não vinculado'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <Button onClick={handleSaveProfile} disabled={loading} className="gap-2">
                    <Save className="h-4 w-4" />
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </CardContent>
              </Card>

              {/* Notification Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Preferências de Notificação
                  </CardTitle>
                  <CardDescription>
                    Configure como você deseja receber alertas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Sons de Alerta</p>
                        <p className="text-sm text-muted-foreground">
                          Reproduzir sons para novas ocorrências
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.soundEnabled}
                      onCheckedChange={(checked) =>
                        handleNotificationChange('soundEnabled', checked)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-emergency" />
                      <div>
                        <p className="font-medium">Alertas Críticos</p>
                        <p className="text-sm text-muted-foreground">
                          Notificações para ocorrências críticas
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.criticalAlerts}
                      onCheckedChange={(checked) =>
                        handleNotificationChange('criticalAlerts', checked)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-fire" />
                      <div>
                        <p className="font-medium">Alertas de Alta Prioridade</p>
                        <p className="text-sm text-muted-foreground">
                          Notificações para ocorrências de alta prioridade
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.highPriorityAlerts}
                      onCheckedChange={(checked) =>
                        handleNotificationChange('highPriorityAlerts', checked)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Notificações por E-mail</p>
                        <p className="text-sm text-muted-foreground">
                          Receber resumo diário por e-mail
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        handleNotificationChange('emailNotifications', checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>ID do Usuário:</strong> {user?.id}
                  </p>
                  <p>
                    <strong>Criado em:</strong>{' '}
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className="text-success">Ativo</span>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Profile;
