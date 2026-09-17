import React, { useState } from "react";
import Modal from "@/components/Modal";
import {
  IconHelp,
  IconPlus,
  IconEdit,
  IconTrash,
  IconMessageSquare,
  IconChevronDown,
} from "@/components/Icons";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

export default function FAQSection({
  faqItems = [],
  isEditing,
  onFAQChange
}) {
  const { t } = useTranslation();
  // Dentro del componente para que las sugerencias sigan al idioma activo.
  const FAQ_SUGGESTIONS = [
    { q: t("proProfile.faq.suggestions.quoteCostQuestion"), a: t("proProfile.faq.suggestions.quoteCostAnswer") },
    { q: t("proProfile.faq.suggestions.areasQuestion"), a: t("proProfile.faq.suggestions.areasAnswer") },
    { q: t("proProfile.faq.suggestions.warrantyQuestion"), a: t("proProfile.faq.suggestions.warrantyAnswer") },
    { q: t("proProfile.faq.suggestions.responseTimeQuestion"), a: t("proProfile.faq.suggestions.responseTimeAnswer") },
    { q: t("proProfile.faq.suggestions.urgentQuestion"), a: t("proProfile.faq.suggestions.urgentAnswer") },
    { q: t("proProfile.faq.suggestions.paymentQuestion"), a: t("proProfile.faq.suggestions.paymentAnswer") },
  ];
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: ""
  });

  const resetForm = () => {
    setFormData({ question: "", answer: "" });
    setEditingItem(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (item) => {
    setFormData({
      question: item.question || "",
      answer: item.answer || ""
    });
    setEditingItem(item);
    setShowAddDialog(true);
  };

  const applySuggestion = (suggestion) => {
    setFormData({
      question: suggestion.q,
      answer: suggestion.a
    });
  };

  const saveItem = () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error(t("proProfile.faq.requiredBoth"));
      return;
    }

    const newItem = {
      id: editingItem?.id || Date.now().toString(),
      question: formData.question.trim(),
      answer: formData.answer.trim()
    };

    let updatedItems;
    if (editingItem) {
      updatedItems = faqItems.map(item =>
        item.id === editingItem.id ? newItem : item
      );
    } else {
      updatedItems = [...faqItems, newItem];
    }

    onFAQChange(updatedItems);
    setShowAddDialog(false);
    resetForm();
    toast.success(editingItem ? t("proProfile.faq.updated") : t("proProfile.faq.added"));
  };

  const deleteItem = (itemId) => {
    onFAQChange(faqItems.filter(item => item.id !== itemId));
    toast.success(t("proProfile.faq.deleted"));
  };

  return (
    <div className="card">
      <div className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <IconHelp className="w-5 h-5 text-success" />
            {t("proProfile.faq.title")} ({faqItems.length})
          </h3>
          {isEditing && (
            <button
              type="button"
              onClick={openAddDialog}
              className="btn-primary btn-sm bg-success hover:bg-green-700"
            >
              <IconPlus className="w-4 h-4 mr-1" />
              {t("proProfile.faq.add")}
            </button>
          )}
        </div>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <p className="text-sm text-c-muted">
          {t("proProfile.faq.intro")}
        </p>

        {faqItems.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-c-border rounded-xl">
            <IconMessageSquare className="w-12 h-12 mx-auto text-c-muted/50 mb-3" />
            <p className="text-c-muted">{t("proProfile.faq.empty")}</p>
            {isEditing && (
              <button type="button" onClick={openAddDialog} className="btn-secondary mt-3">
                <IconPlus className="w-4 h-4 mr-1" />
                {t("proProfile.faq.addFirst")}
              </button>
            )}
          </div>
        ) : (
          <div className="w-full">
            {faqItems.map((item) => (
              <details
                key={item.id}
                className="group border border-c-border rounded-lg mb-2 px-4"
              >
                <summary className="flex items-center justify-between gap-2 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-ink text-left flex-1">{item.question}</span>
                  <IconChevronDown className="w-4 h-4 shrink-0 text-c-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="pt-2 pb-3">
                  <p className="text-ink">{item.answer}</p>
                  {isEditing && (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => openEditDialog(item)}
                      >
                        <IconEdit className="w-3 h-3 mr-1" />
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm text-error hover:bg-error/10"
                        onClick={() => deleteItem(item.id)}
                      >
                        <IconTrash className="w-3 h-3 mr-1" />
                        {t("common.delete")}
                      </button>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* Modal para añadir/editar */}
        <Modal
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          title={editingItem ? t("proProfile.faq.edit") : t("proProfile.faq.addNew")}
        >
          <div className="space-y-4">
            {!editingItem && (
              <div>
                <span className="label text-c-muted">{t("proProfile.faq.quickSuggestions")}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {FAQ_SUGGESTIONS.slice(0, 4).map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="text-xs bg-soft hover:bg-c-border px-2 py-1 rounded transition-colors"
                    >
                      {s.q.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label" htmlFor="faq-question">{t("proProfile.faq.questionLabel")}</label>
              <input
                id="faq-question"
                className="input"
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder={t("proProfile.faq.questionPlaceholder")}
              />
            </div>

            <div>
              <label className="label" htmlFor="faq-answer">{t("proProfile.faq.answerLabel")}</label>
              <textarea
                id="faq-answer"
                className="textarea h-24"
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder={t("proProfile.faq.answerPlaceholder")}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowAddDialog(false)}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="btn-primary bg-success hover:bg-green-700"
              onClick={saveItem}
            >
              {editingItem ? t("proProfile.form.saveChanges") : t("proProfile.faq.add")}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
