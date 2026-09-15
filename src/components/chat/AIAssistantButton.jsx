import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles, X } from 'lucide-react';
import AIAssistantChat from './AIAssistantChat';

// Contexto de navegación para sugerencias proactivas
const PROACTIVE_TRIGGERS = {
  search_idle: {
    delay: 45000, // 45 segundos en búsqueda sin acción
    key: 'assistant.proactive.searchIdle'
  },
  category_browsing: {
    delay: 30000,
    key: 'assistant.proactive.categoryBrowsing'
  },
  profile_viewing: {
    delay: 20000,
    key: 'assistant.proactive.profileViewing'
  }
};

export default function AIAssistantButton() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState(null);
  const [showProactiveBubble, setShowProactiveBubble] = useState(false);
  const [browsingContext, setBrowsingContext] = useState({
    currentPage: '',
    searchQuery: '',
    category: '',
    lastActivity: Date.now(),
    viewedProfiles: [],
    searchHistory: []
  });
  const location = useLocation();

  // Detectar contexto de navegación
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const category = urlParams.get('category') || '';
    const query = urlParams.get('q') || '';
    const slug = urlParams.get('slug') || '';

    setBrowsingContext(prev => {
      const newContext = {
        ...prev,
        currentPage: location.pathname,
        searchQuery: query,
        category: category,
        lastActivity: Date.now()
      };

      // Guardar perfil visto si estamos en página de autónomo
      if (location.pathname.includes('Autonomo') && slug && !prev.viewedProfiles.includes(slug)) {
        newContext.viewedProfiles = [...prev.viewedProfiles.slice(-4), slug];
      }

      // Guardar búsqueda si hay query
      if (query && !prev.searchHistory.some(s => s.query === query)) {
        newContext.searchHistory = [...prev.searchHistory.slice(-4), { 
          query, 
          category, 
          timestamp: Date.now() 
        }];
      }

      // Persistir en localStorage
      try {
        localStorage.setItem('ai_browsing_context', JSON.stringify(newContext));
      } catch (e) {}

      return newContext;
    });

    // Resetear sugerencia proactiva al cambiar de página
    setShowProactiveBubble(false);
    setProactiveMessage(null);
  }, [location]);

  // Cargar contexto guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_browsing_context');
      if (saved) {
        const parsed = JSON.parse(saved);
        setBrowsingContext(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  // Trigger proactivo basado en inactividad - defer to avoid blocking
  useEffect(() => {
    if (isOpen) return;

    let trigger = null;
    let delay = 0;

    if (location.pathname.includes('Search')) {
      trigger = PROACTIVE_TRIGGERS.search_idle;
      delay = trigger.delay;
    } else if (location.pathname.includes('Categoria')) {
      trigger = PROACTIVE_TRIGGERS.category_browsing;
      delay = trigger.delay;
    } else if (location.pathname.includes('Autonomo')) {
      trigger = PROACTIVE_TRIGGERS.profile_viewing;
      delay = trigger.delay;
    }

    if (!trigger) return;

    // Defer execution using requestIdleCallback
    const scheduleProactive = () => {
      const timer = setTimeout(() => {
        const timeSinceActivity = Date.now() - browsingContext.lastActivity;
        if (timeSinceActivity >= delay - 5000) {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              setProactiveMessage(t(trigger.key));
              setShowProactiveBubble(true);
            });
          } else {
            setProactiveMessage(t(trigger.key));
            setShowProactiveBubble(true);
          }
        }
      }, delay);
      return timer;
    };

    const timer = scheduleProactive();
    return () => clearTimeout(timer);
  }, [location.pathname, isOpen, browsingContext.lastActivity, t]);

  // Registrar actividad del usuario
  const registerActivity = useCallback(() => {
    setBrowsingContext(prev => ({ ...prev, lastActivity: Date.now() }));
    setShowProactiveBubble(false);
  }, []);

  useEffect(() => {
    window.addEventListener('click', registerActivity);
    window.addEventListener('scroll', registerActivity);
    return () => {
      window.removeEventListener('click', registerActivity);
      window.removeEventListener('scroll', registerActivity);
    };
  }, [registerActivity]);

  const handleOpenChat = (withMessage = null) => {
    setShowProactiveBubble(false);
    setIsOpen(true);
  };

  const dismissProactive = (e) => {
    e.stopPropagation();
    setShowProactiveBubble(false);
    setProactiveMessage(null);
  };

  return (
    <>
      {/* Burbuja proactiva */}
      {showProactiveBubble && proactiveMessage && !isOpen && (
        <div className="fixed bottom-40 right-4 md:bottom-24 md:right-6 z-40 max-w-xs animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-4 relative">
            <button 
              onClick={dismissProactive}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center shadow-sm"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">{proactiveMessage}</p>
                <Button 
                  size="sm" 
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-xs h-8"
                  onClick={() => handleOpenChat(proactiveMessage)}
                >
                  {t('assistant.proactive.accept')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={() => handleOpenChat()}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-105"
        size="icon"
        aria-label={t('assistant.button.open')}
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6" />
          <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
          {showProactiveBubble && (
            <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </Button>

      <AIAssistantChat 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        browsingContext={browsingContext}
        initialProactiveMessage={proactiveMessage}
      />
    </>
  );
}