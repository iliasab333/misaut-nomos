import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { IconSend, IconSearch, IconHeadphones, IconArrowLeft } from '@/components/Icons';
import { SkeletonList, EmptyState } from '@/components/ListStates';
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
    <div className="flex h-[calc(100vh-64px)] bg-surface overflow-hidden">
      {/* Sidebar izquierda */}
      <div className={`w-80 border-r border-c-border flex flex-col flex-shrink-0 ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-c-border">
          <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
            <IconHeadphones className="w-5 h-5 text-c-accent" />
            {t('supportChat.supportInbox')}
          </h1>
          <p className="text-xs text-c-muted mt-0.5">{t('supportChat.conversationsCount', { count: filteredConversations.length })}</p>
        </div>

        <div className="px-3 py-2 border-b border-c-border">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-c-muted pointer-events-none" />
            <input
              type="text"
              className="input pl-9 text-sm"
              placeholder={t('admin.support.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3">
              <SkeletonList count={5} />
              <p className="sr-only">{t('common.loading')}</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <EmptyState className="m-3" title={t('admin.support.emptyState')} />
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.conversationId}
                onClick={() => setSelectedConvId(conv.conversationId)}
                className={`w-full text-left px-4 py-3 border-b border-c-border hover:bg-soft transition-colors ${
                  selectedConvId === conv.conversationId ? 'bg-c-accent/10' : ''
                } ${conv.unread > 0 ? 'bg-c-accent/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-semibold flex items-center justify-center"
                    >
                      {conv.userName?.[0]?.toUpperCase() || '?'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm truncate ${conv.unread > 0 ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>
                          {conv.userName}
                        </p>
                        {conv.isBriefing && (
                          <span className="badge-warning text-[10px] flex-shrink-0">{t('admin.support.adsBadge')}</span>
                        )}
                      </div>
                      <p className="text-xs text-c-muted truncate">
                        {conv.lastMsg?.sender_id === 'support_team' ? '✓ ' : ''}{conv.lastMsg?.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-c-muted">{formatDate(conv.lastMsg?.created_date)}</span>
                    {conv.unread > 0 && (
                      <span className="bg-c-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
          <div className="flex-1 flex flex-col items-center justify-center text-c-muted gap-3">
            <IconHeadphones className="w-12 h-12 text-c-border" />
            <p className="text-sm">{t('supportChat.selectConversation')}</p>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div className="border-b border-c-border px-4 py-3 flex items-center gap-3 bg-surface flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedConvId(null)}
                className="md:hidden p-1.5 hover:bg-soft rounded-lg"
                aria-label={t('common.back')}
              >
                <IconArrowLeft className="w-5 h-5 text-c-muted" />
              </button>
              <span
                aria-hidden="true"
                className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-sm flex items-center justify-center"
              >
                {activeConv?.userName?.[0]?.toUpperCase()}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink text-sm">{activeConv?.userName}</p>
                  {activeConv?.isBriefing && (
                    <span className="badge-warning">{t('admin.support.adsBadgeActive')}</span>
                  )}
                </div>
                <p className="text-xs text-c-muted">{activeConv?.isBriefing ? t('admin.support.adsCampaignChat') : t('admin.support.supportChat')}</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-soft">
              {activeMessages.map(msg => {
                const isFromSupport = msg.sender_id === 'support_team';
                return (
                  <div key={msg.id} className={`flex ${isFromSupport ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                      isFromSupport
                        ? 'bg-c-accent text-white rounded-br-md'
                        : 'bg-surface text-ink rounded-bl-md border border-c-border'
                    }`}>
                      <p className="whitespace-pre-line break-words">{msg.content}</p>
                      <span className={`text-[10px] block mt-0.5 ${isFromSupport ? 'text-white/70' : 'text-c-muted'}`}>
                        {formatTime(msg.created_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de respuesta */}
            <div className="border-t border-c-border p-3 bg-surface flex-shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={t('admin.support.replyPlaceholder')}
                  className="input flex-1 rounded-full bg-soft text-sm"
                  disabled={sendMutation.isPending}
                />
                <button
                  type="submit"
                  className="btn-primary btn-icon rounded-full flex-shrink-0"
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  aria-label={t('messages.send')}
                >
                  <IconSend className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
