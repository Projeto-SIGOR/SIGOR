import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface DispatchNotification {
  id: string;
  occurrence_id: string;
  vehicle_id: string;
  status: string;
  occurrence?: {
    code: string;
    title: string;
    priority: string;
    location_address: string | null;
  };
}

export function useDispatchNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences } = useUserPreferences();
  const [currentVehicleId, setCurrentVehicleId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedDispatch = useRef<string | null>(null);

  // Fetch user's current vehicle assignment
  useEffect(() => {
    if (!user) return;

    const fetchCurrentVehicle = async () => {
      const { data, error } = await supabase
        .from('vehicle_crew')
        .select('vehicle_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setCurrentVehicleId(data.vehicle_id);
      }
    };

    fetchCurrentVehicle();

    // Subscribe to vehicle_crew changes
    const channel = supabase
      .channel('user-vehicle-assignment')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'vehicle_crew',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchCurrentVehicle()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Subscribe to dispatch changes for the user's vehicle
  useEffect(() => {
    if (!currentVehicleId) return;

    console.log('Listening for dispatches to vehicle:', currentVehicleId);

    const channel = supabase
      .channel('vehicle-dispatches')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'dispatches',
          filter: `vehicle_id=eq.${currentVehicleId}`
        },
        async (payload) => {
          console.log('New dispatch for vehicle:', payload);
          
          const dispatch = payload.new as DispatchNotification;
          
          // Avoid duplicate notifications
          if (lastNotifiedDispatch.current === dispatch.id) return;
          lastNotifiedDispatch.current = dispatch.id;

          // Fetch occurrence details
          const { data: occurrence } = await supabase
            .from('occurrences')
            .select('code, title, priority, location_address')
            .eq('id', dispatch.occurrence_id)
            .single();

          if (occurrence) {
            // Play alert sound
            if (preferences?.sound_enabled !== false) {
              playAlertSound(occurrence.priority, preferences?.sound_volume || 0.5);
            }

            // Show toast notification
            const priorityLabels: Record<string, string> = {
              critical: '🚨 CRÍTICA',
              high: '⚠️ ALTA',
              medium: '📢 MÉDIA',
              low: '📋 BAIXA',
            };

            toast({
              title: `${priorityLabels[occurrence.priority] || ''} Nova Ocorrência!`,
              description: `${occurrence.code} - ${occurrence.title}${occurrence.location_address ? `\n📍 ${occurrence.location_address}` : ''}`,
              variant: occurrence.priority === 'critical' ? 'destructive' : 'default',
              duration: occurrence.priority === 'critical' ? 10000 : 5000,
            });

            // Request browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`${priorityLabels[occurrence.priority]} Nova Ocorrência!`, {
                body: `${occurrence.code} - ${occurrence.title}`,
                icon: '/favicon.ico',
                tag: dispatch.id,
                requireInteraction: occurrence.priority === 'critical',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentVehicleId, preferences, toast]);

  const playAlertSound = (priority: string, volume: number) => {
    try {
      // Create audio context for generating alert sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set frequency based on priority
      const frequencies: Record<string, number[]> = {
        critical: [880, 440, 880, 440, 880], // High-low pattern
        high: [660, 440, 660],
        medium: [523, 523],
        low: [440],
      };
      
      const freqs = frequencies[priority] || frequencies.medium;
      const duration = priority === 'critical' ? 0.15 : 0.2;
      
      gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
      
      freqs.forEach((freq, index) => {
        const startTime = audioContext.currentTime + index * duration;
        oscillator.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(volume * 0.3, startTime);
        gainNode.gain.setValueAtTime(0, startTime + duration * 0.9);
      });
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + freqs.length * duration);
      
      setTimeout(() => {
        audioContext.close();
      }, freqs.length * duration * 1000 + 100);
    } catch (error) {
      console.error('Error playing alert sound:', error);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    currentVehicleId,
  };
}