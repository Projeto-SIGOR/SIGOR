-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'dispatcher_police', 'police_officer', 'dispatcher_samu', 'samu_team', 'dispatcher_fire', 'firefighter', 'observer');
CREATE TYPE public.organization_type AS ENUM ('police', 'samu', 'fire');
CREATE TYPE public.occurrence_type AS ENUM ('police', 'medical', 'fire', 'rescue', 'other');
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.occurrence_status AS ENUM ('pending', 'dispatched', 'en_route', 'on_scene', 'transporting', 'completed', 'cancelled');
CREATE TYPE public.vehicle_status AS ENUM ('available', 'busy', 'maintenance', 'off_duty');

-- Organizations table (Police, SAMU, Fire Department)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type organization_type NOT NULL,
  code TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Bases table
CREATE TABLE public.bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id UUID REFERENCES public.bases(id) ON DELETE CASCADE NOT NULL,
  identifier TEXT NOT NULL,
  type TEXT NOT NULL,
  status vehicle_status DEFAULT 'available' NOT NULL,
  capacity INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  badge_number TEXT,
  phone TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  base_id UUID REFERENCES public.bases(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User roles table (separate as required for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Occurrences table
CREATE TABLE public.occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  type occurrence_type NOT NULL,
  priority priority_level DEFAULT 'medium' NOT NULL,
  status occurrence_status DEFAULT 'pending' NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  caller_name TEXT,
  caller_phone TEXT,
  location_address TEXT,
  location_reference TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Dispatches table (linking occurrences to vehicles/teams)
CREATE TABLE public.dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID REFERENCES public.occurrences(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  dispatched_by UUID REFERENCES auth.users(id) NOT NULL,
  status occurrence_status DEFAULT 'dispatched' NOT NULL,
  notes TEXT,
  dispatched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Occurrence status history for audit
CREATE TABLE public.occurrence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID REFERENCES public.occurrences(id) ON DELETE CASCADE NOT NULL,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE,
  previous_status occurrence_status,
  new_status occurrence_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Activity log for audit
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- RLS Policies for organizations
CREATE POLICY "All authenticated can view organizations" ON public.organizations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for bases
CREATE POLICY "All authenticated can view bases" ON public.bases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage bases" ON public.bases
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for vehicles
CREATE POLICY "All authenticated can view vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage vehicles" ON public.vehicles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update vehicle status in their org" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bases b
      JOIN public.profiles p ON p.organization_id = b.organization_id
      WHERE b.id = vehicles.base_id AND p.id = auth.uid()
    )
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for occurrences
CREATE POLICY "Users can view occurrences in their org" ON public.occurrences
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    organization_id = public.get_user_organization(auth.uid()) OR
    public.has_role(auth.uid(), 'observer')
  );

CREATE POLICY "Dispatchers can create occurrences" ON public.occurrences
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'dispatcher_police') OR
    public.has_role(auth.uid(), 'dispatcher_samu') OR
    public.has_role(auth.uid(), 'dispatcher_fire')
  );

CREATE POLICY "Dispatchers can update occurrences" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    (organization_id = public.get_user_organization(auth.uid()) AND (
      public.has_role(auth.uid(), 'dispatcher_police') OR
      public.has_role(auth.uid(), 'dispatcher_samu') OR
      public.has_role(auth.uid(), 'dispatcher_fire')
    ))
  );

-- RLS Policies for dispatches
CREATE POLICY "Users can view dispatches in their org" ON public.dispatches
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'observer') OR
    EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = dispatches.occurrence_id
        AND o.organization_id = public.get_user_organization(auth.uid())
    )
  );

CREATE POLICY "Dispatchers can create dispatches" ON public.dispatches
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'dispatcher_police') OR
    public.has_role(auth.uid(), 'dispatcher_samu') OR
    public.has_role(auth.uid(), 'dispatcher_fire')
  );

CREATE POLICY "Teams can update dispatch status" ON public.dispatches
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = dispatches.occurrence_id
        AND o.organization_id = public.get_user_organization(auth.uid())
    )
  );

-- RLS Policies for occurrence_history
CREATE POLICY "Users can view history in their org" ON public.occurrence_history
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'observer') OR
    EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = occurrence_history.occurrence_id
        AND o.organization_id = public.get_user_organization(auth.uid())
    )
  );

CREATE POLICY "Users can insert history" ON public.occurrence_history
  FOR INSERT TO authenticated WITH CHECK (changed_by = auth.uid());

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own logs" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate occurrence code
CREATE OR REPLACE FUNCTION public.generate_occurrence_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
BEGIN
  -- Set prefix based on organization type
  SELECT CASE 
    WHEN o.type = 'police' THEN 'POL'
    WHEN o.type = 'samu' THEN 'SAM'
    WHEN o.type = 'fire' THEN 'BOM'
    ELSE 'OCO'
  END INTO prefix
  FROM public.organizations o WHERE o.id = NEW.organization_id;
  
  -- Get sequence number for today
  SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num
  FROM public.occurrences
  WHERE DATE(created_at) = CURRENT_DATE
    AND organization_id = NEW.organization_id;
  
  -- Generate code: PREFIX-YYYYMMDD-NNNN
  NEW.code := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$;

-- Trigger to generate occurrence code
CREATE TRIGGER before_occurrence_insert
  BEFORE INSERT ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.generate_occurrence_code();

-- Enable realtime for occurrences and dispatches
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatches;

-- Set replica identity for realtime
ALTER TABLE public.occurrences REPLICA IDENTITY FULL;
ALTER TABLE public.dispatches REPLICA IDENTITY FULL;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bases_updated_at BEFORE UPDATE ON public.bases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_occurrences_updated_at BEFORE UPDATE ON public.occurrences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dispatches_updated_at BEFORE UPDATE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();