-- Fix function search path for generate_occurrence_code
CREATE OR REPLACE FUNCTION public.generate_occurrence_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;