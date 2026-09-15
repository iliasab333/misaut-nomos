import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, AlertCircle, CheckCircle, Lightbulb, TrendingUp, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function InvoiceAIAssistant({ 
  invoice, 
  onSelectSuggestion, 
  onClose,
  showValidation = true,
  showSuggestions = true 
}) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [validation, setValidation] = useState({ errors: [], warnings: [], isValid: true });
  const [planRecommendation, setPlanRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suggestions');

  useEffect(() => {
    loadAIData();
  }, []);

  useEffect(() => {
    if (invoice && showValidation) {
      validateInvoice();
    }
  }, [invoice?.items, invoice?.client_name, invoice?.issue_date, invoice?.due_date]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      const [suggestionsRes, planRes] = await Promise.all([
        showSuggestions ? base44.functions.invoke('invoiceAIAssistant', { 
          action: 'suggestDescriptions' 
        }) : Promise.resolve({ data: { suggestions: [] } }),
        base44.functions.invoke('invoiceAIAssistant', { 
          action: 'recommendPlan' 
        })
      ]);

      if (suggestionsRes.data?.suggestions) {
        setSuggestions(suggestionsRes.data.suggestions);
      }
      if (planRes.data?.recommendation) {
        setPlanRecommendation(planRes.data.recommendation);
      }
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateInvoice = async () => {
    if (!invoice) return;
    
    try {
      const response = await base44.functions.invoke('invoiceAIAssistant', {
        action: 'validateInvoice',
        data: { invoice }
      });
      
      if (response.data) {
        setValidation(response.data);
      }
    } catch (error) {
      console.error('Error validating invoice:', error);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
          <span className="text-purple-700">{t('invoices.ai.analyzing')}</span>
        </CardContent>
      </Card>
    );
  }

  const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 relative">
      {onClose && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute top-2 right-2 h-6 w-6 text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-purple-800">
          <Sparkles className="w-5 h-5 text-purple-600" />
          {t('invoices.ai.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-purple-200 pb-2">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-t-lg transition-colors",
              activeTab === 'suggestions' 
                ? "bg-white text-purple-700 font-medium shadow-sm" 
                : "text-purple-600 hover:bg-white/50"
            )}
          >
            <Lightbulb className="w-4 h-4 inline mr-1" />
            {t('invoices.ai.suggestionsTab')}
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-t-lg transition-colors relative",
              activeTab === 'validation' 
                ? "bg-white text-purple-700 font-medium shadow-sm" 
                : "text-purple-600 hover:bg-white/50"
            )}
          >
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {t('invoices.ai.validationTab')}
            {hasIssues && (
              <span className={cn(
                "absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white",
                validation.errors.length > 0 ? "bg-red-500" : "bg-yellow-500"
              )}>
                {validation.errors.length + validation.warnings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-t-lg transition-colors",
              activeTab === 'plan' 
                ? "bg-white text-purple-700 font-medium shadow-sm" 
                : "text-purple-600 hover:bg-white/50"
            )}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            {t('invoices.ai.planTab')}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'suggestions' && (
          <div className="space-y-2">
            <p className="text-xs text-purple-600 mb-3">
              {t('invoices.ai.suggestionsIntro')}
            </p>
            
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                {t('invoices.ai.noSuggestions')}
              </p>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectSuggestion?.(suggestion)}
                    className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {suggestion.description}
                      </p>
                      {suggestion.usageCount > 0 && (
                        <p className="text-xs text-gray-500">
                          {t('invoices.ai.usedCount', { count: suggestion.usageCount })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-sm font-semibold text-purple-700">
                        {suggestion.suggestedPrice.toFixed(2)}€
                      </span>
                      <span className="text-xs text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('invoices.ai.useSuggestion')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'validation' && showValidation && (
          <div className="space-y-3">
            {validation.isValid && validation.warnings.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  {t('invoices.ai.allValid')}
                </span>
              </div>
            ) : (
              <>
                {validation.errors.map((error, idx) => (
                  <div key={`error-${idx}`} className="flex items-start gap-2 p-3 bg-red-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">{error.message}</p>
                    </div>
                  </div>
                ))}
                
                {validation.warnings.map((warning, idx) => (
                  <div key={`warning-${idx}`} className="flex items-start gap-2 p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800">{warning.message}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'plan' && planRecommendation && (
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{t('invoices.ai.yourActivity')}</h4>
                <Badge variant="outline" className="text-purple-700 border-purple-300">
                  {planRecommendation.metrics.activity}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-700">
                    {planRecommendation.metrics.invoiceCount}
                  </p>
                  <p className="text-xs text-gray-600">{t('invoices.ai.invoicesSixMonths')}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-700">
                    {planRecommendation.metrics.monthlyAverage}€
                  </p>
                  <p className="text-xs text-gray-600">{t('invoices.ai.monthlyAverage')}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-700">
                    {planRecommendation.metrics.totalRevenue}€
                  </p>
                  <p className="text-xs text-gray-600">{t('invoices.ai.totalSixMonths')}</p>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-800">{t('invoices.ai.recommendation')}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {planRecommendation.reason}
                </p>
                {planRecommendation.savings > 0 && (
                  <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-100">
                    {t('invoices.ai.potentialSavings', { amount: planRecommendation.savings })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
