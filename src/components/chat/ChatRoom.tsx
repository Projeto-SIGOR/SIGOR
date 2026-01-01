import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatMessage {
  id: string;
  room_type: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: {
    full_name: string;
  };
}

interface ChatRoomProps {
  roomType: "occurrence" | "vehicle";
  roomId: string;
  title?: string;
}

const ChatRoom = ({ roomType, roomId, title }: ChatRoomProps) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`chat-${roomType}-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the full message with profile
          const newMsg = payload.new as any;
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newMsg.user_id)
            .single();
          
          const fullMessage: ChatMessage = {
            ...newMsg,
            profile: profileData || undefined,
          };
          setMessages((prev) => [...prev, fullMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomType, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_type", roomType)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (messagesData) {
      // Fetch profiles separately
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      const profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = { full_name: p.full_name };
        return acc;
      }, {} as Record<string, { full_name: string }>);

      const messagesWithProfiles = messagesData.map(m => ({
        ...m,
        profile: profilesMap[m.user_id],
      }));
      setMessages(messagesWithProfiles);
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      room_type: roomType,
      room_id: roomId,
      user_id: user.id,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
      inputRef.current?.focus();
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {title || `Chat ${roomType === "occurrence" ? "da Ocorrência" : "da Viatura"}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs">Seja o primeiro a enviar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwn = msg.user_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-medium mb-1 opacity-80">
                          {msg.profile?.full_name || "Usuário"}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
        
        <div className="p-3 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatRoom;
