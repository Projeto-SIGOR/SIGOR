import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [user]);

  const checkExistingSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers não são suportados neste navegador');
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  };

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      throw new Error('Notificações não são suportadas neste navegador');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const saveSubscriptionToDatabase = async (subscription: PushSubscription) => {
    if (!user) throw new Error('Usuário não autenticado');

    const subscriptionJSON = subscription.toJSON();
    
    // Save to user preferences or a dedicated table
    const { error } = await supabase
      .from('user_preferences')
      .update({
        push_notifications: true,
      })
      .eq('user_id', user.id);

    if (error) throw error;

    // Call edge function to store subscription details
    await supabase.functions.invoke('push-notification', {
      body: {
        action: 'subscribe',
        subscription: {
          endpoint: subscriptionJSON.endpoint,
          keys: subscriptionJSON.keys
        },
        user_id: user.id
      }
    });
  };

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permissionResult = await requestPermission();
      
      if (permissionResult !== 'granted') {
        throw new Error('Permissão de notificação negada');
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push manager
      // Note: In production, you would need to set up VAPID keys
      const vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });

      // Save subscription to database
      await saveSubscriptionToDatabase(subscription);
      
      setIsSubscribed(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao ativar notificações';
      setError(message);
      console.error('Push subscription error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Update database
      if (user) {
        await supabase
          .from('user_preferences')
          .update({ push_notifications: false })
          .eq('user_id', user.id);
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar notificações';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send test notification
  const sendTestNotification = async () => {
    if (!isSubscribed) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('SIGOR - Teste', {
        body: 'Notificação push está funcionando!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: false
      });
    } catch (err) {
      console.error('Error sending test notification:', err);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
}
