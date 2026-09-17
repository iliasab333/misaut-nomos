import React, { useState } from "react";
import Modal from "@/components/Modal";
import { IconBriefcase, IconPlus, IconEdit, IconTrash, IconEuro } from "@/components/Icons";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

export default function ServicesSection({ 
  services = [], 
  isEditing, 
  onServicesChange 
}) {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    unit: "hora"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      duration: "",
      unit: "hora"
    });
    setEditingService(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (service) => {
    setFormData({
      name: service.name || "",
      description: service.description || "",
      price: service.price || "",
      duration: service.duration || "",
      unit: service.unit || "hora"
    });
    setEditingService(service);
    setShowAddDialog(true);
  };

  const saveService = () => {
    if (!formData.name.trim()) {
      toast.error(t("proProfile.services.requiredName"));
      return;
    }

    const newService = {
      id: editingService?.id || Date.now().toString(),
      ...formData
    };

    let updatedServices;
    if (editingService) {
      updatedServices = services.map(service => 
        service.id === editingService.id ? newService : service
      );
    } else {
      updatedServices = [...services, newService];
    }

    onServicesChange(updatedServices);
    setShowAddDialog(false);
    resetForm();
    toast.success(editingService ? t("proProfile.services.updated") : t("proProfile.services.added"));
  };

  const deleteService = (serviceId) => {
    onServicesChange(services.filter(service => service.id !== serviceId));
    toast.success(t("proProfile.services.deleted"));
  };

  return (
    <div className="card">
      <div className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <IconBriefcase className="w-5 h-5 text-c-accent" />
            {t("profile_page.services")} ({services.length})
          </h3>
          {isEditing && (
            <button type="button" onClick={openAddDialog} className="btn-primary btn-sm">
              <IconPlus className="w-4 h-4 mr-1" />
              {t("proProfile.services.add")}
            </button>
          )}
        </div>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <p className="text-sm text-c-muted">
          {t("proProfile.services.intro")}
        </p>

        {services.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-c-border rounded-xl">
            <IconBriefcase className="w-12 h-12 mx-auto text-c-muted/50 mb-3" />
            <p className="text-c-muted">{t("proProfile.services.empty")}</p>
            {isEditing && (
              <button type="button" onClick={openAddDialog} className="btn-secondary mt-3">
                <IconPlus className="w-4 h-4 mr-1" />
                {t("proProfile.services.addFirst")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="border border-c-border rounded-xl p-4 bg-soft hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-ink mb-1">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-c-muted">{service.description}</p>
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => openEditDialog(service)}
                        className="p-1.5 hover:bg-surface rounded-full transition-colors"
                        aria-label={t("proProfile.services.edit")}
                      >
                        <IconEdit className="w-4 h-4 text-c-accent" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteService(service.id)}
                        className="p-1.5 hover:bg-surface rounded-full transition-colors"
                        aria-label={t("common.delete")}
                      >
                        <IconTrash className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 text-sm text-ink mt-2">
                  {service.price && (
                    <span className="flex items-center gap-1 bg-success/10 text-success px-2 py-1 rounded">
                      <IconEuro className="w-3 h-3" />
                      {service.price}€/{service.unit}
                    </span>
                  )}
                  {service.duration && (
                    <span className="bg-c-accent/10 text-c-accent px-2 py-1 rounded">
                      {t("proProfile.services.durationLabel", { duration: service.duration })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal para añadir/editar */}
        <Modal
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          title={editingService ? t("proProfile.services.edit") : t("proProfile.services.add")}
        >
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="svc-name">{t("proProfile.services.nameLabel")}</label>
              <input
                id="svc-name"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t("proProfile.services.namePlaceholder")}
              />
            </div>

            <div>
              <label className="label" htmlFor="svc-description">{t("description")}</label>
              <textarea
                id="svc-description"
                className="textarea h-24"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t("proProfile.services.descriptionPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label" htmlFor="svc-price">{t("proProfile.services.priceLabel")}</label>
                <input
                  id="svc-price"
                  className="input"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="50"
                  min="0"
                />
              </div>
              <div>
                <label className="label" htmlFor="svc-unit">{t("proProfile.services.perLabel")}</label>
                <select
                  id="svc-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="select"
                >
                  <option value="hora">{t("proProfile.services.unitHour")}</option>
                  <option value="servicio">{t("proProfile.services.unitService")}</option>
                  <option value="día">{t("proProfile.services.unitDay")}</option>
                  <option value="m²">m²</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="svc-duration">{t("proProfile.services.durationEstimate")}</label>
              <input
                id="svc-duration"
                className="input"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder={t("proProfile.services.durationPlaceholder")}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowAddDialog(false)}>
              {t("common.cancel")}
            </button>
            <button type="button" className="btn-primary" onClick={saveService}>
              {editingService ? t("proProfile.form.saveChanges") : t("proProfile.services.add")}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
