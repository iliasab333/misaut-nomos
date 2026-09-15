import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Headphones, Search as SearchIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminSupportInbox() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Verificar que es admin
  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!u || u.role !== "admin") {
        navigate("/");
      } else {
        setUser(u);
      }
    });
  }, [navigate]);

  // Cargar conversaciones de soporte
  const { isLoading: conversationsLoading } = useQuery({
    queryKey: ["supportConversations"],
    queryFn: async () => {
      if (!user?.id) return [];
      const allMessages = await base44.entities.Message.list().then((msgs) =>
        msgs.filter((m) => m.conversation_id?.startsWith("support_"))
      );

      const grouped = {};
      for (const msg of allMessages) {
        const convId = msg.conversation_id;
        if (!grouped[convId] || new Date(msg.created_date) > new Date(grouped[convId].lastMessage.created_date)) {
          grouped[convId] = {
            conversationId: convId,
            userId: convId.replace("support_", ""),
            lastMessage: msg,
            unreadCount: 0,
          };
        }
      }

      // Contar sin leer
      for (const convId in grouped) {
        const unread = allMessages.filter(
          (m) => m.conversation_id === convId && m.sender_id !== "support_team" && !m.is_read
        ).length;
        grouped[convId].unreadCount = unread;
      }

      // Cargar datos de usuarios
      const convs = Object.values(grouped);
      for (const conv of convs) {
        try {
          const userProfiles = await base44.entities.User.list().then((users) =>
            users.filter((u) => u.id === conv.userId)
          );
          const userProfile = userProfiles[0];
          if (userProfile) {
            conv.userName = userProfile.full_name || userProfile.email;
            conv.userEmail = userProfile.email;
            conv.userType = userProfile.user_type;
          } else {
            conv.userName = conv.lastMessage.client_name || t('admin.supportInbox.userFallback');
            conv.userEmail = t('admin.supportInbox.notAvailable');
          }
        } catch (e) {
          conv.userName = conv.lastMessage.client_name || t('admin.supportInbox.userFallback');
          conv.userEmail = t('admin.supportInbox.notAvailable');
        }
      }

      convs.sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
      setConversations(convs);
      return convs;
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  // Cargar mensajes de conversación seleccionada
  useEffect(() => {
    if (selectedConv) {
      loadMessages();
      markAsRead();
    }
  }, [selectedConv?.conversationId]);

  const loadMessages = async () => {
    const msgs = await base44.entities.Message.filter({
      conversation_id: selectedConv.conversationId,
    }).then((m) => m.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    setMessages(msgs);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const markAsRead = async () => {
    const unread = messages.filter((m) => m.sender_id !== "support_team" && !m.is_read);
    for (const m of unread) {
      await base44.entities.Message.update(m.id, { is_read: true });
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (msgText) => {
      return await base44.entities.Message.create({
        conversation_id: selectedConv.conversationId,
        sender_id: "support_team",
        recipient_id: selectedConv.userId,
        content: msgText,
        professional_name: "Soporte MisAutónomos",
        client_name: selectedConv.userName,
        is_read: false,
        attachments: [],
        internal_admin_id: user.id,
        internal_admin_name: user.full_name || user.email,
      });
    },
    onSuccess: () => {
      setText("");
      loadMessages();
      queryClient.invalidateQueries({ queryKey: ["supportConversations"] });
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim()) {
      sendMutation.mutate(text);
    }
  };

  const filteredConvs = conversations.filter((c) =>
    !search || c.userName?.toLowerCase().includes(search.toLowerCase())
  );

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-56px)] bg-white">
      {/* Sidebar izquierda */}
      <div className="w-80 border-r border-gray-100 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <h1 className="text-lg font-semibold text-gray-900">{t('supportChat.supportInbox')}</h1>
          <p className="text-xs text-gray-500">{t('admin.supportInbox.activeConversations', { count: conversations.length })}</p>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('admin.supportInbox.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 text-sm text-gray-500">{t('common.loading')}</div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">
              {search ? t('admin.supportInbox.noMatches') : t('admin.supportInbox.emptyState')}
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv.conversationId}
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedConv?.conversationId === conv.conversationId ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{conv.userName}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.lastMessage.sender_id === "support_team" ? `${t('admin.supportInbox.youPrefix')} ` : ""}
                      {conv.lastMessage.content}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {new Date(conv.lastMessage.created_date).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 mt-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      conv.userType === "professionnel"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {conv.userType === "professionnel" ? t('admin.supportInbox.professionalType') : t('clientLabel')}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex flex-col bg-white">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Headphones className="w-12 h-12 mb-3" />
            <p className="text-sm">{t('supportChat.selectConversation')}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                {selectedConv.userName?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedConv.userName}</p>
                <p className="text-xs text-gray-500">
                  {selectedConv.userEmail} · {selectedConv.userType === "professionnel" ? t('admin.supportInbox.professionalType') : t('clientLabel')}
                </p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg) => {
                const isFromSupport = msg.sender_id === "support_team";
                return (
                  <div key={msg.id} className={`flex ${isFromSupport ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                        isFromSupport
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-gray-900 rounded-bl-none border border-gray-100"
                      }`}
                    >
                      <p className="whitespace-pre-line break-words">{msg.content}</p>
                      <div
                        className={`text-[10px] mt-1 ${
                          isFromSupport ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.created_date).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isFromSupport && msg.internal_admin_name && (
                          <span className="ml-2">· {msg.internal_admin_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-4 bg-white flex gap-2">
              <form onSubmit={handleSend} className="flex gap-2 flex-1">
                <Input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('admin.supportInbox.replyPlaceholder')}
                  className="flex-1 rounded-full bg-gray-50 border-gray-200"
                  disabled={sendMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full w-10 h-10 bg-gray-900 hover:bg-gray-800 flex-shrink-0"
                  disabled={!text.trim() || sendMutation.isPending}
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}