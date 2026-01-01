import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface DispatchAlert {
  id: string;
  occurrenceId: string;
  occurrenceCode: string;
  occurrenceTitle: string;
  occurrencePriority: string;
  occurrenceAddress: string | null;
  vehicleIdentifier: string;
}

export function useDispatchAlerts() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const [currentVehicleId, setCurrentVehicleId] = useState<string | null>(null);
  const [currentAlert, setCurrentAlert] = useState<DispatchAlert | null>(null);

  // Fetch user's current vehicle assignment
  useEffect(() => {
    if (!user) return;

    const fetchCurrentVehicle = async () => {
      const { data } = await supabase
        .from("vehicle_crew")
        .select("vehicle_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        setCurrentVehicleId(data.vehicle_id);
      }
    };

    fetchCurrentVehicle();

    // Subscribe to vehicle_crew changes
    const crewChannel = supabase
      .channel("user-vehicle-assignment")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_crew",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && (payload.new as any).is_active) {
            setCurrentVehicleId((payload.new as any).vehicle_id);
          } else if (payload.eventType === "UPDATE" && !(payload.new as any).is_active) {
            setCurrentVehicleId(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(crewChannel);
    };
  }, [user]);

  // Listen for new dispatches to user's vehicle
  useEffect(() => {
    if (!currentVehicleId) return;

    const dispatchChannel = supabase
      .channel("dispatch-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dispatches",
          filter: `vehicle_id=eq.${currentVehicleId}`,
        },
        async (payload) => {
          const dispatch = payload.new as any;

          // Fetch occurrence and vehicle details
          const [occurrenceRes, vehicleRes] = await Promise.all([
            supabase
              .from("occurrences")
              .select("id, code, title, priority, location_address")
              .eq("id", dispatch.occurrence_id)
              .single(),
            supabase
              .from("vehicles")
              .select("identifier")
              .eq("id", dispatch.vehicle_id)
              .single(),
          ]);

          if (occurrenceRes.data && vehicleRes.data) {
            const newAlert: DispatchAlert = {
              id: dispatch.id,
              occurrenceId: occurrenceRes.data.id,
              occurrenceCode: occurrenceRes.data.code,
              occurrenceTitle: occurrenceRes.data.title,
              occurrencePriority: occurrenceRes.data.priority,
              occurrenceAddress: occurrenceRes.data.location_address,
              vehicleIdentifier: vehicleRes.data.identifier,
            };

            setCurrentAlert(newAlert);

            // Request browser notification
            if (preferences?.push_notifications && Notification.permission === "granted") {
              new Notification(`🚨 Nova Ocorrência - ${newAlert.occurrenceCode}`, {
                body: `${newAlert.occurrenceTitle}\n${newAlert.occurrenceAddress || ""}`,
                icon: "/favicon.ico",
                tag: newAlert.id,
                requireInteraction: true,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dispatchChannel);
    };
  }, [currentVehicleId, preferences?.push_notifications]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const dismissAlert = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  return {
    currentAlert,
    dismissAlert,
    soundEnabled: preferences?.sound_enabled ?? true,
    volume: preferences?.sound_volume ?? 0.5,
    currentVehicleId,
  };
}
