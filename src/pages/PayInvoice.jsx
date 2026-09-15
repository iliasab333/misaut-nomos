import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Calendar, Euro, Loader2, CreditCard, Shield, Lock, Building, User } from "lucide-react";
import { toast } from "sonner";
import { useTranslation, Trans } from "react-i18next";
import SEOHead from "../components/seo/SEOHead";

export default function PayInvoicePage() {
  const { t } = useTranslation();
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get("invoice");
  const success = urlParams.get("success");
  const canceled = urlParams.get("canceled");
  const [processing, setProcessing] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['publicInvoice', invoiceId],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.filter({ id: invoiceId });
      return invoices[0] || null;
    },
    enabled: !!invoiceId,
  });

  useEffect(() => {
    if (success) {
      toast.success(t('payments.portal.paymentCompleted'));
    }
    if (canceled) {
      toast.error(t('payments.portal.paymentCanceled'));
    }
  }, [success, canceled]);

  const handlePayNow = async () => {
    setProcessing(true);
    try {
      const response = await base44.functions.invoke('createInvoicePayment', {
        invoiceId: invoiceId,
        publicAccess: true
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(t('payments.portal.paymentError'));
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('payments.portal.notFoundTitle')}</h2>
          <p className="text-gray-600">{t('payments.portal.notFoundDescription')}</p>
        </Card>
      </div>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <>
        <SEOHead 
          title={t('payments.portal.paidSeoTitle')}
          description={t('payments.portal.paidSeoDescription')}
          noindex={true}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('payments.portal.alreadyPaidTitle')}</h2>
            <p className="text-gray-600 mb-4">{t('payments.portal.alreadyPaidDescription')}</p>
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <p className="text-sm text-gray-600">{t('payments.portal.paymentDateLabel')}</p>
              <p className="font-semibold">{new Date(invoice.payment_date).toLocaleDateString('es-ES')}</p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();

  return (
    <>
      <SEOHead 
        title={t('payments.portal.seoTitle', { number: invoice.invoice_number })}
        description={t('payments.portal.seoDescription')}
        noindex={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header con info del emisor */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('payments.portal.title')}</h1>
            <p className="text-gray-600">{t('payments.portal.subtitle')}</p>
          </div>

          {/* Información del emisor */}
          {(invoice.emisor_razon_social || invoice.emisor_nif) && (
            <Card className="mb-4 border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{invoice.emisor_razon_social}</p>
                    <p className="text-sm text-gray-500">{t('payments.portal.issuerNif', { nif: invoice.emisor_nif })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('payments.portal.invoiceHeading', { number: invoice.invoice_number })}</h2>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{invoice.client_name}</span>
                    </div>
                  </div>
                </div>
                <Badge className={`${
                  invoice.status === 'overdue' || isOverdue ? 'bg-red-500' :
                  invoice.status === 'sent' ? 'bg-amber-500' :
                  'bg-blue-500'
                } text-white`}>
                  {invoice.status === 'overdue' || isOverdue ? t('payments.portal.status.overdue') :
                   invoice.status === 'sent' ? t('payments.portal.status.pending') :
                   invoice.status === 'draft' ? t('draft') : invoice.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('payments.portal.issueDate')}</label>
                  <p className="font-semibold text-sm">
                    {new Date(invoice.issue_date).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('payments.portal.dueDate')}</label>
                  <p className={`font-semibold text-sm ${isOverdue ? 'text-red-600' : ''}`}>
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('es-ES') : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('payments.portal.subtotal')}</label>
                  <p className="font-semibold text-sm">{invoice.subtotal?.toFixed(2) || '0.00'}€</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('payments.portal.vat')}</label>
                  <p className="font-semibold text-sm">{invoice.total_iva?.toFixed(2) || '0.00'}€</p>
                </div>
              </div>

              {invoice.items && invoice.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">{t('payments.portal.itemsTitle')}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('description')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 hidden md:table-cell">{t('qty')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 hidden md:table-cell">{t('payments.portal.price')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{t('total')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {invoice.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm">
                              {item.description}
                              <span className="md:hidden text-gray-500 block text-xs">
                                {item.quantity} x {item.unit_price?.toFixed(2)}€
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right hidden md:table-cell">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right hidden md:table-cell">{item.unit_price?.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">{item.total?.toFixed(2)}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total destacado */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6 text-center">
                <p className="text-blue-100 text-sm mb-1">{t('payments.portal.totalDue')}</p>
                <p className="text-4xl font-bold">{invoice.total?.toFixed(2)}€</p>
              </div>

              {invoice.notes && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-semibold mb-1">{t('payments.portal.notesLabel')}</p>
                  <p className="text-sm text-amber-700">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botón de pago */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t('payments.portal.securePaymentTitle')}</h2>
                <p className="text-gray-600">
                  {t('payments.portal.securePaymentDescription')}
                </p>
              </div>

              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg h-14 font-semibold shadow-lg"
                onClick={handlePayNow}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('payments.portal.connecting')}
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    {t('payments.portal.payNow', { amount: invoice.total?.toFixed(2) })}
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>{t('payments.portal.secureBadge')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span>{t('payments.portal.sslBadge')}</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  <Trans
                    i18nKey="payments.portal.processedBy"
                    components={{ brand: <span className="font-semibold" /> }}
                  />
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info adicional */}
          <p className="text-center text-xs text-gray-500 mt-6">
            {t('payments.portal.confirmationEmailNote')}<br/>
            {t('payments.portal.problemsContact', { contact: invoice.emisor_email || t('payments.portal.issuerFallback') })}
          </p>
        </div>
      </div>
    </>
  );
}
