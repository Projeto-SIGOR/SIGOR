import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPreferences {
  id?: string;
  user_id: string;
  sound_enabled: boolean;
  sound_volume: number;
  critical_alerts: boolean;
  high_priority_alerts: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

const defaultPreferences: Omit<UserPreferences, 'user_id'> = {
  sound_enabled: true,
  sound_volume: 0.5,
  critical_alerts: true,
  high_priority_alerts: true,
  email_notifications: false,
  push_notifications: false,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data as UserPreferences);
      } else {
        // Create default preferences
        const newPrefs = { ...defaultPreferences, user_id: user.id };
        const { data: created, error: createError } = await supabase
          .from('user_preferences')
          .insert(newPrefs)
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(created as UserPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Use defaults if there's an error
      setPreferences({ ...defaultPreferences, user_id: user.id } as UserPreferences);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }, [user, preferences]);

  return { preferences, loading, updatePreferences, refetch: fetchPreferences };
}
