import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Download, Trash2, FileText, Search, Filter, Mail, CreditCard, CheckCircle, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-600"
};

export default function InvoicesList({ 
  invoices = [], 
  onView, 
  onDownload, 
  onDelete, 
  onStatusChange,
  onSendEmail,
  onCreatePaymentLink,
  onSendPaymentEmail,
  onMarkAsPaid,
  loadingActions = {}
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filtered = invoices.filter(inv => {
    const matchesSearch = !searchTerm || 
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const invDate = new Date(inv.issue_date);
      const now = new Date();
      const monthsAgo = parseInt(dateFilter);
      const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
      matchesDate = invDate >= cutoffDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusLabel = (status) => {
    const labels = {
      draft: t('draft'),
      sent: t('sent'),
      paid: t('paid'),
      overdue: t('overdue'),
      cancelled: t('cancelled')
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('invoices.list.searchPlaceholder')}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('invoices.list.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('invoices.list.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('draft')}</SelectItem>
            <SelectItem value="sent">{t('sent')}</SelectItem>
            <SelectItem value="paid">{t('paid')}</SelectItem>
            <SelectItem value="overdue">{t('overdue')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('invoices.period.allTime')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('invoices.period.allTime')}</SelectItem>
            <SelectItem value="1">{t('invoices.period.lastMonth')}</SelectItem>
            <SelectItem value="3">{t('invoices.period.lastThreeMonths')}</SelectItem>
            <SelectItem value="6">{t('invoices.period.lastSixMonths')}</SelectItem>
            <SelectItem value="12">{t('invoices.period.lastYear')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('invoices.list.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                      <Badge className={statusColors[invoice.status]}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{invoice.client_name}</p>
                    <div className="flex gap-4 text-xs text-gray-500 mt-1">
                      <span>{new Date(invoice.issue_date).toLocaleDateString('es-ES')}</span>
                      <span className="font-semibold text-gray-900">{invoice.total?.toFixed(2)}€</span>
                      {invoice.payment_link && (
                        <span className="text-purple-600 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {t('invoices.list.stripeLinkBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {/* Enviar por email */}
                    {invoice.status !== 'paid' && invoice.client_email && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onSendEmail(invoice)}
                        disabled={loadingActions[`email_${invoice.id}`]}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                        title={t('invoices.list.sendEmailTitle')}
                      >
                        {loadingActions[`email_${invoice.id}`] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        <span className="hidden md:inline ml-1 text-xs">{t('emailField')}</span>
                      </Button>
                    )}
                    
                    {/* Crear link de pago Stripe */}
                    {invoice.status !== 'paid' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onCreatePaymentLink(invoice)}
                        disabled={loadingActions[`stripe_${invoice.id}`]}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-8 px-2"
                        title={invoice.payment_link ? t('invoices.list.viewPaymentLinkTitle') : t('invoices.list.createPaymentLinkTitle')}
                      >
                        {loadingActions[`stripe_${invoice.id}`] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        <span className="hidden md:inline ml-1 text-xs">
                          {invoice.payment_link ? t('invoices.list.linkButton') : t('invoices.list.stripeButton')}
                        </span>
                      </Button>
                    )}
                    
                    {/* Enviar link de pago por email */}
                    {invoice.status !== 'paid' && invoice.payment_link && invoice.client_email && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onSendPaymentEmail(invoice)}
                        disabled={loadingActions[`payemail_${invoice.id}`]}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                        title={t('invoices.list.sendPaymentLinkTitle')}
                      >
                        {loadingActions[`payemail_${invoice.id}`] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            <CreditCard className="w-3 h-3 -ml-1" />
                          </>
                        )}
                        <span className="hidden md:inline ml-1 text-xs">{t('invoices.list.chargeButton')}</span>
                      </Button>
                    )}
                    
                    {/* Marcar como pagada */}
                    {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onMarkAsPaid(invoice)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                        title={t('invoices.list.markAsPaidTitle')}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden md:inline ml-1 text-xs">{t('paid')}</span>
                      </Button>
                    )}
                    
                    {/* Cambiar estado (borrador → emitida) */}
                    {invoice.status === 'draft' && (
                      <Select
                        value={invoice.status}
                        onValueChange={(value) => onStatusChange(invoice.id, value)}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{t('draft')}</SelectItem>
                          <SelectItem value="sent">{t('markAsSent')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button variant="ghost" size="icon" onClick={() => onView(invoice)} title={t('view')} className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onDownload(invoice)} 
                      disabled={loadingActions[`pdf_${invoice.id}`]}
                      title={t('downloadPDF')} 
                      className="h-8 w-8"
                    >
                      {loadingActions[`pdf_${invoice.id}`] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    {invoice.status === 'draft' && (
                      <Button variant="ghost" size="icon" onClick={() => onDelete(invoice.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8" title={t('delete')}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
