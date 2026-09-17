import React from 'react';
import { useTranslation } from 'react-i18next';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.09a16 16 0 006.72 6.72l1.56-1.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="15" height="15">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

export function ActionButtonsCard({ profile, onChat, onWhatsApp, onCall }) {
  const { t } = useTranslation();
  const showPhone = profile.metodos_contacto?.includes('telefono') && profile.telefono_contacto;
  const showWhatsApp = profile.metodos_contacto?.includes('whatsapp') && profile.telefono_contacto;
  const showChat = profile.metodos_contacto?.includes('chat_interno');

  const formatPhoneForWhatsApp = (phone) => {
    return phone
      .replace(/[\s\+\-\(\)]/g, '')
      .replace(/^0034/, '34')
      .replace(/^(?!34)/, '34');
  };

  return (
    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
      {/* Botón Contactar — chat principal */}
      {showChat && (
        <button
          onClick={onChat}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ChatIcon />
          {t('profile_card.contact')}
        </button>
      )}

      {/* Botón WhatsApp — SVG verde oficial */}
      {showWhatsApp && (
        <a
          href={`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          title={t('profile_page.whatsapp')}
        >
          <WhatsAppIcon />
        </a>
      )}

      {/* Botón Teléfono — responde según dispositivo */}
      {showPhone && (
        <div className="relative group" onClick={e => e.stopPropagation()}>
          {/* En móvil: abre llamada */}
          <a
            href={`tel:${profile.telefono_contacto}`}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors md:hidden flex-shrink-0"
            title={profile.telefono_contacto}
          >
            <PhoneIcon />
          </a>

          {/* En desktop: muestra tooltip */}
          <button
            onClick={onCall}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg hidden md:flex items-center justify-center transition-colors flex-shrink-0"
            title={profile.telefono_contacto}
          >
            <PhoneIcon />
          </button>

          {/* Tooltip con número en desktop */}
          <div className="absolute bottom-11 right-0 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            {profile.telefono_contacto}
            <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

// Versión para la página de perfil — con número grande visible
export function ActionButtonsProfile({ profile, onChat, onWhatsApp, onCall }) {
  const { t } = useTranslation();
  const showPhone = profile.metodos_contacto?.includes('telefono') && profile.telefono_contacto;
  const showWhatsApp = profile.metodos_contacto?.includes('whatsapp') && profile.telefono_contacto;
  const showChat = profile.metodos_contacto?.includes('chat_interno');

  const formatPhoneForWhatsApp = (phone) => {
    return phone
      .replace(/[\s\+\-\(\)]/g, '')
      .replace(/^0034/, '34')
      .replace(/^(?!34)/, '34');
  };

  return (
    <div className="space-y-3">
      {/* Mostrar número grande en desktop si hay teléfono */}
      {showPhone && (
        <div className="hidden md:block bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-600 mb-2">{t('phoneContact')}</p>
          <p className="text-2xl font-bold text-gray-900">{profile.telefono_contacto}</p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2">
        {/* Chat directo */}
        {showChat && (
          <button
            onClick={onChat}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <ChatIcon />
            {t('chatDirect')}
          </button>
        )}

        {/* WhatsApp */}
        {showWhatsApp && (
          <a
            href={`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <WhatsAppIcon />
            {t('profile_page.whatsapp')}
          </a>
        )}

        {/* Teléfono */}
        {showPhone && (
          <button
            onClick={onCall}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors md:hidden"
          >
            <PhoneIcon />
            {t('callPhone')}
          </button>
        )}
      </div>
    </div>
  );
}