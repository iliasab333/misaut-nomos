import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { IconSearch, IconSpinner } from "@/components/Icons";
import { base44 } from "@/api/base44Client";

export default function SearchAutocomplete({ value, onChange, onSelect }) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const profiles = await base44.entities.ProfessionalProfile.filter({
          visible_en_busqueda: true,
          onboarding_completed: true
        });

        const matches = profiles
          .filter(p => 
            p.business_name?.toLowerCase().includes(value.toLowerCase()) ||
            p.descripcion_corta?.toLowerCase().includes(value.toLowerCase()) ||
            p.categories?.some(cat => cat.toLowerCase().includes(value.toLowerCase()))
          )
          .slice(0, 5)
          .map(p => ({
            text: p.business_name,
            type: 'professional',
            data: p
          }));

        // Agregar categorías únicas
        const categoryMatches = profiles
          .flatMap(p => p.categories || [])
          .filter((cat, idx, arr) => arr.indexOf(cat) === idx)
          .filter(cat => cat.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 3)
          .map(cat => ({
            text: cat,
            type: 'category',
            data: cat
          }));

        setSuggestions([...matches, ...categoryMatches]);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (suggestion) => {
    if (suggestion.type === 'professional') {
      onSelect(suggestion.data);
    } else {
      onChange(suggestion.text);
    }
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative flex items-center">
        <IconSearch className="absolute left-3 w-4 h-4 text-c-muted pointer-events-none z-10" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => value && setShowSuggestions(true)}
          placeholder={t('searchPlaceholder')}
          className="input pl-10 border-2 border-c-border w-full"
        />
        {loading && (
          <IconSpinner className="absolute right-3 w-4 h-4 text-c-muted animate-spin" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-c-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(suggestion)}
              className="p-3 hover:bg-c-accent/5 cursor-pointer border-b border-c-border last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-2">
                {suggestion.type === 'professional' ? (
                  <>
                    <div className="w-8 h-8 bg-c-accent/10 rounded-full flex items-center justify-center text-c-accent font-semibold text-xs">
                      {suggestion.text.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{suggestion.text}</p>
                      {suggestion.data.categories?.[0] && (
                        <p className="text-xs text-c-muted">{suggestion.data.categories[0]}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <IconSearch className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-sm text-ink">{suggestion.text}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}