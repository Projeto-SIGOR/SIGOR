-- Create chat messages table for both occurrence and vehicle chats
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type TEXT NOT NULL CHECK (room_type IN ('occurrence', 'vehicle')),
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_type, room_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in occurrence rooms of their organization
CREATE POLICY "Users can view occurrence chat messages"
ON public.chat_messages
FOR SELECT
USING (
  room_type = 'occurrence' AND (
    is_admin(auth.uid()) OR
    has_role(auth.uid(), 'observer'::app_role) OR
    EXISTS (
      SELECT 1 FROM occurrences o
      WHERE o.id = room_id AND o.organization_id = get_user_organization(auth.uid())
    )
  )
);

-- Policy: Users can view messages in vehicle rooms of their organization
CREATE POLICY "Users can view vehicle chat messages"
ON public.chat_messages
FOR SELECT
USING (
  room_type = 'vehicle' AND (
    is_admin(auth.uid()) OR
    has_role(auth.uid(), 'observer'::app_role) OR
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN bases b ON b.id = v.base_id
      WHERE v.id = room_id AND b.organization_id = get_user_organization(auth.uid())
    )
  )
);

-- Policy: Users can insert messages to occurrence rooms
CREATE POLICY "Users can send occurrence chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  room_type = 'occurrence' AND
  EXISTS (
    SELECT 1 FROM occurrences o
    WHERE o.id = room_id AND o.organization_id = get_user_organization(auth.uid())
  )
);

-- Policy: Users can insert messages to vehicle rooms
CREATE POLICY "Users can send vehicle chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  room_type = 'vehicle' AND
  EXISTS (
    SELECT 1 FROM vehicles v
    JOIN bases b ON b.id = v.base_id
    WHERE v.id = room_id AND b.organization_id = get_user_organization(auth.uid())
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;