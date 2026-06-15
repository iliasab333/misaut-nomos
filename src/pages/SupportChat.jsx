import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Headphones, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageSwitcher";
import InboxTabs from "@/components/messages/InboxTabs";

export default function SupportChat() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => navigate("/"));
  }, [navigate]);

  const conversationId = user ? `support_${user.id}` : null;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["supportMessages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return await base44.entities.Message.filter({
        conversation_id: conversationId,
      }).then((msgs) =>
        msgs.sort(
          (a, b) => new Date(a.created_date) - new Date(b.created_date)
        )
      );
    },
    enabled: !!conversationId,
    refetchInterval: 2000,
  });

  // Crear mensaje de bienvenida UNA SOLA VEZ cuando no hay ningún mensaje
  const welcomeSentRef = useRef(false);
  useEffect(() => {
    if (!conversationId || !user || isLoading || welcomeSentRef.current) return;
    if (messages.length === 0) {
      welcomeSentRef.current = true;
      base44.entities.Message.create({
        conversation_id: conversationId,
        sender_id: "support_team",
        sender_name: "Equipo MisAutónomos",
        recipient_id: user.id,
        content: "¡Hola! 👋 Soy el equipo de soporte de MisAutónomos. ¿En qué podemos ayudarte?",
        professional_name: "Soporte MisAutónomos",
        client_name: user.full_name || user.email,
        is_read: false,
        attachments: [],
      });
    } else {
      // Ya hay mensajes, marcar para no volver a enviar nunca
      welcomeSentRef.current = true;
    }
  }, [conversationId, user, isLoading, messages.length]);

  // Scroll solo cuando llega un mensaje nuevo
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      return await base44.entities.Message.create({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: user.full_name || user.email || 'Usuario',
        recipient_id: "support_team",
        content: text,
        professional_name: "Soporte MisAutónomos",
        client_name: user.full_name || user.email,
        is_read: false,
        attachments: [],
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["supportMessages", conversationId] });
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMutation.mutate(message);
    }
  };

  if (!user || isLoading) {
    return <div className="p-6 text-center">{t("common.loading")}</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] md:h-[calc(100vh-56px)] bg-white">
      {/* Tabs Mensajes / Soporte */}
      <div className="px-4 pt-3 bg-white border-b border-gray-100">
        <InboxTabs user={user} unreadChats={0} />
      </div>
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 bg-white sticky top-0">
        <button
          onClick={() => navigate(-1)}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{t("supportChat.supportTeam") || "Soporte MisAutónomos"}</p>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> 
            En línea · Responde en menos de 1h
          </p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg) => {
          const isFromMe = msg.sender_id === user.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isFromMe ? "flex-row-reverse" : ""}`}>
              {!isFromMe && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  isFromMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none border border-gray-100"
                }`}
              >
                <p className="whitespace-pre-line break-words">{msg.content}</p>
                <span
                  className={`text-[10px] block mt-0.5 ${
                    isFromMe ? "text-blue-100" : "text-gray-400"
                  }`}
                >
                  {new Date(msg.created_date).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 bg-white flex gap-2 items-center sticky bottom-0">
        <form onSubmit={handleSend} className="flex gap-2 flex-1">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full bg-gray-50 border-gray-200 focus:ring-0 focus:border-gray-300"
            disabled={sendMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full w-10 h-10 bg-gray-900 hover:bg-gray-800 flex-shrink-0"
            disabled={!message.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </form>
      </div>
    </div>
  );
}