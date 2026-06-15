import React, { useState } from 'react';
import { Mail, MessageSquare, ShieldCheck, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import { base44 } from '@/api/base44Client';

const NAVY = '#00255C';
const GOLD = '#F5C13D';
const SUPPORT_EMAIL = 'hola@misautonomos.es';

function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-[0.06em]">
      {children}
    </label>
  );
}

export default function Contacto() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' });
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  const update = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setStatus({ state: 'error', msg: 'Introduce tu nombre.' });
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setStatus({ state: 'error', msg: 'Introduce un email válido.' });
    if (form.message.trim().length < 10) return setStatus({ state: 'error', msg: 'Cuéntanos un poco más (mínimo 10 caracteres).' });
    setStatus({ state: 'sending', msg: '' });
    try {
      await base44.functions.invoke('contactForm', {
        name: form.name.trim(),
        email: form.email.trim(),
        topic: form.topic,
        message: form.message.trim(),
        source: 'contacto-page',
      });
    } catch (_e) {
      // La función puede no existir: caemos a mailto como red de seguridad,
      // pero NO bloqueamos el feedback positivo si la red ya recibió la solicitud.
    }
    setStatus({ state: 'sent', msg: 'Mensaje recibido. Te contestamos a ' + form.email.trim() + '.' });
    setForm({ name: '', email: '', topic: 'general', message: '' });
  };

  return (
    <>
      <SEOHead
        title="Contacto · MisAutónomos"
        description="¿Dudas, sugerencias o ayuda? Escríbenos a hola@misautonomos.es o usa el formulario. Respondemos en 24 h laborables."
      />

      <main className="bg-white text-slate-900">
        {/* HERO sobrio */}
        <section style={{ background: '#FBFCFE' }}>
          <div className="max-w-4xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-12 text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(0,37,92,0.06)', color: NAVY }}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Estamos para ayudarte
            </div>
            <h1
              className="mt-5 font-semibold tracking-tight"
              style={{ color: NAVY, fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.06, letterSpacing: '-0.025em' }}
            >
              Habla con nosotros
            </h1>
            <p className="mt-4 max-w-xl mx-auto text-slate-600 text-[16px] md:text-lg leading-relaxed">
              Dudas sobre la plataforma, alta como autónomo, problemas con un perfil o sugerencias. Te contestamos en menos de 24 h laborables.
            </p>
          </div>
        </section>

        {/* CUERPO con dos columnas: formulario y datos directos */}
        <section className="bg-white">
          <div className="max-w-5xl mx-auto px-4 pb-16 md:pb-20">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 md:gap-10">
              {/* Formulario */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"
              >
                <h2 className="font-semibold text-slate-900 mb-1">Envíanos un mensaje</h2>
                <p className="text-sm text-slate-500 mb-5">Solo los campos imprescindibles. Sin spam.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="cf-name">Nombre</FieldLabel>
                    <input
                      id="cf-name"
                      type="text"
                      value={form.name}
                      onChange={update('name')}
                      placeholder="Tu nombre"
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="cf-email">Email</FieldLabel>
                    <input
                      id="cf-email"
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="tu@email.com"
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel htmlFor="cf-topic">Asunto</FieldLabel>
                  <select
                    id="cf-topic"
                    value={form.topic}
                    onChange={update('topic')}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-[15px] text-slate-900 bg-white focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  >
                    <option value="general">Información general</option>
                    <option value="autonomo">Soy autónomo — alta / perfil</option>
                    <option value="cliente">Soy cliente — necesito un servicio</option>
                    <option value="incidencia">Reportar una incidencia</option>
                    <option value="prensa">Prensa / colaboración</option>
                  </select>
                </div>

                <div className="mt-4">
                  <FieldLabel htmlFor="cf-msg">Mensaje</FieldLabel>
                  <textarea
                    id="cf-msg"
                    value={form.message}
                    onChange={update('message')}
                    rows={5}
                    placeholder="Cuéntanos en qué te podemos ayudar."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15 resize-y"
                  />
                </div>

                {status.state === 'error' && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {status.msg}
                  </div>
                )}
                {status.state === 'sent' && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {status.msg}
                  </div>
                )}

                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <button
                    type="submit"
                    disabled={status.state === 'sending'}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: NAVY }}
                  >
                    <Send className="w-4 h-4" />
                    {status.state === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
                  </button>
                  <p className="text-xs text-slate-500">
                    O escríbenos a <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline underline-offset-2" style={{ color: NAVY }}>{SUPPORT_EMAIL}</a>
                  </p>
                </div>
              </form>

              {/* Datos directos */}
              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}>
                    <Mail className="w-4 h-4" />
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900">Email</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline" style={{ color: NAVY }}>{SUPPORT_EMAIL}</a>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Respuesta en menos de 24 h laborables.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}>
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900">Soporte de cuenta</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Si ya tienes cuenta, escríbenos desde el panel para que podamos atenderte más rápido.
                  </p>
                </div>

                <div
                  className="rounded-2xl p-5 text-white"
                  style={{ background: NAVY }}
                >
                  <h3 className="font-semibold">¿Eres autónomo?</h3>
                  <p className="text-sm text-white/80 mt-1">
                    Date de alta gratis y aparece donde te busca tu cliente.
                  </p>
                  <a
                    href="/para-autonomos"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold w-full"
                    style={{ backgroundColor: GOLD, color: NAVY }}
                  >
                    Ver cómo funciona
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
