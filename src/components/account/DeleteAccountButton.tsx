import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const NAVY = '#00255C';

// Botón de eliminar cuenta — pensado para "Ajustes / Mi cuenta".
// Confirmación con texto exacto "ELIMINAR" para evitar tap accidental.
// Llama a la Edge Function `deleteUser` (idéntica que en la web) y cierra
// sesión en Supabase al terminar.
export default function DeleteAccountButton({
  className = '',
  redirectTo = '/',
}: {
  className?: string;
  redirectTo?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfirm('');
  };

  const doDelete = async () => {
    if (confirm.trim().toUpperCase() !== 'ELIMINAR') {
      toast.error(t('account.delete.confirmPrompt'));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) {
        console.error('[DeleteAccount] edge function error:', error);
        toast.error(error.message || t('account.delete.error'));
        return;
      }
      try {
        await supabase.auth.signOut();
      } catch {
        /* noop */
      }
      toast.success(t('account.delete.success'));
      window.location.href = redirectTo;
    } catch (e: any) {
      console.error('[DeleteAccount] exception:', e);
      toast.error(e?.message || t('account.delete.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          'inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 ' +
          className
        }
      >
        <Trash2 className="w-4 h-4" />
        {t('account.delete.button')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-xl inline-flex items-center justify-center" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{t('account.delete.title')}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t('account.delete.subtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-50"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm text-slate-700">
              <p>{t('account.delete.loseIntro')}</p>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                <li>{t('account.delete.loseProfile')}</li>
                <li>{t('account.delete.loseConversations')}</li>
                <li>{t('account.delete.loseSubscriptions')}</li>
              </ul>
              <label className="block pt-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                  {t('account.delete.confirmPrompt')}
                </span>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="ELIMINAR"
                  className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                />
              </label>
            </div>

            <div className="px-5 pb-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="h-10 px-4 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={busy || confirm.trim().toUpperCase() !== 'ELIMINAR'}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#B91C1C' }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('account.delete.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
