import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { IconAlert, IconCheckCircle } from '@/components/Icons';

export default function EmailUnsubscribePage() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsubscribe = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        return;
      }

      try {
        // Decodificar token: "email:timestamp" en base64
        const decoded = atob(token);
        const [emailAddr] = decoded.split(':');

        setEmail(emailAddr);

        // Buscar el subscriber
        const subscribers = await base44.asServiceRole.entities.NewsletterSubscriber.filter({
          email: emailAddr
        });

        if (!subscribers || subscribers.length === 0) {
          setStatus('not_found');
          return;
        }

        // Marcar como unsubscribed
        await base44.asServiceRole.entities.NewsletterSubscriber.update(subscribers[0].id, {
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        });

        setStatus('success');
      } catch (error) {
        console.error('Unsubscribe error:', error);
        setStatus('error');
      }
    };

    unsubscribe();
  }, [searchParams]);

  return (
    <div className="section-tight flex items-center justify-center">
      <div className="bg-surface rounded-2xl shadow-lg p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin inline-flex items-center justify-center w-12 h-12 bg-c-accent/10 rounded-full mb-4">
              <div className="w-6 h-6 border-2 border-c-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-c-muted">{t('newsletter.unsubscribe.processing')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <IconCheckCircle className="w-12 h-12 text-success" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">{t('newsletter.unsubscribe.title')}</h2>
            <p className="text-c-muted mb-4">
              <Trans i18nKey="newsletter.unsubscribe.bodyEmail" values={{ email }} components={{ strong: <strong /> }} />
            </p>
            <p className="text-sm text-c-muted mb-6">{t('newsletter.unsubscribe.transactionalNoteLong')}</p>
            <button
              type="button"
              onClick={async () => {
                // Reactivar si el usuario lo desea
                const subscribers = await base44.asServiceRole.entities.NewsletterSubscriber.filter({
                  email
                });
                if (subscribers && subscribers.length > 0) {
                  await base44.asServiceRole.entities.NewsletterSubscriber.update(subscribers[0].id, {
                    status: 'subscribed',
                    unsubscribed_at: null
                  });
                  setStatus('resubscribed');
                }
              }}
              className="btn-secondary w-full mb-2"
            >
              {t('newsletter.unsubscribe.resubscribe')}
            </button>
            <a href="/" className="text-c-accent hover:text-accent-hover text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}

        {status === 'resubscribed' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <IconCheckCircle className="w-12 h-12 text-success" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">{t('newsletter.unsubscribe.resubscribedTitle')}</h2>
            <p className="text-c-muted mb-6">{t('newsletter.unsubscribe.resubscribedBody')}</p>
            <a href="/" className="text-c-accent hover:text-accent-hover text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <IconAlert className="w-12 h-12 text-error" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">{t('common.error')}</h2>
            <p className="text-c-muted mb-6">{t('newsletter.unsubscribe.errorBodySupport')}</p>
            <a href="/" className="text-c-accent hover:text-accent-hover text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <IconAlert className="w-12 h-12 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">{t('newsletter.unsubscribe.notFoundTitle')}</h2>
            <p className="text-c-muted mb-6">{t('newsletter.unsubscribe.notFoundBody')}</p>
            <a href="/" className="text-c-accent hover:text-accent-hover text-sm">
              {t('newsletter.backHome')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
