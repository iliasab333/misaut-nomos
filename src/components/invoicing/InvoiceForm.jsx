import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MobileSelect from "@/components/ui/MobileSelect";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Eye, Sparkles, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import InvoiceAIAssistant from "./InvoiceAIAssistant";

export default function InvoiceForm({ invoice, settings, clients = [], onSave, onCancel, onPreview, onDownloadPDF }) {
  const { t } = useTranslation();
  
  const getNextInvoiceNumber = () => {
    if (!settings) return "001";
    const nextNum = (settings.ultimo_numero_factura || 0) + 1;
    return String(nextNum).padStart(3, '0');
  };

  const calculateDueDate = (issueDate, days) => {
    const date = new Date(issueDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    // Datos emisor (precargados desde settings)
    emisor_razon_social: settings?.razon_social || "",
    emisor_nif: settings?.nif_cif || "",
    emisor_direccion: settings?.direccion_fiscal || "",
    emisor_cp: settings?.codigo_postal || "",
    emisor_ciudad: settings?.ciudad || "",
    emisor_provincia: settings?.provincia || "",
    emisor_pais: settings?.pais || "España",
    emisor_telefono: settings?.telefono || "",
    emisor_email: settings?.email || "",
    emisor_web: settings?.web || "",
    emisor_iban: settings?.iban || "",
    emisor_actividad: settings?.actividad_economica || "",
    emisor_logo_url: settings?.logo_url || "",
    
    // Datos factura
    serie: settings?.serie_factura || "A",
    numero: invoice?.numero || parseInt(getNextInvoiceNumber()),
    invoice_number: invoice?.invoice_number || `${settings?.serie_factura || 'A'}-${new Date().getFullYear()}-${getNextInvoiceNumber()}`,
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || calculateDueDate(new Date(), settings?.plazo_pago_dias || 30),
    payment_method: invoice?.payment_method || settings?.metodo_pago_defecto || "Transferencia bancaria",
    
    // Datos cliente
    client_name: invoice?.client_name || "",
    client_nif: invoice?.client_nif || "",
    client_email: invoice?.client_email || "",
    client_address: invoice?.client_address || "",
    client_cp: invoice?.client_cp || "",
    client_ciudad: invoice?.client_ciudad || "",
    client_provincia: invoice?.client_provincia || "",
    client_pais: invoice?.client_pais || "España",
    
    // Líneas de factura
    items: invoice?.items || [
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        iva_percent: settings?.iva_por_defecto || 21,
        exenta_iva: false,
        subtotal: 0,
        iva_amount: 0,
        total: 0
      }
    ],
    
    // Totales
    subtotal: invoice?.subtotal || 0,
    total_iva: invoice?.total_iva || 0,
    aplica_retencion: invoice?.aplica_retencion ?? settings?.aplica_retencion ?? false,
    porcentaje_retencion: invoice?.porcentaje_retencion || settings?.porcentaje_retencion || 0,
    total_retencion: invoice?.total_retencion || 0,
    total: invoice?.total || 0,
    
    // Notas
    notes: invoice?.notes || "",
    legal_text: invoice?.legal_text || settings?.texto_legal || "",
    
    status: invoice?.status || "draft",
  });

  const [showAIAssistant, setShowAIAssistant] = useState(true);

  const handleSuggestionSelect = (suggestion) => {
    // Buscar el primer item vacío o añadir uno nuevo
    const emptyIndex = formData.items.findIndex(item => !item.description || item.description.trim() === '');
    
    if (emptyIndex >= 0) {
      updateItem(emptyIndex, 'description', suggestion.description);
      updateItem(emptyIndex, 'unit_price', suggestion.suggestedPrice);
    } else {
      const newItem = {
        description: suggestion.description,
        quantity: 1,
        unit_price: suggestion.suggestedPrice,
        discount_percent: 0,
        iva_percent: settings?.iva_por_defecto || 21,
        exenta_iva: false,
        subtotal: suggestion.suggestedPrice,
        iva_amount: suggestion.suggestedPrice * 0.21,
        total: suggestion.suggestedPrice * 1.21
      };
      setFormData(prev => ({ ...prev, items: [...prev.items, calculateLineTotal(newItem)] }));
    }
  };

  const calculateLineTotal = (item) => {
    const subtotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
    const ivaAmount = item.exenta_iva ? 0 : subtotal * (item.iva_percent / 100);
    const total = subtotal + ivaAmount;
    
    return {
      ...item,
      subtotal: Math.round(subtotal * 100) / 100,
      iva_amount: Math.round(ivaAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  };

  const recalculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total_iva = items.reduce((sum, item) => sum + item.iva_amount, 0);
    const total_retencion = formData.aplica_retencion 
      ? Math.round(subtotal * (formData.porcentaje_retencion / 100) * 100) / 100
      : 0;
    const total = Math.round((subtotal + total_iva - total_retencion) * 100) / 100;

    setFormData(prev => ({
      ...prev,
      subtotal: Math.round(subtotal * 100) / 100,
      total_iva: Math.round(total_iva * 100) / 100,
      total_retencion,
      total
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular línea
    newItems[index] = calculateLineTotal(newItems[index]);
    
    setFormData(prev => ({ ...prev, items: newItems }));
    recalculateTotals(newItems);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        iva_percent: settings?.iva_por_defecto || 21,
        exenta_iva: false,
        subtotal: 0,
        iva_amount: 0,
        total: 0
      }]
    }));
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
    recalculateTotals(newItems);
  };

  const loadClientData = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_name: client.client_name || client.company || "",
        client_nif: client.client_nif || "",
        client_email: client.client_email || "",
        client_address: client.address || "",
      }));
    }
  };

  useEffect(() => {
    recalculateTotals(formData.items);
  }, [formData.aplica_retencion, formData.porcentaje_retencion]);

  return (
    <div className="space-y-6">
      {/* Botones de acción — responsivos */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAIAssistant(!showAIAssistant)}
          className={showAIAssistant ? "bg-purple-50 text-purple-700 border-purple-300" : ""}
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          {t('invoices.form.aiButton')}
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onPreview(formData)}>
          <Eye className="w-4 h-4 mr-1.5" />
          {t('preview')}
        </Button>
        {invoice && onDownloadPDF && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownloadPDF(invoice)}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Download className="w-4 h-4 mr-1.5" />
            PDF
          </Button>
        )}
        <Button size="sm" onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
          {t('save')}
        </Button>
      </div>

      {/* AI Assistant */}
      {showAIAssistant && (
        <InvoiceAIAssistant 
          invoice={formData}
          onSelectSuggestion={handleSuggestionSelect}
          onClose={() => setShowAIAssistant(false)}
          showValidation={true}
          showSuggestions={true}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('issuerData')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p className="font-semibold">{formData.emisor_razon_social}</p>
              <p className="text-gray-600">{t('nifCif')}: {formData.emisor_nif}</p>
              <p className="text-gray-600">{formData.emisor_direccion}</p>
              <p className="text-gray-600">{formData.emisor_cp} {formData.emisor_ciudad}</p>
              {formData.emisor_email && <p className="text-gray-600">{formData.emisor_email}</p>}
              {formData.emisor_telefono && <p className="text-gray-600">{formData.emisor_telefono}</p>}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('editInProfile')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('clientData')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.length > 0 && (
              <div>
                <Label>{t('selectExistingClient')}</Label>
                <MobileSelect
                  onValueChange={loadClientData}
                  placeholder={t('newClient')}
                  label={t('selectExistingClient')}
                >
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name || client.company}
                    </SelectItem>
                  ))}
                </MobileSelect>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t('clientName')} *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder={t('invoices.placeholders.clientName')}
                />
              </div>
              <div>
                <Label>{t('clientNif')}</Label>
                <Input
                  value={formData.client_nif}
                  onChange={(e) => setFormData({ ...formData, client_nif: e.target.value.toUpperCase() })}
                  placeholder="B12345678"
                />
              </div>
            </div>

            <div>
              <Label>{t('clientAddress')}</Label>
              <Input
                value={formData.client_address}
                onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                placeholder={t('invoices.placeholders.clientAddress')}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <Label>{t('postalCode')}</Label>
                <Input
                  value={formData.client_cp}
                  onChange={(e) => setFormData({ ...formData, client_cp: e.target.value })}
                  placeholder="28001"
                />
              </div>
              <div>
                <Label>{t('city')}</Label>
                <Input
                  value={formData.client_ciudad}
                  onChange={(e) => setFormData({ ...formData, client_ciudad: e.target.value })}
                  placeholder={t('invoices.placeholders.city')}
                />
              </div>
              <div>
                <Label>{t('province')}</Label>
                <Input
                  value={formData.client_provincia}
                  onChange={(e) => setFormData({ ...formData, client_provincia: e.target.value })}
                  placeholder={t('invoices.placeholders.city')}
                />
              </div>
            </div>

            <div>
              <Label>{t('clientEmail')}</Label>
              <Input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder={t('invoices.placeholders.clientEmail')}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('invoiceDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>{t('invoiceNumber')}</Label>
              <Input value={formData.invoice_number} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>{t('issueDate')} *</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => {
                  const newDueDate = calculateDueDate(e.target.value, settings?.plazo_pago_dias || 30);
                  setFormData({ ...formData, issue_date: e.target.value, due_date: newDueDate });
                }}
              />
            </div>
            <div>
              <Label>{t('dueDate')}</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('paymentMethod')}</Label>
              <MobileSelect
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                label={t('paymentMethod')}
              >
                <SelectItem value="Transferencia bancaria">{t('bankTransfer')}</SelectItem>
                <SelectItem value="Tarjeta">{t('card')}</SelectItem>
                <SelectItem value="Efectivo">{t('cash')}</SelectItem>
                <SelectItem value="Bizum">{t('invoices.paymentMethods.bizum')}</SelectItem>
              </MobileSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('invoiceLines')}</CardTitle>
            <Button onClick={addItem} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              {t('addLine')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.items.map((item, idx) => (
              <div key={idx} className="p-4 border rounded-lg space-y-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4">
                    <Label className="text-xs">{t('description')}</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder={t('serviceConcept')}
                      className="text-sm"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">{t('qty')}</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">{t('unitPrice')}</Label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="text-sm"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">{t('discount')}</Label>
                    <Input
                      type="number"
                      value={item.discount_percent}
                      onChange={(e) => updateItem(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      className="text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">{t('vat')}</Label>
                    <Select
                      value={item.iva_percent.toString()}
                      onValueChange={(value) => updateItem(idx, 'iva_percent', parseFloat(value))}
                      disabled={item.exenta_iva}
                    >
                      <SelectTrigger className="text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="4">4%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">{t('total')}</Label>
                    <Input value={`${item.total.toFixed(2)}€`} disabled className="bg-white text-sm font-semibold" />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                      disabled={formData.items.length === 1}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.exenta_iva}
                    onCheckedChange={(checked) => updateItem(idx, 'exenta_iva', checked)}
                  />
                  <Label className="text-xs text-gray-600">{t('exemptVAT')}</Label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">{t('taxableBase')}:</span>
                <span className="font-semibold">{formData.subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">{t('totalVAT')}:</span>
                <span className="font-semibold">{formData.total_iva.toFixed(2)}€</span>
              </div>
              
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">{t('applyIRPFRetention')}</Label>
                  <Switch
                    checked={formData.aplica_retencion}
                    onCheckedChange={(checked) => setFormData({ ...formData, aplica_retencion: checked })}
                  />
                </div>
                
                {formData.aplica_retencion && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t('retentionPercentage')}</Label>
                      <Select
                        value={formData.porcentaje_retencion.toString()}
                        onValueChange={(value) => setFormData({ ...formData, porcentaje_retencion: parseFloat(value) })}
                      >
                        <SelectTrigger className="h-8 text-sm">
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
                    <div>
                      <Label className="text-xs">{t('retentionAmount')}</Label>
                      <Input value={`-${formData.total_retencion.toFixed(2)}€`} disabled className="h-8 text-sm bg-white" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between pt-2 border-t border-blue-300 text-lg font-bold">
                <span>{t('totalInvoice')}:</span>
                <span className="text-blue-700">{formData.total.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('notesAndLegal')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('observations')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('notesPlaceholder')}
              className="h-20"
            />
          </div>
          <div>
            <Label>{t('legalFooter')}</Label>
            <Textarea
              value={formData.legal_text}
              onChange={(e) => setFormData({ ...formData, legal_text: e.target.value })}
              placeholder={t('legalTextPlaceholder')}
              className="h-20"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
