import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, XCircle, Clock, Euro, Calendar, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function QuoteRequest({ quote, isProfessional, isClient, onRespond, onStatusChange }) {
  const { t } = useTranslation();
  const [responding, setResponding] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [breakdown, setBreakdown] = useState([{ concept: "", amount: "" }]);

  const statusConfig = {
    pending: { icon: Clock, color: "bg-yellow-100 text-yellow-800", label: t('quotes.status.pending') },
    accepted: { icon: CheckCircle, color: "bg-green-100 text-green-800", label: t('quotes.status.accepted') },
    rejected: { icon: XCircle, color: "bg-red-100 text-red-800", label: t('quotes.status.rejected') },
    completed: { icon: CheckCircle, color: "bg-blue-100 text-blue-800", label: t('quotes.status.completed') }
  };

  const status = statusConfig[quote.status || "pending"];
  const StatusIcon = status.icon;

  const addBreakdownItem = () => {
    setBreakdown([...breakdown, { concept: "", amount: "" }]);
  };

  const removeBreakdownItem = (index) => {
    setBreakdown(breakdown.filter((_, i) => i !== index));
  };

  const updateBreakdownItem = (index, field, value) => {
    const updated = [...breakdown];
    updated[index][field] = value;
    setBreakdown(updated);
  };

  const calculateTotal = () => {
    return breakdown.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const handleSendQuote = () => {
    const validBreakdown = breakdown.filter(item => item.concept && item.amount);
    const total = calculateTotal();
    
    onRespond({ 
      status: "pending", 
      quote_amount: total,
      quote_notes: quoteNotes,
      estimated_days: estimatedDays ? parseInt(estimatedDays) : undefined,
      breakdown: validBreakdown.length > 0 ? validBreakdown : undefined,
      professional_responded: true
    });
    setResponding(false);
  };

  const handleClientAction = (status) => {
    if (onStatusChange) {
      onStatusChange({ status });
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">{t('quotes.chat.requestTitle')}</CardTitle>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">{t('description')}</p>
          <p className="text-sm text-gray-600">{quote.description}</p>
        </div>

        {quote.budget && (
          <div className="flex items-center gap-2 text-sm">
            <Euro className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{t('quotes.fields.estimatedBudget')}</span>
            <span className="font-semibold text-gray-900">{quote.budget}€</span>
          </div>
        )}

        {quote.deadline && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{t('quotes.chat.deadline')}</span>
            <span className="font-semibold text-gray-900">{format(new Date(quote.deadline), 'dd/MM/yyyy')}</span>
          </div>
        )}

        {quote.professional_responded && quote.quote_amount && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-blue-900">{t('quotes.chat.professionalQuote')}</p>
              <p className="text-2xl font-bold text-blue-900">{quote.quote_amount}€</p>
            </div>

            {quote.breakdown && quote.breakdown.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs font-semibold text-blue-700 uppercase">{t('quotes.chat.costBreakdown')}</p>
                {quote.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm bg-white/60 p-2 rounded">
                    <span className="text-gray-700">{item.concept}</span>
                    <span className="font-semibold text-gray-900">{item.amount}€</span>
                  </div>
                ))}
              </div>
            )}

            {quote.estimated_days && (
              <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
                <Clock className="w-4 h-4" />
                <span>{t('quotes.chat.estimatedTime')} <strong>{t('quotes.fields.daysCount', { count: Number(quote.estimated_days) })}</strong></span>
              </div>
            )}

            {quote.quote_notes && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-xs font-semibold text-blue-700 mb-1">{t('quotes.chat.terms')}</p>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{quote.quote_notes}</p>
              </div>
            )}
          </div>
        )}

        {isProfessional && !quote.professional_responded && !responding && (
          <Button 
            onClick={() => setResponding(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {t('quotes.chat.sendDetailedQuote')}
          </Button>
        )}

        {isProfessional && responding && (
          <div className="space-y-4 pt-3 border-t">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t('quotes.chat.costBreakdown')}
              </label>
              <div className="space-y-2">
                {breakdown.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={t('quotes.chat.conceptPlaceholder')}
                      value={item.concept}
                      onChange={(e) => updateBreakdownItem(index, "concept", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="€"
                      value={item.amount}
                      onChange={(e) => updateBreakdownItem(index, "amount", e.target.value)}
                      className="w-24"
                    />
                    {breakdown.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBreakdownItem(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addBreakdownItem}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('quotes.chat.addConcept')}
                </Button>
                {breakdown.some(item => item.amount) && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-semibold text-blue-900">{t('quotes.chat.total')}</span>
                    <span className="text-xl font-bold text-blue-900">{calculateTotal()}€</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {t('quotes.chat.estimatedDaysLabel')}
              </label>
              <Input
                type="number"
                placeholder={t('quotes.chat.estimatedDaysPlaceholder')}
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {t('quotes.chat.terms')}
              </label>
              <Textarea
                placeholder={t('quotes.chat.termsPlaceholder')}
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSendQuote}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={breakdown.every(item => !item.concept || !item.amount)}
              >
                {t('quotes.actions.sendQuote')}
              </Button>
              <Button 
                onClick={() => setResponding(false)}
                variant="outline"
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {isClient && quote.professional_responded && quote.status === "pending" && (
          <div className="flex gap-2 pt-3 border-t">
            <Button 
              onClick={() => handleClientAction("accepted")}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t('quotes.actions.acceptQuote')}
            </Button>
            <Button 
              onClick={() => handleClientAction("rejected")}
              variant="outline"
              className="flex-1 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" />
              {t('common.reject')}
            </Button>
          </div>
        )}

        {isClient && quote.status === "accepted" && (
          <Button 
            onClick={() => handleClientAction("completed")}
            className="w-full bg-blue-600 hover:bg-blue-700 mt-3"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {t('quotes.chat.markCompleted')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}