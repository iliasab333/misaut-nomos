import React, { useState, useEffect } from "react";
import i18n from '@/i18n';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import SEOHead from "../components/seo/SEOHead";

export default function ClientOnboardingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    acepta_terminos: false,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoadingUser(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.user_type === "client") {
          navigate(createPageUrl("Search"));
          return;
        }
        if (currentUser.user_type === "professionnel") {
          navigate(createPageUrl("MyProfile"));
          return;
        }
        // Usuario autenticado sin tipo → pre-rellenar y completar directamente
        setFormData(prev => ({
          ...prev,
          nombre: currentUser.full_name || "",
          email: currentUser.email || "",
        }));
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe({
        user_type: "client",
        full_name: data.nombre,
      });

      // Email de bienvenida (no bloqueante)
      base44.integrations.Core.SendEmail({
        to: data.email,
        subject: "¡Bienvenido a MisAutónomos!",
        body: `<p>Hola ${data.nombre}, tu cuenta ha sido creada. ¡Ya puedes buscar profesionales!</p>`,
        from_name: "MisAutónomos"
      }).catch(() => {});

      // Auto-suscribir a newsletter (fire-and-forget)
      autoSubscribeNewsletter({ email: data.email, name: data.nombre, user_type: "client" }).catch(() => {});

      return data;
    },
    onSuccess: () => {
      toast.success("¡Bienvenido! Ya puedes contactar autónomos 🎉");
      navigate(createPageUrl("Search"));
    },
    onError: (error) => {
      setFieldErrors({ general: "Error al crear la cuenta: " + error.message });
    }
  });

  // Auto-suscripción a newsletter tras registro
  const autoSubscribeNewsletter = async (userData) => {
    try {
      const { NewsletterSubscriber } = await import('@/api/entities');
      const email = userData.email.toLowerCase().trim();
      
      // Comprobar si ya está suscrito
      const existing = await NewsletterSubscriber.filter({ email }).limit(1);
      
      if (existing.length > 0) {
        // Si estaba dado de baja, reactivar
        if (existing[0].status === 'unsubscribed') {
          await NewsletterSubscriber.update(existing[0].id, {
            status: 'confirmed',
            unsubscribed_at: null,
            confirmed_at: new Date().toISOString(),
            source: 'auto_signup',
            name: userData.name || existing[0].name
          });
        }
        return;
      }
      
      // Crear suscripción automática
      const unsubToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await NewsletterSubscriber.create({
        email: email,
        name: userData.name || '',
        status: 'confirmed',
        language: i18n.language?.split('-')[0] || 'es',
        source: 'auto_signup',
        user_type_interest: userData.user_type === 'professionnel' ? 'autonomo' : userData.user_type === 'client' ? 'cliente' : 'ambos',
        confirmation_token: Math.random().toString(36).substring(2),
        unsubscribe_token: unsubToken,
        confirmed_at: new Date().toISOString(),
        tags: ['auto_signup']
      });
    } catch (err) {
      console.error('Auto newsletter subscribe failed:', err);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.nombre.trim() || formData.nombre.trim().length < 2) {
      errors.nombre = "Introduce tu nombre";
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email no válido";
    }
    if (!user && formData.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres";
    }
    if (!formData.acepta_terminos) {
      errors.terminos = "Debes aceptar los términos";
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!user) {
      // Sin sesión → redirigir a login/registro
      localStorage.setItem('client_onboarding_pending', JSON.stringify({ nombre: formData.nombre }));
      base44.auth.redirectToLogin(createPageUrl("ClientOnboarding"));
      return;
    }

    completeOnboardingMutation.mutate(formData);
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Crea tu cuenta gratis - MisAutónomos"
        description="Encuentra y contacta autónomos en segundos. Registro gratuito."
        keywords="crear cuenta cliente, buscar autónomos, servicios profesionales España"
        noindex={true}
      />

      {/* Fondo minimalista: blanco, sin sombras dobles, sin gradient. */}
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          {/* Header sin iconos decorativos */}
          <div className="text-center mb-8">
            <h1
              className="font-semibold tracking-tight"
              style={{ color: '#00255C', fontSize: '24px', letterSpacing: '-0.02em', margin: 0 }}
            >
              Crea tu cuenta
            </h1>
            <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '6px' }}>
              Contacta con autónomos verificados en segundos.
            </p>
          </div>

          {/* Error general */}
          {fieldErrors.general && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ color: '#DC2626', fontSize: '13px', margin: 0 }}>{fieldErrors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Nombre */}
            <div>
              <label style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                Nombre
              </label>
              <Input
                type="text"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value });
                  if (fieldErrors.nombre) setFieldErrors(prev => ({ ...prev, nombre: null }));
                }}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                style={{
                  background: '#FFFFFF',
                  border: fieldErrors.nombre ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '16px',
                  color: '#1F2937',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors.nombre && (
                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{fieldErrors.nombre}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                Email
              </label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }));
                }}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                disabled={!!user}
                style={{
                  background: user ? '#F9FAFB' : '#FFFFFF',
                  border: fieldErrors.email ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '16px',
                  color: '#1F2937',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors.email && (
                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{fieldErrors.email}</p>
              )}
            </div>

            {/* Contraseña (solo si no está logueado) */}
            {!user && (
              <div>
                <label style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null }));
                    }}
                    autoComplete="new-password"
                    enterKeyHint="go"
                    style={{
                      background: '#FFFFFF',
                      border: fieldErrors.password ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                      borderRadius: '10px',
                      padding: '12px 44px 12px 14px',
                      fontSize: '16px',
                      color: '#1F2937',
                      width: '100%',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px',
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{fieldErrors.password}</p>
                )}
              </div>
            )}

            {/* Términos */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <input
                type="checkbox"
                id="acepta_terminos_client"
                checked={formData.acepta_terminos}
                onChange={(e) => {
                  setFormData({ ...formData, acepta_terminos: e.target.checked });
                  if (fieldErrors.terminos) setFieldErrors(prev => ({ ...prev, terminos: null }));
                }}
                style={{ width: '16px', height: '16px', marginTop: '2px', flexShrink: 0, accentColor: '#2563EB' }}
              />
              <label htmlFor="acepta_terminos_client" style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5', cursor: 'pointer' }}>
                Acepto los{' '}
                <Link to="/terminos" target="_blank" style={{ color: '#2563EB', textDecoration: 'underline' }}>Términos</Link>
                {' '}y la{' '}
                <Link to="/privacidad" target="_blank" style={{ color: '#2563EB', textDecoration: 'underline' }}>Política de Privacidad</Link>
              </label>
            </div>
            {fieldErrors.terminos && (
              <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '-8px' }}>{fieldErrors.terminos}</p>
            )}
            
            {/* Microcopy newsletter */}
            <p style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', marginTop: '12px', lineHeight: '1.4' }}>
              Al crear tu cuenta aceptarás recibir nuestra newsletter (1-2 emails al mes). 
              Puedes darte de baja en cualquier momento.
            </p>

            {/* Botón principal */}
            <Button
              type="submit"
              disabled={completeOnboardingMutation.isPending}
              style={{
                width: '100%',
                height: '48px',
                background: '#00255C',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              {completeOnboardingMutation.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creando cuenta...</>
              ) : (
                'Crear cuenta'
              )}
            </Button>
          </form>

          {/* Link a login */}
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6B7280' }}>
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => base44.auth.redirectToLogin(createPageUrl("Search"))}
              style={{ color: '#00255C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
