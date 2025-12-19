// SIGOR Type Definitions

export type AppRole = 
  | 'admin' 
  | 'dispatcher_police' 
  | 'police_officer' 
  | 'dispatcher_samu' 
  | 'samu_team' 
  | 'dispatcher_fire' 
  | 'firefighter' 
  | 'observer';

export type OrganizationType = 'police' | 'samu' | 'fire';

export type OccurrenceType = 'police' | 'medical' | 'fire' | 'rescue' | 'other';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export type OccurrenceStatus = 
  | 'pending' 
  | 'dispatched' 
  | 'en_route' 
  | 'on_scene' 
  | 'transporting' 
  | 'completed' 
  | 'cancelled';

export type VehicleStatus = 'available' | 'busy' | 'maintenance' | 'off_duty';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  code: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Base {
  id: string;
  organization_id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface Vehicle {
  id: string;
  base_id: string;
  identifier: string;
  type: string;
  status: VehicleStatus;
  capacity: number;
  created_at: string;
  updated_at: string;
  base?: Base;
}

export interface Profile {
  id: string;
  full_name: string;
  badge_number?: string;
  phone?: string;
  organization_id?: string;
  base_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  base?: Base;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Occurrence {
  id: string;
  code: string;
  organization_id: string;
  type: OccurrenceType;
  priority: PriorityLevel;
  status: OccurrenceStatus;
  title: string;
  description?: string;
  caller_name?: string;
  caller_phone?: string;
  location_address?: string;
  location_reference?: string;
  latitude?: number;
  longitude?: number;
  created_by: string;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  created_by_profile?: Profile;
}

export interface Dispatch {
  id: string;
  occurrence_id: string;
  vehicle_id: string;
  dispatched_by: string;
  status: OccurrenceStatus;
  notes?: string;
  dispatched_at: string;
  acknowledged_at?: string;
  arrived_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  occurrence?: Occurrence;
  vehicle?: Vehicle;
  dispatched_by_profile?: Profile;
}

export interface OccurrenceHistory {
  id: string;
  occurrence_id: string;
  dispatch_id?: string;
  previous_status?: OccurrenceStatus;
  new_status: OccurrenceStatus;
  changed_by: string;
  notes?: string;
  created_at: string;
  changed_by_profile?: Profile;
}

// UI Helpers
export const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  dispatcher_police: 'Despachante COPOM',
  police_officer: 'Policial',
  dispatcher_samu: 'Despachante SAMU',
  samu_team: 'Equipe SAMU',
  dispatcher_fire: 'Despachante COBOM',
  firefighter: 'Bombeiro',
  observer: 'Observador',
};

export const organizationLabels: Record<OrganizationType, string> = {
  police: 'Polícia',
  samu: 'SAMU',
  fire: 'Bombeiros',
};

export const occurrenceTypeLabels: Record<OccurrenceType, string> = {
  police: 'Policial',
  medical: 'Médica',
  fire: 'Incêndio',
  rescue: 'Resgate',
  other: 'Outra',
};

export const priorityLabels: Record<PriorityLevel, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const statusLabels: Record<OccurrenceStatus, string> = {
  pending: 'Pendente',
  dispatched: 'Despachada',
  en_route: 'Em Deslocamento',
  on_scene: 'No Local',
  transporting: 'Encaminhamento',
  completed: 'Encerrada',
  cancelled: 'Cancelada',
};

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  available: 'Disponível',
  busy: 'Ocupada',
  maintenance: 'Manutenção',
  off_duty: 'Fora de Serviço',
};
