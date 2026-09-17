import React, { useState } from "react";
import Modal from "@/components/Modal";
import {
  IconCamera,
  IconPlus,
  IconClose,
  IconUpload,
  IconSpinner,
  IconEdit,
  IconTrash,
  IconImage,
  IconCalendar,
} from "@/components/Icons";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

export default function PortfolioSection({
  portfolioItems = [],
  isEditing,
  onPortfolioChange,
  categories = []
}) {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    images: [],
    date: "",
    category: ""
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      images: [],
      date: "",
      category: ""
    });
    setEditingItem(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (item) => {
    setFormData({
      title: item.title || "",
      description: item.description || "",
      images: item.images || [],
      date: item.date || "",
      category: item.category || ""
    });
    setEditingItem(item);
    setShowAddDialog(true);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(t("proProfile.portfolio.fileTooLarge", { name: file.name }));
          continue;
        }
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls].slice(0, 5)
      }));
    } catch (error) {
      toast.error(t("proProfile.portfolio.uploadError"));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  const saveItem = () => {
    if (!formData.title.trim()) {
      toast.error(t("proProfile.portfolio.requiredTitle"));
      return;
    }

    if (formData.images.length === 0) {
      toast.error(t("proProfile.portfolio.requiredImage"));
      return;
    }

    const newItem = {
      id: editingItem?.id || Date.now().toString(),
      ...formData
    };

    let updatedItems;
    if (editingItem) {
      updatedItems = portfolioItems.map(item =>
        item.id === editingItem.id ? newItem : item
      );
    } else {
      updatedItems = [...portfolioItems, newItem];
    }

    onPortfolioChange(updatedItems);
    setShowAddDialog(false);
    resetForm();
    toast.success(editingItem ? t("proProfile.portfolio.updated") : t("proProfile.portfolio.added"));
  };

  const deleteItem = (itemId) => {
    onPortfolioChange(portfolioItems.filter(item => item.id !== itemId));
    toast.success(t("proProfile.portfolio.deleted"));
  };

  return (
    <div className="card">
      <div className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <IconCamera className="w-5 h-5 text-c-accent" />
            {t("proProfile.portfolio.title")} ({portfolioItems.length})
          </h3>
          {isEditing && (
            <button type="button" onClick={openAddDialog} className="btn-primary btn-sm">
              <IconPlus className="w-4 h-4 mr-1" />
              {t("proProfile.portfolio.add")}
            </button>
          )}
        </div>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <p className="text-sm text-c-muted">
          {t("proProfile.portfolio.intro")}
        </p>

        {portfolioItems.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-c-border rounded-xl">
            <IconImage className="w-12 h-12 mx-auto text-c-muted/50 mb-3" />
            <p className="text-c-muted">{t("proProfile.portfolio.empty")}</p>
            {isEditing && (
              <button type="button" onClick={openAddDialog} className="btn-secondary mt-3">
                <IconPlus className="w-4 h-4 mr-1" />
                {t("proProfile.portfolio.addFirst")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioItems.map((item) => (
              <div
                key={item.id}
                className="border border-c-border rounded-xl overflow-hidden bg-soft hover:shadow-md transition-shadow"
              >
                {/* Imagen principal */}
                <div className="relative h-40 bg-soft">
                  {item.images?.[0] && (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {item.images?.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {t("proProfile.portfolio.morePhotos", { count: item.images.length - 1 })}
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditDialog(item)}
                        className="bg-surface/90 hover:bg-surface p-1.5 rounded-full shadow"
                        aria-label={t("common.edit")}
                      >
                        <IconEdit className="w-4 h-4 text-c-accent" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="bg-surface/90 hover:bg-surface p-1.5 rounded-full shadow"
                        aria-label={t("common.delete")}
                      >
                        <IconTrash className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h4 className="font-semibold text-ink mb-1">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-c-muted line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-c-muted">
                    {item.date && (
                      <span className="flex items-center gap-1">
                        <IconCalendar className="w-3 h-3" />
                        {item.date}
                      </span>
                    )}
                    {item.category && (
                      <span className="bg-c-accent/10 text-c-accent px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal para añadir/editar */}
        <Modal
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          title={editingItem ? t("proProfile.portfolio.edit") : t("proProfile.portfolio.addToPortfolio")}
        >
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="pf-title">{t("proProfile.portfolio.titleLabel")}</label>
              <input
                id="pf-title"
                className="input"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t("proProfile.portfolio.titlePlaceholder")}
              />
            </div>

            <div>
              <label className="label" htmlFor="pf-description">{t("description")}</label>
              <textarea
                id="pf-description"
                className="textarea h-24"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t("proProfile.portfolio.descriptionPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="pf-date">{t("proProfile.portfolio.dateLabel")}</label>
                <input
                  id="pf-date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  placeholder={t("proProfile.portfolio.datePlaceholder")}
                />
              </div>
              <div>
                <label className="label" htmlFor="pf-category">{t("proProfile.portfolio.categoryLabel")}</label>
                <input
                  id="pf-category"
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder={t("proProfile.portfolio.categoryPlaceholder")}
                />
              </div>
            </div>

            <div>
              <span className="label">{t("proProfile.portfolio.imagesLabel", { count: formData.images.length, max: 5 })}</span>

              {formData.images.length < 5 && (
                <label className="cursor-pointer block mt-2">
                  <div className="border-2 border-dashed border-c-border rounded-lg p-4 text-center hover:border-c-accent transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <IconSpinner className="w-6 h-6 mx-auto text-c-accent animate-spin" />
                    ) : (
                      <>
                        <IconUpload className="w-6 h-6 mx-auto text-c-muted mb-1" />
                        <p className="text-sm text-c-muted">{t("proProfile.portfolio.clickToAddPhotos")}</p>
                      </>
                    )}
                  </div>
                </label>
              )}

              {formData.images.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img}
                        alt={t("proProfile.portfolio.photoAlt", { number: idx + 1 })}
                        className="w-full h-16 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 bg-error text-white p-0.5 rounded-full"
                        aria-label={t("common.delete")}
                      >
                        <IconClose className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowAddDialog(false)}>
              {t("common.cancel")}
            </button>
            <button type="button" className="btn-primary" onClick={saveItem}>
              {editingItem ? t("proProfile.form.saveChanges") : t("proProfile.portfolio.add")}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
