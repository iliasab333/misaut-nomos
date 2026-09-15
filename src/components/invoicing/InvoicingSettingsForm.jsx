import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Building2, Upload, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function InvoicingSettingsForm({ settings, onSave }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(settings || {
    razon_social: "",
    nif_cif: "",
    direccion_fiscal: "",
    codigo_postal: "",
    ciudad: "",
    provincia: "",
    pais: "España",
    telefono: "",
    email: "",
    web: "",
    iban: "",
    actividad_economica: "",
    logo_url: "",
    iva_por_defecto: 21,
    aplica_retencion: false,
    porcentaje_retencion: 0,
    plazo_pago_dias: 30,
    metodo_pago_defecto: "Transferencia bancaria",
    texto_legal: "",
    serie_factura: "A",
    ultimo_numero_factura: 0
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('invoices.settings.logoTooLarge'));
      return;
    }

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
      toast.success(t('invoices.settings.logoUploaded'));
    } catch (error) {
      toast.error(t('invoices.settings.logoUploadError'));
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t('companyData')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('companyName')} *</Label>
            <Input
              value={formData.razon_social}
              onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
              placeholder={t('invoices.placeholders.companyName')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('nifCif')} *</Label>
              <Input
                value={formData.nif_cif}
                onChange={(e) => setFormData({ ...formData, nif_cif: e.target.value.toUpperCase() })}
                placeholder="B12345678"
                maxLength={9}
              />
            </div>
            <div>
              <Label>{t('economicActivity')}</Label>
              <Input
                value={formData.actividad_economica}
                onChange={(e) => setFormData({ ...formData, actividad_economica: e.target.value })}
                placeholder={t('invoices.placeholders.activity')}
              />
            </div>
          </div>

          <div>
            <Label>{t('fiscalAddress')} *</Label>
            <Input
              value={formData.direccion_fiscal}
              onChange={(e) => setFormData({ ...formData, direccion_fiscal: e.target.value })}
              placeholder={t('invoices.placeholders.address')}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>{t('postalCode')}</Label>
              <Input
                value={formData.codigo_postal}
                onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                placeholder="28001"
                maxLength={5}
              />
            </div>
            <div>
              <Label>{t('city')}</Label>
              <Input
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                placeholder={t('invoices.placeholders.city')}
              />
            </div>
            <div>
              <Label>{t('province')}</Label>
              <Input
                value={formData.provincia}
                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                placeholder={t('invoices.placeholders.city')}
              />
            </div>
            <div>
              <Label>{t('countryField')}</Label>
              <Input
                value={formData.pais}
                onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                placeholder={t('invoices.placeholders.country')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('phoneField')}</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+34 912 345 678"
              />
            </div>
            <div>
              <Label>{t('emailField')} *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('invoices.placeholders.email')}
              />
            </div>
            <div>
              <Label>{t('invoices.settings.website')}</Label>
              <Input
                value={formData.web}
                onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                placeholder={t('invoices.placeholders.website')}
              />
            </div>
          </div>

          <div>
            <Label>{t('ibanField')}</Label>
            <Input
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
              placeholder="ES91 2100 0418 4502 0005 1332"
              maxLength={34}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('ibanInvoiceHelp')}
            </p>
          </div>

          <div>
            <Label>{t('invoices.settings.companyLogo')}</Label>
            <div className="mt-2">
              {formData.logo_url ? (
                <div className="relative inline-block">
                  <img src={formData.logo_url} alt={t('invoices.labels.logoAlt')} className="h-24 w-auto border rounded-lg" />
                  <button
                    onClick={() => setFormData({ ...formData, logo_url: "" })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-700" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">{t('uploadLogo')}</p>
                        <p className="text-xs text-gray-500">{t('invoices.settings.maxLogoSize')}</p>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invoices.settings.defaultsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('invoiceSeries')}</Label>
              <Input
                value={formData.serie_factura}
                onChange={(e) => setFormData({ ...formData, serie_factura: e.target.value.toUpperCase() })}
                placeholder="A"
                maxLength={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('invoices.settings.seriesHelp')}
              </p>
            </div>
            <div>
              <Label>{t('invoices.settings.defaultVat')}</Label>
              <Select
                value={formData.iva_por_defecto.toString()}
                onValueChange={(value) => setFormData({ ...formData, iva_por_defecto: parseFloat(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% - {t('invoices.settings.vatExempt')}</SelectItem>
                  <SelectItem value="4">4% - {t('invoices.settings.vatSuperReduced')}</SelectItem>
                  <SelectItem value="10">10% - {t('invoices.settings.vatReduced')}</SelectItem>
                  <SelectItem value="21">21% - {t('invoices.settings.vatGeneral')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{t('applyIRPFRetention')}</Label>
                <p className="text-xs text-gray-500">{t('invoices.settings.retentionHelp')}</p>
              </div>
              <Switch
                checked={formData.aplica_retencion}
                onCheckedChange={(checked) => setFormData({ ...formData, aplica_retencion: checked })}
              />
            </div>

            {formData.aplica_retencion && (
              <div>
                <Label>{t('retentionPercentage')}</Label>
                <Select
                  value={formData.porcentaje_retencion.toString()}
                  onValueChange={(value) => setFormData({ ...formData, porcentaje_retencion: parseFloat(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="19">19%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('paymentTermDays')}</Label>
              <Select
                value={formData.plazo_pago_dias.toString()}
                onValueChange={(value) => setFormData({ ...formData, plazo_pago_dias: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('invoices.settings.immediate')}</SelectItem>
                  <SelectItem value="7">{t('invoices.settings.daysCount', { count: 7 })}</SelectItem>
                  <SelectItem value="15">{t('invoices.settings.daysCount', { count: 15 })}</SelectItem>
                  <SelectItem value="30">{t('invoices.settings.daysCount', { count: 30 })}</SelectItem>
                  <SelectItem value="60">{t('invoices.settings.daysCount', { count: 60 })}</SelectItem>
                  <SelectItem value="90">{t('invoices.settings.daysCount', { count: 90 })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('defaultPaymentMethod')}</Label>
              <Select
                value={formData.metodo_pago_defecto}
                onValueChange={(value) => setFormData({ ...formData, metodo_pago_defecto: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferencia bancaria">{t('bankTransfer')}</SelectItem>
                  <SelectItem value="Tarjeta">{t('card')}</SelectItem>
                  <SelectItem value="Efectivo">{t('cash')}</SelectItem>
                  <SelectItem value="Bizum">{t('invoices.paymentMethods.bizum')}</SelectItem>
                  <SelectItem value="PayPal">{t('invoices.paymentMethods.paypal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('invoices.settings.legalText')}</Label>
            <Textarea
              value={formData.texto_legal}
              onChange={(e) => setFormData({ ...formData, texto_legal: e.target.value })}
              placeholder={t('legalTextPlaceholder')}
              className="h-24"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('invoices.settings.legalTextHelp')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
          {t('invoices.settings.save')}
        </Button>
      </div>
    </div>
  );
}
