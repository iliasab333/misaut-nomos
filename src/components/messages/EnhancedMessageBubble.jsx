import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause, Reply, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

// Renderiza markdown simple en mensajes de support_team (review requests, etc.)
function MessageMarkdown({ content, isOwn }) {
  return (
    <ReactMarkdown
      className={`text-sm break-words leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0 [&>ul]:ml-4 [&>ul]:list-disc`}
      components={{
        a: ({ href, children }) => {
          const isInternal = href?.startsWith('/') || href?.startsWith('https://misautonomos.es');
          const path = href?.replace('https://misautonomos.es', '');
          if (isInternal && path) {
            return (
              <Link
                to={path}
                className={`underline font-medium ${isOwn ? 'text-blue-100' : 'text-blue-600 hover:text-blue-800'}`}
              >
                {children}
              </Link>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className={`underline font-medium ${isOwn ? 'text-blue-100' : 'text-blue-600 hover:text-blue-800'}`}
            >
              {children}
            </a>
          );
        },
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function EnhancedMessageBubble({ 
  message, 
  isOwn, 
  onReply,
  onMarkAsRead,
  currentUser,
  onQuoteAccepted,
  onQuoteRejected,
}) {
  const { t } = useTranslation();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef(null);
  const [showActions, setShowActions] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getAudioDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) { audioRef.current.pause(); } else { audioRef.current.play(); }
      setIsPlayingAudio(!isPlayingAudio);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
    }
  };

  const handleAudioEnd = () => { setIsPlayingAudio(false); setAudioProgress(0); };

  useEffect(() => {
    if (!isOwn && message.is_read === false) {
      const timer = setTimeout(() => { onMarkAsRead?.(message.id); }, 500);
      return () => clearTimeout(timer);
    }
  }, [message.id, isOwn, message.is_read, onMarkAsRead]);

  const isPDFAttachment = message.attachments?.[0]?.type === 'application/pdf';
  const isClientUser = currentUser?.user_type !== 'professionnel';
  const quoteIsPending = message.quote_request?.status === 'pending' && message.quote_request?.professional_responded;

  const handleAcceptQuote = async () => {
    if (!message.id) return;
    setQuoteLoading(true);
    try {
      const quotes = await base44.entities.Quote.filter({ quote_message_id: message.id });
      if (quotes[0]) {
        await base44.entities.Quote.update(quotes[0].id, {
          status: 'aceptado',
          accepted_date: new Date().toISOString()
        });
        // Mensaje de confirmación
        await base44.entities.Message.create({
          conversation_id: message.conversation_id,
          sender_id: currentUser.id,
          recipient_id: message.sender_id,
          content: t('messages.bubble.acceptedContent', { number: quotes[0].quote_number || '' }),
          is_read: false,
        });
        // Push al profesional
        base44.functions.invoke('sendPushNotification', {
          userIds: [message.sender_id],
          title: t('messages.bubble.acceptedPushTitle'),
          message: t('messages.bubble.acceptedPushBody', { name: currentUser.full_name || t('messages.bubble.clientFallback'), amount: parseFloat(quotes[0].total || 0).toFixed(2) })
        }).catch(() => {});
        toast.success(t('quotesPage.quoteAccepted'));
        onQuoteAccepted?.(message, quotes[0]);
      }
    } catch (err) {
      toast.error(t('messages.bubble.error', { message: err.message }));
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleRejectQuote = async () => {
    if (!message.id) return;
    setQuoteLoading(true);
    try {
      const quotes = await base44.entities.Quote.filter({ quote_message_id: message.id });
      if (quotes[0]) {
        await base44.entities.Quote.update(quotes[0].id, {
          status: 'rechazado',
          rejection_date: new Date().toISOString()
        });
        await base44.entities.Message.create({
          conversation_id: message.conversation_id,
          sender_id: currentUser.id,
          recipient_id: message.sender_id,
          content: t('messages.bubble.rejectedContent', { number: quotes[0].quote_number || '' }),
          is_read: false,
        });
        base44.functions.invoke('sendPushNotification', {
          userIds: [message.sender_id],
          title: t('messages.bubble.rejectedPushTitle'),
          message: t('messages.bubble.rejectedPushBody', { name: currentUser.full_name || t('messages.bubble.clientFallback') })
        }).catch(() => {});
        toast.info(t('quotesPage.quoteRejected'));
        onQuoteRejected?.(message, quotes[0]);
      }
    } catch (err) {
      toast.error(t('messages.bubble.error', { message: err.message }));
    } finally {
      setQuoteLoading(false);
    }
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showActions && !isOwn && (
        <Button size="icon" variant="ghost" className="h-8 w-8 mr-1 text-gray-600 hover:bg-gray-100" onClick={() => onReply?.(message)} title={t('messages.bubble.reply')}>
          <Reply className="w-4 h-4" />
        </Button>
      )}

      <div className={`max-w-xs ${isPDFAttachment ? 'max-w-sm' : ''}`}>
        {/* PDF attachment card */}
        {isPDFAttachment ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{message.attachments[0].name}</p>
                <p className="text-xs text-gray-500">{t('messages.bubble.quotePdf')}</p>
              </div>
            </div>
            {message.content && (
              <p className="text-sm text-gray-700 mb-3 whitespace-pre-line leading-relaxed">{message.content}</p>
            )}
            <div className="flex gap-2">
              <a
                href={message.attachments[0].url}
                download={message.attachments[0].name}
                className="flex-1 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg text-center flex items-center justify-center gap-1 hover:bg-gray-800 transition-colors"
              >
                <Download className="w-3 h-3" />{t('messages.bubble.download')}
              </a>
              {isClientUser && quoteIsPending && !isOwn && (
                <>
                  <button
                    onClick={handleAcceptQuote}
                    disabled={quoteLoading}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {t('messages.bubble.accept')}
                  </button>
                  <button
                    onClick={handleRejectQuote}
                    disabled={quoteLoading}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {t('common.reject')}
                  </button>
                </>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-2 text-right">{formatTime(message.created_date)}</div>
          </div>
        ) : (
          // Normal bubble
          <div className={`px-4 py-2 rounded-2xl ${isOwn ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-900 rounded-bl-none'}`}>
            {message.replyTo && (
              <div className={`text-xs mb-2 pb-2 border-b ${isOwn ? 'border-blue-400' : 'border-gray-300'}`}>
                <p className={`font-medium ${isOwn ? 'text-blue-100' : 'text-gray-600'}`}>{t('messages.chatInput.replyingTo')}</p>
                <p className={`italic ${isOwn ? 'text-blue-50' : 'text-gray-700'}`}>{message.replyTo.content}</p>
              </div>
            )}

            {(!message.type || message.type === 'text') && !message.audioData && !message.imageData && (
              message.sender_id === 'support_team'
                ? <MessageMarkdown content={message.content} isOwn={isOwn} />
                : <p className="text-sm break-words whitespace-pre-line">{message.content}</p>
            )}

            {message.type === 'image' && message.imageData && (
              <img src={message.imageData} alt={t('messages.bubble.imageAlt')} className="rounded-lg max-w-xs max-h-64 object-cover" />
            )}

            {message.type === 'audio' && message.audioData && (
              <div className="space-y-2 min-w-48">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className={`h-8 w-8 ${isOwn ? 'hover:bg-blue-500' : 'hover:bg-gray-300'}`} onClick={handlePlayAudio}>
                    {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <div className="flex-1">
                    <div className="bg-black/20 rounded-full h-1 relative">
                      <div className={`h-full rounded-full transition-all ${isOwn ? 'bg-blue-200' : 'bg-gray-400'}`} style={{ width: `${audioProgress}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium">{getAudioDuration(message.duration || 0)}</span>
                </div>
                <audio ref={audioRef} src={message.audioData} onTimeUpdate={handleAudioTimeUpdate} onEnded={handleAudioEnd} className="hidden" />
              </div>
            )}

            {/* Attachments no-PDF */}
            {message.attachments?.length > 0 && message.attachments[0].type !== 'application/pdf' && (
              <div className="mt-2">
                {message.attachments.map((att, i) => (
                  <a key={i} href={att.url} download={att.name} className={`flex items-center gap-1 text-xs underline ${isOwn ? 'text-blue-100' : 'text-blue-600'}`}>
                    <Download className="w-3 h-3" />{att.name}
                  </a>
                ))}
              </div>
            )}

            <div className={`text-xs mt-1 flex items-center justify-end gap-1 ${isOwn ? 'text-blue-100' : 'text-gray-600'}`}>
              {formatTime(message.created_date)}
              {isOwn && (message.is_read ? <span className="text-blue-200">✓✓</span> : <span>✓</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}