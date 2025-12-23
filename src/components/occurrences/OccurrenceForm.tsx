import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOccurrences } from '@/hooks/useOccurrences';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin } from 'lucide-react';
import { 
  Organization, 
  OccurrenceType, 
  PriorityLevel, 
  occurrenceTypeLabels, 
  priorityLabels 
} from '@/types/sigor';
import { z } from 'zod';

const occurrenceSchema = z.object({
  organization_id: z.string().min(1, 'Selecione uma organização'),
  type: z.enum(['police', 'medical', 'fire', 'rescue', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(200),
  description: z.string().max(2000).optional(),
  caller_name: z.string().max(100).optional(),
  caller_phone: z.string().max(20).optional(),
  location_address: z.string().max(300).optional(),
  location_reference: z.string().max(200).optional(),
});

interface OccurrenceFormProps {
  onSuccess?: () => void;
}

export function OccurrenceForm({ onSuccess }: OccurrenceFormProps) {
  const { profile } = useAuth();
  const { createOccurrence } = useOccurrences();
  const { toast } = useToast();
  const { latitude, longitude, loading: gpsLoading, getCurrentPosition, error: gpsError } = useGeolocation();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    organization_id: profile?.organization_id || '',
    type: 'police' as OccurrenceType,
    priority: 'medium' as PriorityLevel,
    title: '',
    description: '',
    caller_name: '',
    caller_phone: '',
    location_address: '',
    location_reference: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Update form when GPS coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      setFormData(prev => ({ ...prev, latitude, longitude }));
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (data) setOrganizations(data as Organization[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = occurrenceSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await createOccurrence({
        organization_id: result.data.organization_id,
        type: result.data.type as OccurrenceType,
        priority: result.data.priority as PriorityLevel,
        title: result.data.title,
        description: result.data.description,
        caller_name: result.data.caller_name,
        caller_phone: result.data.caller_phone,
        location_address: result.data.location_address,
        location_reference: result.data.location_reference,
        latitude: formData.latitude,
        longitude: formData.longitude,
      });
      
      toast({
        title: 'Ocorrência registrada',
        description: 'A ocorrência foi registrada com sucesso.',
      });
      
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar',
        description: error.message || 'Ocorreu um erro ao registrar a ocorrência.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Organization */}
        <div className="space-y-2">
          <Label htmlFor="organization">Órgão *</Label>
          <Select
            value={formData.organization_id}
            onValueChange={(value) => updateField('organization_id', value)}
          >
            <SelectTrigger className={errors.organization_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione o órgão" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.organization_id && (
            <p className="text-sm text-destructive">{errors.organization_id}</p>
          )}
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => updateField('type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(occurrenceTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2 md:col-span-2">
          <Label>Prioridade *</Label>
          <div className="flex gap-2">
            {(Object.entries(priorityLabels) as [PriorityLevel, string][]).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={formData.priority === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateField('priority', value)}
                className={
                  formData.priority === value
                    ? value === 'critical'
                      ? 'bg-emergency hover:bg-emergency/90'
                      : value === 'high'
                      ? 'bg-fire hover:bg-fire/90'
                      : value === 'medium'
                      ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
                      : 'bg-success hover:bg-success/90'
                    : ''
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título da Ocorrência *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Descreva brevemente a ocorrência"
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Detalhes adicionais sobre a ocorrência..."
          rows={3}
        />
      </div>

      {/* Caller Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="caller_name">Nome do Solicitante</Label>
          <Input
            id="caller_name"
            value={formData.caller_name}
            onChange={(e) => updateField('caller_name', e.target.value)}
            placeholder="Nome de quem ligou"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="caller_phone">Telefone</Label>
          <Input
            id="caller_phone"
            value={formData.caller_phone}
            onChange={(e) => updateField('caller_phone', e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="location_address">Endereço</Label>
          <Input
            id="location_address"
            value={formData.location_address}
            onChange={(e) => updateField('location_address', e.target.value)}
            placeholder="Rua, número, bairro..."
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location_reference">Ponto de Referência</Label>
          <Input
            id="location_reference"
            value={formData.location_reference}
            onChange={(e) => updateField('location_reference', e.target.value)}
            placeholder="Próximo a..."
          />
        </div>

        {/* GPS Capture */}
        <div className="space-y-2">
          <Label>Coordenadas GPS</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                getCurrentPosition();
              }}
              disabled={gpsLoading}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {gpsLoading ? 'Obtendo localização...' : 'Capturar GPS'}
            </Button>
            {(formData.latitude || latitude) && (
              <span className="text-sm text-muted-foreground">
                {(formData.latitude || latitude)?.toFixed(6)}, {(formData.longitude || longitude)?.toFixed(6)}
              </span>
            )}
          </div>
          {gpsError && (
            <p className="text-sm text-destructive">{gpsError}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading} size="lg">
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Registrar Ocorrência
        </Button>
      </div>
    </form>
  );
}
