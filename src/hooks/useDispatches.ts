import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dispatch, OccurrenceStatus } from '@/types/sigor';
import { useToast } from '@/hooks/use-toast';

export function useDispatches(occurrenceId?: string) {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDispatches = async () => {
    try {
      let query = supabase
        .from('dispatches')
        .select(`
          *,
          occurrence:occurrences(*),
          vehicle:vehicles(*, base:bases(*))
        `)
        .order('dispatched_at', { ascending: false });

      if (occurrenceId) {
        query = query.eq('occurrence_id', occurrenceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDispatches(data as Dispatch[]);
    } catch (error) {
      console.error('Error fetching dispatches:', error);
      toast({
        title: 'Erro ao carregar despachos',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('dispatches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatches',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchDispatches(); // Refetch to get joined data
          } else if (payload.eventType === 'UPDATE') {
            setDispatches(prev =>
              prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } as Dispatch : d)
            );
          } else if (payload.eventType === 'DELETE') {
            setDispatches(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [occurrenceId]);

  const createDispatch = async (data: {
    occurrence_id: string;
    vehicle_id: string;
    notes?: string;
  }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Update vehicle status to busy
    await supabase
      .from('vehicles')
      .update({ status: 'busy' })
      .eq('id', data.vehicle_id);

    const { data: dispatch, error } = await supabase
      .from('dispatches')
      .insert({
        ...data,
        dispatched_by: user.user.id,
        status: 'dispatched',
      })
      .select()
      .single();

    if (error) throw error;

    // Update occurrence status
    await supabase
      .from('occurrences')
      .update({ status: 'dispatched' })
      .eq('id', data.occurrence_id);

    return dispatch;
  };

  const updateDispatchStatus = async (
    dispatchId: string,
    status: OccurrenceStatus
  ) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const dispatch = dispatches.find(d => d.id === dispatchId);
    
    const updateData: Partial<Dispatch> = { status };
    
    if (status === 'en_route' && !dispatch?.acknowledged_at) {
      updateData.acknowledged_at = new Date().toISOString();
    } else if (status === 'on_scene') {
      updateData.arrived_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'cancelled') {
      updateData.completed_at = new Date().toISOString();
      
      // Free up the vehicle
      if (dispatch?.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', dispatch.vehicle_id);
      }
    }

    const { error } = await supabase
      .from('dispatches')
      .update(updateData)
      .eq('id', dispatchId);

    if (error) throw error;

    // Add to occurrence history
    if (dispatch?.occurrence_id) {
      await supabase.from('occurrence_history').insert({
        occurrence_id: dispatch.occurrence_id,
        dispatch_id: dispatchId,
        previous_status: dispatch.status,
        new_status: status,
        changed_by: user.user.id,
      });
    }
  };

  return {
    dispatches,
    loading,
    refetch: fetchDispatches,
    createDispatch,
    updateDispatchStatus,
  };
}
