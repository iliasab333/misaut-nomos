import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Search, Headphones, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function AdminSupport() {
  const { t } = useTranslation();
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Cargar TODOS los mensajes de conversaciones de soporte Y Briefing
  // Las conversaciones de soporte tienen conversation_id que empieza con "support_"
  // Las conversaciones de Briefing Ads+ tienen conversation_id que empieza con "briefing_"
  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['adminSupportMessages'],
    queryFn: async () => {
      // Traemos mensajes enviados por usuarios a soporte y respuestas del equipo
      const [fromUsers, fromSupport, allMsgs] = await Promise.all([
        base44.entities.Message.filter({ recipient_id: 'support_team' }, '-created_date', 1000),
        base44.entities.Message.filter({ sender_id: 'support_team' }, '-created_date', 1000),
        base44.entities.Message.list('-created_date', 500),
      ]);
      // También incluir chats de Briefing Ads+
      const briefingMsgs = allMsgs.filter(m => m.conversation_id?.startsWith('briefing_'));
      return [...fromUsers, ...fromSupport, ...briefingMsgs];
    },
    refetchInterval: 4000,
  });

  // Agrupar en conversaciones (una por usuario)
  const conversations = useMemo(() => {
    const map = {};
    for (const msg of allMessages) {
      const cid = msg.conversation_id;
      if (!cid?.startsWith('support_') && !cid?.startsWith('briefing_')) continue;
      if (!map[cid]) {
        map[cid] = { conversationId: cid, messages: [], lastMsg: null, unread: 0 };
      }
      map[cid].messages.push(msg);
      if (!map[cid].lastMsg || new Date(msg.created_date) > new Date(map[cid].lastMsg.created_date)) {
        map[cid].lastMsg = msg;
      }
      // Contar mensajes del usuario no leídos (los que llegaron al soporte)
      if (msg.recipient_id === 'support_team' && !msg.is_read) {
        map[cid].unread++;
      }
    }

    return Object.values(map)
      .map(conv => {
        // Nombre del usuario: sacarlo del mensaje (client_name del mensaje del usuario)
        const isBriefing = conv.conversationId?.startsWith('briefing_');
        const userMsg = isBriefing 
          ? conv.messages.find(m => m.sender_id !== 'support_team' && m.sender_id !== m.recipient_id)
          : conv.messages.find(m => m.sender_id !== 'support_team');
        return {
          ...conv,
          isBriefing,
          userName: isBriefing 
            ? userMsg?.client_name || t('admin.support.adsProfessional')
            : userMsg?.client_name || userMsg?.professional_name || t('admin.support.userFallback'),
          userId: userMsg?.sender_id,
        };
      })
      .sort((a, b) => {
        // Briefing chats al inicio
        if (a.isBriefing && !b.isBriefing) return -1;
        if (!a.isBriefing && b.isBriefing) return 1;
        // Después, ordenar por sin leer y fecha
        if (a.unread > 0 && b.unread === 0) return -1;
        if (a.unread === 0 && b.unread > 0) return 1;
        return new Date(b.lastMsg?.created_date) - new Date(a.lastMsg?.created_date);
      });
  }, [allMessages, t]);

  // Mensajes de la conversación activa, ordenados por fecha
  const activeMessages = useMemo(() => {
    if (!selectedConvId) return [];
    const conv = conversations.find(c => c.conversationId === selectedConvId);
    if (!conv) return [];
    return [...conv.messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [conversations, selectedConvId]);

  const activeConv = conversations.find(c => c.conversationId === selectedConvId);

  // Scroll al último mensaje cuando cambian
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Marcar como leídos al abrir conversación
  useEffect(() => {
    if (!selectedConvId || !activeConv) return;
    const unread = activeConv.messages.filter(m => m.recipient_id === 'support_team' && !m.is_read);
    for (const msg of unread) {
      base44.entities.Message.update(msg.id, { is_read: true }).catch(() => {});
    }
  }, [selectedConvId]);

  // Enviar respuesta del admin
  const sendMutation = useMutation({
    mutationFn: async (text) => {
      if (!activeConv) return;
      const isBriefing = selectedConvId?.startsWith('briefing_');
      const senderName = isBriefing ? 'Equipo Plan Ads+' : 'Equipo MisAutónomos';
      return await base44.entities.Message.create({
        conversation_id: selectedConvId,
        sender_id: 'support_team',
        sender_name: senderName,
        recipient_id: activeConv.userId,
        content: text,
        professional_name: senderName,
        client_name: activeConv.userName,
        is_read: false,
        attachments: [],
      });
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['adminSupportMessages'] });
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (messageInput.trim()) sendMutation.mutate(messageInput.trim());
  };

  const filteredConversations = conversations.filter(conv =>
    conv.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(date);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* Sidebar izquierda */}
      <div className={`w-80 border-r border-gray-100 flex flex-col flex-shrink-0 ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-blue-600" />
            {t('supportChat.supportInbox')}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{t('supportChat.conversationsCount', { count: filteredConversations.length })}</p>
        </div>

        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('admin.support.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-400 text-center">{t('common.loading')}</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">{t('admin.support.emptyState')}</div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.conversationId}
                onClick={() => setSelectedConvId(conv.conversationId)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedConvId === conv.conversationId ? 'bg-blue-50' : ''
                } ${conv.unread > 0 ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-semibold">
                        {conv.userName?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm truncate ${conv.unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {conv.userName}
                        </p>
                        {conv.isBriefing && (
                          <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0">{t('admin.support.adsBadge')}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {conv.lastMsg?.sender_id === 'support_team' ? '✓ ' : ''}{conv.lastMsg?.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-gray-400">{formatDate(conv.lastMsg?.created_date)}</span>
                    {conv.unread > 0 && (
                      <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Panel derecho: chat */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Headphones className="w-12 h-12 text-gray-200" />
            <p className="text-sm">{t('supportChat.selectConversation')}</p>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 bg-white flex-shrink-0">
              <button
                onClick={() => setSelectedConvId(null)}
                className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-sm">
                  {activeConv?.userName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{activeConv?.userName}</p>
                  {activeConv?.isBriefing && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded font-semibold">{t('admin.support.adsBadgeActive')}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{activeConv?.isBriefing ? t('admin.support.adsCampaignChat') : t('admin.support.supportChat')}</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {activeMessages.map(msg => {
                const isFromSupport = msg.sender_id === 'support_team';
                return (
                  <div key={msg.id} className={`flex ${isFromSupport ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                      isFromSupport
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
                    }`}>
                      <p className="whitespace-pre-line break-words">{msg.content}</p>
                      <span className={`text-[10px] block mt-0.5 ${isFromSupport ? 'text-blue-100' : 'text-gray-400'}`}>
                        {formatTime(msg.created_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de respuesta */}
            <div className="border-t border-gray-100 p-3 bg-white flex-shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={t('admin.support.replyPlaceholder')}
                  className="flex-1 rounded-full bg-gray-50 border-gray-200 text-sm"
                  disabled={sendMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  disabled={!messageInput.trim() || sendMutation.isPending}
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