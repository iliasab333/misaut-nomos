import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/Modal";
import { EmptyState, SkeletonLine } from "@/components/ListStates";
import { IconPlus, IconPencil, IconTrash, IconEye, IconEyeOff } from "@/components/Icons";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export default function AdminFAQPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingFaq, setEditingFaq] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['adminFaqs'],
    queryFn: async () => {
      const allFaqs = await base44.entities.FAQ.list();
      return allFaqs.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.FAQ.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success(t('admin.faq.created'));
      setShowDialog(false);
      setEditingFaq(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.FAQ.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success(t('admin.faq.updated'));
      setShowDialog(false);
      setEditingFaq(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.FAQ.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success(t('admin.faq.deleted'));
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }) => {
      return await base44.entities.FAQ.update(id, { published: !published });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success(t('statusUpdated'));
    },
  });

  const handleSave = () => {
    if (!editingFaq.title_es || !editingFaq.title_en || !editingFaq.content_es || !editingFaq.content_en || !editingFaq.category) {
      toast.error(t('admin.faq.requiredFields'));
      return;
    }

    if (editingFaq.id) {
      updateMutation.mutate({ id: editingFaq.id, data: editingFaq });
    } else {
      createMutation.mutate(editingFaq);
    }
  };

  const handleNew = () => {
    setEditingFaq({
      title_es: '',
      title_en: '',
      summary_es: '',
      summary_en: '',
      content_es: '',
      content_en: '',
      category: 'platform',
      tags: [],
      published: true,
      order: faqs.length
    });
    setShowDialog(true);
  };

  const handleEdit = (faq) => {
    setEditingFaq({...faq});
    setShowDialog(true);
  };

  const getCategoryLabel = (category) => {
    const labels = {
      platform: t('admin.faq.categories.platform'),
      clients: t('admin.faq.categories.clients'),
      professionals: t('admin.faq.categories.professionals'),
      security: t('admin.faq.categories.security'),
      payments: t('nav.payments'),
      profile: t('admin.faq.categories.profile'),
      troubleshooting: t('admin.faq.categories.troubleshooting')
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-2">{t('admin.faq.title')}</h1>
            <p className="text-c-muted">{t('admin.faq.subtitle')}</p>
          </div>
          <button type="button" onClick={handleNew} className="btn-primary">
            <IconPlus size={16} />
            {t('admin.faq.newFaq')}
          </button>
        </div>

        {isLoading ? (
          /* El esqueleto calca la tarjeta real: misma rejilla, mismo p-5,
             misma pila (categoría + acciones, título de 2 líneas, resumen de
             2 líneas, pie). Un esqueleto de otra forma hace saltar el
             contenido al llegar. */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label={t('common.loading')}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card" aria-hidden="true">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <SkeletonLine width={96} height={20} />
                    <SkeletonLine width={112} height={20} />
                  </div>
                  <div className="space-y-2 mb-2">
                    <SkeletonLine width="100%" height={18} />
                    <SkeletonLine width="70%" height={18} />
                  </div>
                  <div className="space-y-2 mb-3">
                    <SkeletonLine width="100%" height={12} />
                    <SkeletonLine width="85%" height={12} />
                  </div>
                  <div className="flex items-center justify-between">
                    <SkeletonLine width={72} height={12} />
                    <SkeletonLine width={72} height={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <EmptyState
            title={t('proProfile.faq.empty')}
            ctaLabel={t('admin.faq.newFaq')}
            onCta={handleNew}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="card relative">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="badge-outline">{getCategoryLabel(faq.category)}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn-icon bg-transparent hover:bg-soft"
                        aria-label={faq.published ? t('admin.users.actions.hide') : t('admin.users.actions.show')}
                        aria-pressed={faq.published}
                        onClick={() => togglePublishMutation.mutate({ id: faq.id, published: faq.published })}
                      >
                        {faq.published ? <IconEye size={16} className="text-success" /> : <IconEyeOff size={16} className="text-c-muted" />}
                      </button>
                      <button
                        type="button"
                        className="btn-icon bg-transparent hover:bg-soft"
                        aria-label={t('common.edit')}
                        onClick={() => handleEdit(faq)}
                      >
                        <IconPencil size={16} className="text-c-accent" />
                      </button>
                      <button
                        type="button"
                        className="btn-icon bg-transparent hover:bg-soft"
                        aria-label={t('common.delete')}
                        onClick={() => deleteMutation.mutate(faq.id)}
                      >
                        <IconTrash size={16} className="text-error" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-ink mb-2 line-clamp-2">
                    {faq.title_es}
                  </h3>
                  <p className="text-sm text-c-muted line-clamp-2 mb-3">
                    {faq.summary_es}
                  </p>
                  <div className="flex items-center justify-between text-xs text-c-muted">
                    <span>{t('admin.faq.views', { count: faq.views || 0 })}</span>
                    <span>{t('admin.faq.helpful', { count: faq.helpful_count || 0 })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          open={showDialog}
          onClose={() => setShowDialog(false)}
          size="xl"
          title={editingFaq?.id ? t('admin.faq.dialog.editTitle') : t('admin.faq.dialog.newTitle')}
        >
          {editingFaq && (
            <div className="space-y-6">
              <div>
                <label className="label" htmlFor="faq-category">{t('admin.faq.form.category')}</label>
                <select
                  id="faq-category"
                  className="select"
                  value={editingFaq.category}
                  onChange={(e) => setEditingFaq({...editingFaq, category: e.target.value})}
                >
                  <option value="platform">{t('admin.faq.categories.platform')}</option>
                  <option value="clients">{t('admin.faq.categories.clients')}</option>
                  <option value="professionals">{t('admin.faq.categories.professionals')}</option>
                  <option value="security">{t('admin.faq.categories.security')}</option>
                  <option value="payments">{t('nav.payments')}</option>
                  <option value="profile">{t('admin.faq.categories.profile')}</option>
                  <option value="troubleshooting">{t('admin.faq.categories.troubleshooting')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="faq-title-es">{t('admin.faq.form.titleEs')}</label>
                  <input
                    id="faq-title-es"
                    className="input"
                    value={editingFaq.title_es}
                    onChange={(e) => setEditingFaq({...editingFaq, title_es: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="faq-title-en">{t('admin.faq.form.titleEn')}</label>
                  <input
                    id="faq-title-en"
                    className="input"
                    value={editingFaq.title_en}
                    onChange={(e) => setEditingFaq({...editingFaq, title_en: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="faq-summary-es">{t('admin.faq.form.summaryEs')}</label>
                  <textarea
                    id="faq-summary-es"
                    className="textarea"
                    value={editingFaq.summary_es}
                    onChange={(e) => setEditingFaq({...editingFaq, summary_es: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="faq-summary-en">{t('admin.faq.form.summaryEn')}</label>
                  <textarea
                    id="faq-summary-en"
                    className="textarea"
                    value={editingFaq.summary_en}
                    onChange={(e) => setEditingFaq({...editingFaq, summary_en: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="faq-content-es">{t('admin.faq.form.contentEs')}</label>
                  <textarea
                    id="faq-content-es"
                    className="textarea"
                    value={editingFaq.content_es}
                    onChange={(e) => setEditingFaq({...editingFaq, content_es: e.target.value})}
                    rows={8}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="faq-content-en">{t('admin.faq.form.contentEn')}</label>
                  <textarea
                    id="faq-content-en"
                    className="textarea"
                    value={editingFaq.content_en}
                    onChange={(e) => setEditingFaq({...editingFaq, content_en: e.target.value})}
                    rows={8}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="faq-tags">{t('admin.faq.form.tags')}</label>
                <input
                  id="faq-tags"
                  className="input"
                  value={(editingFaq.tags || []).join(', ')}
                  onChange={(e) => setEditingFaq({...editingFaq, tags: e.target.value.split(',').map(tag => tag.trim())})}
                  placeholder={t('admin.faq.form.tagsPlaceholder')}
                />
              </div>

              <div>
                <label className="label" htmlFor="faq-order">{t('admin.faq.form.order')}</label>
                <input
                  id="faq-order"
                  className="input"
                  type="number"
                  value={editingFaq.order || 0}
                  onChange={(e) => setEditingFaq({...editingFaq, order: parseInt(e.target.value)})}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowDialog(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              {t('common.save')}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
