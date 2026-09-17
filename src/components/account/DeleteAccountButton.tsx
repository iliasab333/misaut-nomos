import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconTrash, IconSpinner, IconWarning } from '@/components/Icons';
import { toast } from '@/lib/toast';
import Modal from '@/components/Modal';
import { supabase } from '@/api/supabaseClient';

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
        className={`btn-danger-outline btn-sm ${className}`.trim()}
      >
        <IconTrash className="w-4 h-4" />
        {t('account.delete.button')}
      </button>

      <Modal
        open={open}
        onClose={close}
        dismissible={false}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 bg-error/10 text-error">
              <IconWarning className="w-4 h-4" />
            </span>
            {t('account.delete.title')}
          </span>
        }
        description={t('account.delete.subtitle')}
      >
        <div className="space-y-3 text-sm text-ink">
          <p>{t('account.delete.loseIntro')}</p>
          <ul className="list-disc list-inside text-xs text-c-muted space-y-0.5">
            <li>{t('account.delete.loseProfile')}</li>
            <li>{t('account.delete.loseConversations')}</li>
            <li>{t('account.delete.loseSubscriptions')}</li>
          </ul>
          <label className="block pt-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-c-muted">
              {t('account.delete.confirmPrompt')}
            </span>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="ELIMINAR"
              className="input mt-1.5"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="btn-secondary btn-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={doDelete}
            disabled={busy || confirm.trim().toUpperCase() !== 'ELIMINAR'}
            className="btn-danger-solid btn-sm"
          >
            {busy ? <IconSpinner className="w-4 h-4 animate-spin" /> : <IconTrash className="w-4 h-4" />}
            {t('account.delete.confirm')}
          </button>
        </div>
      </Modal>
    </>
  );
}
