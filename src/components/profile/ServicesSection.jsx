import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Briefcase, Plus, X, Edit2, Trash2, Euro } from "lucide-react";
import { toast } from "sonner";
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
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-700" />
            {t("profile_page.services")} ({services.length})
          </CardTitle>
          {isEditing && (
            <Button onClick={openAddDialog} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              {t("proProfile.services.add")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {t("proProfile.services.intro")}
        </p>

        {services.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t("proProfile.services.empty")}</p>
            {isEditing && (
              <Button onClick={openAddDialog} variant="outline" className="mt-3">
                <Plus className="w-4 h-4 mr-1" />
                {t("proProfile.services.addFirst")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="border rounded-xl p-4 bg-gray-50 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-gray-600">{service.description}</p>
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => openEditDialog(service)}
                        className="p-1.5 hover:bg-white rounded-full transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="p-1.5 hover:bg-white rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 text-sm text-gray-700 mt-2">
                  {service.price && (
                    <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                      <Euro className="w-3 h-3" />
                      {service.price}€/{service.unit}
                    </span>
                  )}
                  {service.duration && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {t("proProfile.services.durationLabel", { duration: service.duration })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog para añadir/editar */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingService ? t("proProfile.services.edit") : t("proProfile.services.add")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>{t("proProfile.services.nameLabel")}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t("proProfile.services.namePlaceholder")}
                />
              </div>

              <div>
                <Label>{t("description")}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t("proProfile.services.descriptionPlaceholder")}
                  className="h-24"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>{t("proProfile.services.priceLabel")}</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="50"
                    min="0"
                  />
                </div>
                <div>
                  <Label>{t("proProfile.services.perLabel")}</Label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                  >
                    <option value="hora">{t("proProfile.services.unitHour")}</option>
                    <option value="servicio">{t("proProfile.services.unitService")}</option>
                    <option value="día">{t("proProfile.services.unitDay")}</option>
                    <option value="m²">m²</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>{t("proProfile.services.durationEstimate")}</Label>
                <Input
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder={t("proProfile.services.durationPlaceholder")}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={saveService} className="bg-blue-600 hover:bg-blue-700">
                {editingService ? t("proProfile.form.saveChanges") : t("proProfile.services.add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}