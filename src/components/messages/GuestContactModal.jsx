import React, { useState } from 'react';
import { Loader2, X, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { sendGuestContact } from '@/lib/contactProfessional';
import { trackMetric } from '@/lib/trackMetric';

const NAVY = '#00255C';

// Modal "Contactar como invitado" para visitantes sin sesión.
// Llama a la Edge Function `contact-professional` y muestra el feedback.
export default function GuestContactModal({ professional, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(
    `Hola ${professional?.business_name ? professional.business_name + ', ' : ''}me interesa tu servicio. ¿Podemos hablar?`
  );
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!name.trim()) return setError('Pon tu nombre');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Email no válido');
    if (message.trim().length < 10) return setError('Cuéntale un poco más al profesional');
    setSending(true);
    try {
      await sendGuestContact({
        professional_profile_id: professional.id,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      trackMetric(professional.id, 'contact_click');
      setDone(true);
    } catch (err) {
      setError(err.message || 'No se ha podido enviar.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Contactar con {professional?.business_name || 'el profesional'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Le llega tu mensaje y te responde directamente a tu email.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,37,92,0.06)' }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: NAVY }} />
            </div>
            <p className="mt-4 font-semibold text-slate-900">Mensaje enviado</p>
            <p className="text-sm text-slate-500 mt-1">
              {professional?.business_name || 'El profesional'} te responderá a <span className="font-medium text-slate-700">{email}</span>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold text-white"
              style={{ background: NAVY }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Nombre</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Mensaje</span>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntale qué necesitas, dónde y cuándo."
                className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">Sin necesidad de crear cuenta.</p>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: NAVY }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
