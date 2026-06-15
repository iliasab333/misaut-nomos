import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { Plus, Trash2, Loader2, FileText, Send, AlertTriangle, Download } from "lucide-react";
// `quotePdfGenerator` arrastra jspdf (~600 KB). Lo cargamos dinámico al
// solicitar la descarga para que no entre en el chunk del entry.
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const IVA_OPTIONS = [0, 4, 10, 21];

const DEFAULT_LEGAL = "Este presupuesto tiene una validez de 30 días desde la fecha de emisión. Los precios incluyen todos los materiales y mano de obra salvo indicación contraria.";

function calcTotals(items, applyRet, retPct) {
  let subtotal = 0;
  let totalIva = 0;
  const newItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const disc = parseFloat(item.discount_percent) || 0;
    const iva = parseFloat(item.iva_percent) ?? 21;
    const lineSubtotal = qty * price * (1 - disc / 100);
    const lineIva = lineSubtotal * (iva / 100);
    subtotal += lineSubtotal;
    totalIva += lineIva;
    return { ...item, subtotal: lineSubtotal, iva_amount: lineIva, total: lineSubtotal + lineIva };
  });
  const totalRet = applyRet ? subtotal * ((retPct || 0) / 100) : 0;
  const total = subtotal + totalIva - totalRet;
  return { items: newItems, subtotal, totalIva, totalRet, total };
}

const UNIT_OPTIONS = ['ud', 'h', 'm²', 'm³', 'm', 'kg', 'día', 'semana', 'mes', 'lote'];

function newItem() {
  return { id: crypto.randomUUID(), concept: "", description: "", quantity: 1, unit: "ud", unit_price: 0, discount_percent: 0, iva_percent: 21, subtotal: 0, iva_amount: 0, total: 0 };
}

