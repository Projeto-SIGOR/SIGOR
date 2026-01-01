import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Navigation, X } from "lucide-react";

interface DispatchAlert {
  id: string;
  occurrenceId: string;
  occurrenceCode: string;
  occurrenceTitle: string;
  occurrencePriority: string;
  occurrenceAddress: string | null;
  vehicleIdentifier: string;
}

interface DispatchAlertModalProps {
  alert: DispatchAlert | null;
  onClose: () => void;
  soundEnabled: boolean;
  volume: number;
}

const DispatchAlertModal = ({ alert, onClose, soundEnabled, volume }: DispatchAlertModalProps) => {
  const navigate = useNavigate();
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (alert && soundEnabled) {
      playAlertSound();
    }
    
    return () => {
      stopSound();
    };
  }, [alert, soundEnabled]);

  const playAlertSound = () => {
    if (!soundEnabled || isPlaying) return;
    
    try {
      audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      setIsPlaying(true);

      const playBeep = (frequency: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(volume * 0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Play urgent alert pattern (3 beeps, repeated)
      const now = ctx.currentTime;
      for (let repeat = 0; repeat < 3; repeat++) {
        const offset = repeat * 1.2;
        playBeep(880, now + offset, 0.15);
        playBeep(880, now + offset + 0.2, 0.15);
        playBeep(1100, now + offset + 0.4, 0.3);
      }

      // Stop after 4 seconds
      setTimeout(() => {
        stopSound();
      }, 4000);
    } catch (error) {
      console.error("Error playing alert sound:", error);
    }
  };

  const stopSound = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleOpenOccurrence = () => {
    if (alert) {
      stopSound();
      onClose();
      navigate(`/occurrences/${alert.occurrenceId}`);
    }
  };

  const handleNavigate = () => {
    if (alert?.occurrenceAddress) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.occurrenceAddress)}`;
      window.open(url, "_blank");
    }
  };

  const handleDismiss = () => {
    stopSound();
    onClose();
  };

  if (!alert) return null;

  return (
    <Dialog open={!!alert} onOpenChange={() => handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
            <DialogTitle className="text-xl">Nova Ocorrência!</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Alerta de nova ocorrência despachada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
              {alert.occurrenceCode}
            </span>
            <Badge variant={alert.occurrencePriority === "critical" ? "destructive" : "secondary"}>
              {alert.occurrencePriority}
            </Badge>
          </div>

          <div>
            <h3 className="font-semibold text-lg">{alert.occurrenceTitle}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Despachada para: <span className="font-medium">{alert.vehicleIdentifier}</span>
            </p>
          </div>

          {alert.occurrenceAddress && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm">{alert.occurrenceAddress}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Dispensar
          </Button>
          {alert.occurrenceAddress && (
            <Button variant="secondary" onClick={handleNavigate} className="flex-1">
              <Navigation className="h-4 w-4 mr-2" />
              Navegar
            </Button>
          )}
          <Button onClick={handleOpenOccurrence} className="flex-1">
            Abrir Ocorrência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DispatchAlertModal;
