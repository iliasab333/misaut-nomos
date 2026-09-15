import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AIAssistantPro({ type, context, onApply }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [copied, setCopied] = useState(false);
  const [userInput, setUserInput] = useState("");

  const generateSuggestion = async () => {
    setLoading(true);
    try {
      let prompt = "";
      
      if (type === "message") {
        prompt = `Eres un asistente profesional que ayuda a autónomos a responder mensajes de clientes.

Contexto:
- Cliente: ${context.clientName || "Cliente"}
- Mensaje del cliente: "${context.clientMessage}"
- Profesional: ${context.professionalName}
- Servicio: ${context.service || "Servicios generales"}

Genera una respuesta profesional, amable y útil. Debe ser:
- Cordial y cercana
- Clara y específica
- Orientada a la acción (pedir más detalles, ofrecer disponibilidad, etc.)
- Máximo 150 palabras

Respuesta:`;
      } else if (type === "description") {
        prompt = `Eres un experto en copywriting para autónomos y pequeñas empresas.

Información del profesional:
- Categoría: ${context.category || "Servicio profesional"}
- Palabras clave: ${userInput || context.keywords || "profesional, calidad, experiencia"}
- Años de experiencia: ${context.experience || "varios"}
- Zona: ${context.location || "tu zona"}

Genera una descripción atractiva y profesional de 80-150 palabras que:
- Destaque la experiencia y profesionalidad
- Sea específica sobre los servicios
- Genere confianza
- Incluya un llamado a la acción sutil

Descripción:`;
      } else if (type === "pricing") {
        prompt = `Eres un consultor de precios para autónomos profesionales.

Información:
- Servicio: ${context.service}
- Categoría: ${context.category}
- Ubicación: ${context.location}
- Experiencia: ${context.experience || "media"} años
${userInput ? `- Detalles adicionales: ${userInput}` : ""}

Basándote en el mercado español, sugiere un rango de precios razonable y competitivo.
Incluye:
1. Precio por hora (si aplica)
2. Precio por proyecto/servicio típico
3. Breve justificación

Formato:
- Precio por hora: [rango]€/h
- Proyecto tipo: [rango]€
- Justificación: [1-2 líneas]

Sugerencia:`;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setSuggestion(response);
    } catch (error) {
      toast.error(t('assistant.pro.generateError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    toast.success(t('assistant.pro.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const getTitle = () => {
    switch (type) {
      case "message": return t('assistant.pro.titleMessage');
      case "description": return t('assistant.pro.titleDescription');
      case "pricing": return t('assistant.pro.titlePricing');
      default: return t('assistant.pro.titleDefault');
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case "description": return t('assistant.pro.placeholderDescription');
      case "pricing": return t('assistant.pro.placeholderPricing');
      default: return "";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(type === "description" || type === "pricing") && (
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={getPlaceholder()}
            className="text-sm h-20"
          />
        )}

        <Button
          onClick={generateSuggestion}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('assistant.pro.generating')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('assistant.pro.generate')}
            </>
          )}
        </Button>

        {suggestion && (
          <div className="bg-white rounded-lg p-4 border border-purple-200 space-y-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion}</p>
            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-2 text-green-600" />
                    {t('assistant.pro.copiedShort')}
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-2" />
                    {t('assistant.pro.copy')}
                  </>
                )}
              </Button>
              {onApply && (
                <Button
                  onClick={() => onApply(suggestion)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  {t('assistant.pro.useSuggestion')}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}