export default function QuoteForm({ open, onClose, onSaved, user, initialQuote = null }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open || !user) return;
    loadData();
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    if (initialQuote) {
      setForm({ ...initialQuote });
    } else {
      setForm(buildEmpty());
    }
  }, [open, initialQuote]);

  const buildEmpty = () => ({
    client_id: "",
    client_name: "",
    client_email: "",
    client_nif: "",
    client_phone: "",
    client_address: "",
    client_contact_id: "",
    title: "",
    description: "",
    issue_date: today,
    valid_until: validUntil,
    estimated_days: 7,
    items: [newItem()],
    subtotal: 0,
    total_iva: 0,
    aplica_retencion: false,
    porcentaje_retencion: 15,
    total_retencion: 0,
    total: 0,
    payment_conditions: "",
    notes: "",
    legal_text: DEFAULT_LEGAL,
    status: "borrador",
  });

  const loadData = async () => {
    const [cls, sets] = await Promise.all([
      base44.entities.ClientContact.filter({ professional_id: user.id }),
      base44.entities.InvoicingSettings.filter({ professional_id: user.id }).catch(() => [])
    ]);
    setClients(cls);
    setSettings(sets[0] || null);
    if (!initialQuote && sets[0]) {
      setForm(prev => prev ? {
        ...prev,
        emisor_razon_social: sets[0].razon_social || "",
        emisor_nif: sets[0].nif_cif || "",
        emisor_direccion: `${sets[0].direccion_fiscal || ""} ${sets[0].ciudad || ""}`.trim(),
        emisor_telefono: sets[0].telefono || "",
        emisor_email: sets[0].email || "",
        emisor_iban: sets[0].iban || "",
        emisor_logo_url: sets[0].logo_url || "",
        aplica_retencion: sets[0].aplica_retencion || false,
        porcentaje_retencion: sets[0].porcentaje_retencion || 15,
        legal_text: sets[0].texto_legal || DEFAULT_LEGAL,
      } : prev);
    }
  };

  const handleClientSelect = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    if (c) {
      setForm(prev => ({
        ...prev,
        client_id: c.id,
        client_contact_id: c.id,
        client_name: c.client_name || "",
        client_email: c.client_email || "",
        client_nif: c.client_nif || "",
        client_phone: c.client_phone || "",
        client_address: c.address ? `${c.address}, ${c.city || ""}`.trim().replace(/,\s*$/, '') : "",
      }));
    } else {
      setForm(prev => ({ ...prev, client_id: "", client_name: "", client_email: "" }));
    }
  };

  const updateItem = (idx, field, value) => {
    const newItems = form.items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
    const { items, subtotal, totalIva, totalRet, total } = calcTotals(newItems, form.aplica_retencion, form.porcentaje_retencion);
    setForm(prev => ({ ...prev, items, subtotal, total_iva: totalIva, total_retencion: totalRet, total }));
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, newItem()] }));
  };

  const removeItem = (idx) => {
    const newItems = form.items.filter((_, i) => i !== idx);
    const { items, subtotal, totalIva, totalRet, total } = calcTotals(newItems, form.aplica_retencion, form.porcentaje_retencion);
    setForm(prev => ({ ...prev, items, subtotal, total_iva: totalIva, total_retencion: totalRet, total }));
  };

  const recalcOnRetChange = (field, value) => {
    const applyRet = field === 'aplica_retencion' ? value : form.aplica_retencion;
    const retPct = field === 'porcentaje_retencion' ? value : form.porcentaje_retencion;
    const { items, subtotal, totalIva, totalRet, total } = calcTotals(form.items, applyRet, retPct);
    setForm(prev => ({ ...prev, [field]: value, items, subtotal, total_iva: totalIva, total_retencion: totalRet, total }));
  };

  const getNextNumber = async (statusTarget) => {
    if (statusTarget === 'borrador') return { quoteNumber: null, nextNum: null };
    const sets = settings || (await base44.entities.InvoicingSettings.filter({ professional_id: user.id }))[0];
    if (!sets) return { quoteNumber: null, nextNum: null };
    const nextNum = (sets.ultimo_numero_presupuesto || 0) + 1;
    const year = new Date().getFullYear();
    const serie = sets.serie_factura || 'PRES';
    const quoteNumber = `${serie}-${year}-${String(nextNum).padStart(3, '0')}`;
    return { quoteNumber, nextNum, settingsId: sets.id };
  };

  const handleSave = async (sendNow = false) => {
    if (!form.client_name || !form.title) {
      toast.error("Completa cliente y título");
      return;
    }
    setSaving(true);
    try {
      const statusTarget = sendNow ? 'enviado' : 'borrador';
      let quoteNumber = form.quote_number;
      let nextNum = null;
      let settingsId = null;

      // Generar número solo si es nuevo y se va a enviar, o si no tiene número aún
      if (!quoteNumber || sendNow) {
        const numResult = await getNextNumber(statusTarget);
        if (numResult.quoteNumber) {
          quoteNumber = numResult.quoteNumber;
          nextNum = numResult.nextNum;
          settingsId = numResult.settingsId;
        }
      }

      const payload = {
        ...form,
        professional_id: user.id,
        professional_name: user.full_name || user.email?.split('@')[0] || "",
        quote_number: quoteNumber || `PRES-${new Date().getFullYear()}-${Date.now()}`,
        status: statusTarget,
        ...(sendNow ? { sent_date: new Date().toISOString() } : {}),
      };

      let saved;
      if (form.id) {
        saved = await base44.entities.Quote.update(form.id, payload);
      } else {
        saved = await base44.entities.Quote.create(payload);
      }

      // Actualizar contador en settings
      if (nextNum && settingsId) {
        await base44.entities.InvoicingSettings.update(settingsId, { ultimo_numero_presupuesto: nextNum });
      }

      if (sendNow) {
        // Enviar por chat
        await sendViaChat(saved || { ...payload, id: form.id });
      }

      toast.success(sendNow ? "Presupuesto enviado por chat al cliente" : "Presupuesto guardado");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendViaChat = async (quote) => {
    const ids = [quote.professional_id, quote.client_id].sort();
    const conversationId = ids[0] + '_' + ids[1];

    const { getQuotePDFBase64 } = await import('@/services/quotePdfGenerator');
    const pdfBase64 = getQuotePDFBase64(quote);

    const msg = await base44.entities.Message.create({
      conversation_id: conversationId,
      sender_id: quote.professional_id,
      recipient_id: quote.client_id,
      content: `📄 Te envío el presupuesto: ${quote.title}\n\nNº ${quote.quote_number}\nTotal: ${parseFloat(quote.total).toFixed(2)}€\nVálido hasta: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-ES') : ''}`,
      professional_name: quote.professional_name,
      client_name: quote.client_name,
      is_read: false,
      attachments: [{
        url: pdfBase64,
        name: `${quote.quote_number}.pdf`,
        type: 'application/pdf',
        size: pdfBase64.length
      }],
      quote_request: {
        quote_amount: quote.total,
        status: 'pending',
        professional_responded: true
      }
    });

    await base44.entities.Quote.update(quote.id, {
      sent_via_chat: true,
      sent_conversation_id: conversationId,
      quote_message_id: msg.id
    });

    // Notificación push al cliente
    base44.functions.invoke('sendPushNotification', {
      userIds: [quote.client_id],
      title: `📄 Nuevo presupuesto de ${quote.professional_name}`,
      message: `${quote.title} — ${parseFloat(quote.total).toFixed(2)}€`,
      url: `https://misautonomos.es/mensajes`
    }).catch(() => {});

    await base44.entities.Notification.create({
      user_id: quote.client_id,
      type: 'new_message',
      title: `📄 Nuevo presupuesto de ${quote.professional_name}`,
      message: `${quote.title} — ${parseFloat(quote.total).toFixed(2)}€`,
      link: '/mensajes'
    }).catch(() => {});
  };

  if (!form) return null;

  const handlePreviewPDF = async () => {
    if (!form.client_name || !form.title) {
      toast.error("Completa al menos el cliente y el título para previsualizar");
      return;
    }
    const { downloadQuotePDFWithLogo } = await import('@/services/quotePdfGenerator');
    await downloadQuotePDFWithLogo({ ...form, professional_id: user?.id, professional_name: user?.full_name || "" });
  };

  const modalFooter = (
    <>
      <button
        onClick={onClose}
        disabled={saving}
        className="flex-1 md:flex-none px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        onClick={handlePreviewPDF}
        disabled={saving}
        className="hidden md:flex flex-1 md:flex-none px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 items-center justify-center gap-1.5"
        title="Ver PDF con logo"
      >
        <Download className="w-3.5 h-3.5" />
        Ver PDF
      </button>
      <button
        onClick={() => handleSave(false)}
        disabled={saving}
        className="flex-1 md:flex-none px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        Guardar borrador
      </button>
      <button
        onClick={() => handleSave(true)}
        disabled={saving || !form.client_id}
        className="flex-1 md:flex-none px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Guardar y enviar
      </button>
    </>
  );

  return (
    <ResponsiveModal
      isOpen={open}
      onClose={onClose}
      title={initialQuote ? "Editar presupuesto" : "Nuevo presupuesto"}
      footer={modalFooter}
    >
        <div className="space-y-6">
          {/* ── A) CLIENTE ─── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Datos del cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-600 mb-1 block">Seleccionar cliente existente (CRM)</Label>
                <Select value={form.client_contact_id || ""} onValueChange={handleClientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.client_name} {c.client_email ? `(${c.client_email})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Puedes rellenar los datos manualmente o <button onClick={() => { onClose(); navigate('/mis-clientes'); }} className="text-blue-600 underline ml-1">añadir clientes al CRM</button>
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Nombre *</Label>
                <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="Nombre del cliente" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">NIF/CIF</Label>
                <Input value={form.client_nif} onChange={e => setForm(p => ({ ...p, client_nif: e.target.value }))} placeholder="B12345678" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Email</Label>
                <Input value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} placeholder="cliente@email.com" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Teléfono</Label>
                <Input value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} placeholder="+34 600 000 000" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-600 mb-1 block">Dirección</Label>
                <Input value={form.client_address} onChange={e => setForm(p => ({ ...p, client_address: e.target.value }))} placeholder="Calle, número, ciudad..." />
              </div>
            </div>
          </section>

          {/* ── B) DATOS DEL PRESUPUESTO ─── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Datos del presupuesto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-600 mb-1 block">Título *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ej: Reforma integral cocina" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-600 mb-1 block">Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe el trabajo a realizar..." />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Fecha de emisión</Label>
                <Input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Válido hasta</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Días estimados de trabajo</Label>
                <Input type="number" value={form.estimated_days} onChange={e => setForm(p => ({ ...p, estimated_days: Number(e.target.value) }))} min={1} />
              </div>
            </div>
          </section>

          {/* ── C) CONCEPTOS ─── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Conceptos</h3>
              <Button type="button" onClick={addItem} variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />Añadir línea
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-[30%]">Concepto</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-[8%]">Cant.</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-[8%]">Unidad</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-[12%]">Precio</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-[7%]">Dto%</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-[9%]">IVA%</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-[11%]">Total</th>
                    <th className="w-[5%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-t border-gray-50">
                      <td className="px-2 py-1.5">
                        <Input value={item.concept} onChange={e => updateItem(idx, 'concept', e.target.value)} placeholder="Descripción del concepto" className="h-8 text-sm border-gray-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={item.quantity} min={0} step="0.01" onChange={e => updateItem(idx, 'quantity', e.target.value)} className="h-8 text-sm text-center border-gray-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select value={item.unit || 'ud'} onValueChange={v => updateItem(idx, 'unit', v)}>
                          <SelectTrigger className="h-8 text-xs border-gray-200 px-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={item.unit_price} min={0} step="0.01" onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="h-8 text-sm text-right border-gray-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={item.discount_percent} min={0} max={100} onChange={e => updateItem(idx, 'discount_percent', e.target.value)} className="h-8 text-sm text-center border-gray-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select value={String(item.iva_percent ?? 21)} onValueChange={v => updateItem(idx, 'iva_percent', Number(v))}>
                          <SelectTrigger className="h-8 text-sm border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IVA_OPTIONS.map(v => <SelectItem key={v} value={String(v)}>{v}%</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-gray-900">
                        {parseFloat(item.total || 0).toFixed(2)}€
                      </td>
                      <td className="px-1">
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── D) TOTALES ─── */}
          <section>
            <div className="max-w-sm ml-auto space-y-2 bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">{parseFloat(form.subtotal || 0).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA:</span>
                <span className="font-medium">{parseFloat(form.total_iva || 0).toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.aplica_retencion}
                    onCheckedChange={v => recalcOnRetChange('aplica_retencion', v)}
                    className="scale-75"
                  />
                  <span>Retención IRPF</span>
                </div>
                {form.aplica_retencion && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={form.porcentaje_retencion}
                      min={0}
                      max={100}
                      onChange={e => recalcOnRetChange('porcentaje_retencion', Number(e.target.value))}
                      className="w-14 h-7 text-sm text-right border-gray-300"
                    />
                    <span className="text-xs">%</span>
                    <span className="font-medium text-red-600 ml-1">-{parseFloat(form.total_retencion || 0).toFixed(2)}€</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 text-gray-900">
                <span>TOTAL:</span>
                <span>{parseFloat(form.total || 0).toFixed(2)}€</span>
              </div>
            </div>
          </section>

          {/* ── E) CONDICIONES Y NOTAS ─── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Condiciones y notas</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Condiciones de pago</Label>
                <Textarea value={form.payment_conditions} onChange={e => setForm(p => ({ ...p, payment_conditions: e.target.value }))} rows={2} placeholder="Ej: 50% al inicio, 50% al finalizar el trabajo" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Notas adicionales</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Información adicional para el cliente..." />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Texto legal</Label>
                <Textarea value={form.legal_text} onChange={e => setForm(p => ({ ...p, legal_text: e.target.value }))} rows={2} />
              </div>
            </div>
          </section>
        </div>
    </ResponsiveModal>
  );
}