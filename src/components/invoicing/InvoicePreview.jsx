import React from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

export default function InvoicePreview({ invoiceData }) {
  const { t } = useTranslation();

  if (!invoiceData) return null;

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto shadow-lg" id="invoice-preview">
      {/* CABECERA */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {invoiceData.emisor_logo_url && (
            <img 
              src={invoiceData.emisor_logo_url} 
              alt={t('invoices.labels.logoAlt')} 
              className="h-16 w-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900">{t('invoices.preview.title')}</h1>
          <p className="text-xl text-gray-600 mt-1">{invoiceData.invoice_number}</p>
        </div>
        
        <div className="text-right text-sm">
          <p className="font-semibold text-gray-900">{invoiceData.emisor_razon_social}</p>
          <p className="text-gray-600">{t('nifCif')}: {invoiceData.emisor_nif}</p>
          <p className="text-gray-600">{invoiceData.emisor_direccion}</p>
          <p className="text-gray-600">{invoiceData.emisor_cp} {invoiceData.emisor_ciudad}</p>
          <p className="text-gray-600">{invoiceData.emisor_provincia}, {invoiceData.emisor_pais}</p>
          {invoiceData.emisor_telefono && <p className="text-gray-600">{t('phoneField')}: {invoiceData.emisor_telefono}</p>}
          {invoiceData.emisor_email && <p className="text-gray-600">{t('emailField')}: {invoiceData.emisor_email}</p>}
          {invoiceData.emisor_web && <p className="text-gray-600">{invoiceData.emisor_web}</p>}
        </div>
      </div>

      <Separator className="my-6" />

      {/* DATOS CLIENTE Y FECHAS */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('invoices.preview.billedTo')}</p>
          <div className="text-sm">
            <p className="font-semibold text-gray-900">{invoiceData.client_name}</p>
            {invoiceData.client_nif && <p className="text-gray-600">{t('nifCif')}: {invoiceData.client_nif}</p>}
            {invoiceData.client_address && <p className="text-gray-600">{invoiceData.client_address}</p>}
            {invoiceData.client_cp && <p className="text-gray-600">{invoiceData.client_cp} {invoiceData.client_ciudad}</p>}
            {invoiceData.client_email && <p className="text-gray-600">{invoiceData.client_email}</p>}
          </div>
        </div>
        
        <div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('issueDate')}:</span>
              <span className="font-semibold">{new Date(invoiceData.issue_date).toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('dueDate')}:</span>
              <span className="font-semibold">{new Date(invoiceData.due_date).toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('paymentMethod')}:</span>
              <span className="font-semibold">{invoiceData.payment_method}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE CONCEPTOS */}
      <div className="mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2 font-semibold">{t('description')}</th>
              <th className="text-center p-2 font-semibold w-16">{t('qty')}</th>
              <th className="text-right p-2 font-semibold w-24">{t('unitPrice')}</th>
              <th className="text-right p-2 font-semibold w-16">{t('discount')}</th>
              <th className="text-right p-2 font-semibold w-16">{t('vat')}</th>
              <th className="text-right p-2 font-semibold w-24">{t('total')}</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{item.description}</td>
                <td className="text-center p-2">{item.quantity}</td>
                <td className="text-right p-2">{item.unit_price.toFixed(2)}€</td>
                <td className="text-right p-2">{item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}</td>
                <td className="text-right p-2">
                  {item.exenta_iva ? (
                    <span className="text-xs text-gray-500">{t('invoices.preview.exempt')}</span>
                  ) : (
                    `${item.iva_percent}%`
                  )}
                </td>
                <td className="text-right p-2 font-semibold">{item.total.toFixed(2)}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RESUMEN */}
      <div className="flex justify-end">
        <div className="w-80 space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">{t('taxableBase')}:</span>
            <span className="font-semibold">{invoiceData.subtotal.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">{t('totalVAT')}:</span>
            <span className="font-semibold">{invoiceData.total_iva.toFixed(2)}€</span>
          </div>
          
          {invoiceData.aplica_retencion && (
            <div className="flex justify-between py-1 text-red-600">
              <span>{t('invoices.preview.irpfRetention')} ({invoiceData.porcentaje_retencion}%):</span>
              <span className="font-semibold">-{invoiceData.total_retencion.toFixed(2)}€</span>
            </div>
          )}
          
          <Separator className="my-2" />
          
          <div className="flex justify-between py-2 text-lg font-bold bg-blue-50 px-3 rounded">
            <span>{t('totalInvoice')}:</span>
            <span className="text-blue-700">{invoiceData.total.toFixed(2)}€</span>
          </div>
        </div>
      </div>

      {/* INFORMACIÓN DE PAGO */}
      {invoiceData.emisor_iban && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-2">{t('invoices.preview.bankDetails')}:</p>
          <p className="text-sm font-mono">{invoiceData.emisor_iban}</p>
        </div>
      )}

      {/* NOTAS */}
      {invoiceData.notes && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-700 mb-1">{t('observations')}:</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoiceData.notes}</p>
        </div>
      )}

      {/* TEXTO LEGAL */}
      {invoiceData.legal_text && (
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500 whitespace-pre-wrap">{invoiceData.legal_text}</p>
        </div>
      )}

      {/* PIE */}
      <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
        <p>{invoiceData.emisor_razon_social} • {t('nifCif')}: {invoiceData.emisor_nif}</p>
        {invoiceData.emisor_actividad && <p>{invoiceData.emisor_actividad}</p>}
      </div>
    </div>
  );
}
