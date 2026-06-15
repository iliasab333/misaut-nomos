// Plantillas de email para MisAutónomos
// Estilos base compartidos por todas las plantillas

const BASE_STYLES = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
  .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; }
  .header-success { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
  .header-warning { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); }
  .header-error { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); }
  .logo { width: 64px; height: 64px; margin: 0 auto 16px; }
  .logo img { width: 100%; height: 100%; border-radius: 12px; }
  .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px; }
  .content { padding: 40px 32px; }
  .greeting { font-size: 22px; color: #1f2937; margin-bottom: 20px; font-weight: 700; }
  .message { color: #4b5563; line-height: 1.7; font-size: 16px; margin-bottom: 24px; }
  .highlight-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }
  .success-box { background: #ecfdf5; border-left-color: #10b981; }
  .warning-box { background: #fffbeb; border-left-color: #f59e0b; }
  .error-box { background: #fef2f2; border-left-color: #ef4444; }
  .highlight-box h3 { color: #1e40af; margin: 0 0 8px 0; font-size: 18px; }
  .success-box h3 { color: #047857; }
  .warning-box h3 { color: #b45309; }
  .error-box h3 { color: #b91c1c; }
  .highlight-box p { color: #374151; margin: 4px 0; font-size: 15px; }
  .cta { text-align: center; margin: 32px 0; }
  .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
  .button-orange { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35); }
  .button-green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); }
  .features { margin: 24px 0; }
  .features li { color: #4b5563; margin-bottom: 12px; padding-left: 28px; position: relative; line-height: 1.6; }
  .features li:before { content: '✓'; position: absolute; left: 0; color: #10b981; font-weight: bold; }
  .divider { height: 1px; background: linear-gradient(to right, transparent, #e5e7eb, transparent); margin: 32px 0; }
  .footer { background: #1f2937; color: #9ca3af; padding: 32px; text-align: center; font-size: 14px; line-height: 1.7; }
  .footer-brand { color: #ffffff; display: block; margin-bottom: 4px; font-size: 18px; font-weight: 700; }
  .footer-tagline { color: #60a5fa; margin-bottom: 16px; font-style: italic; }
  .footer a { color: #60a5fa; text-decoration: none; }
  .footer-links { margin-top: 20px; padding-top: 20px; border-top: 1px solid #374151; }
  .footer-links a { margin: 0 12px; }
  .small-text { font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px; }
  .promo-section { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 24px; margin: 24px 0; border-radius: 12px; text-align: center; }
  .promo-section h4 { color: #92400e; margin: 0 0 8px 0; font-size: 16px; }
  .promo-section p { color: #78350f; margin: 0 0 16px 0; font-size: 14px; }
  @media (max-width: 600px) {
    .content { padding: 24px 20px; }
    .header { padding: 32px 16px; }
    .header h1 { font-size: 20px; }
    .button { padding: 14px 32px; font-size: 15px; }
  }
`;

// Email: necesita URL absoluta (las clientes de correo no resuelven rutas relativas).
const LOGO_URL = 'https://misautonomos.es/logo-512.png';

// Cabecera común
const emailHeader = (title, subtitle = 'Tu autónomo de confianza', headerClass = '') => `
  <div class="header ${headerClass}">
    <div class="logo">
      <img src="${LOGO_URL}" alt="MisAutónomos" />
    </div>
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>
`;

// Pie común
const emailFooter = () => `
  <div class="footer">
    <span class="footer-brand">MisAutónomos</span>
    <p class="footer-tagline">Tu autónomo de confianza</p>
    <p>
      <a href="mailto:soporte@misautonomos.es">soporte@misautonomos.es</a> · 
      <a href="https://misautonomos.es">misautonomos.es</a>
    </p>
    <div class="footer-links">
      <a href="https://misautonomos.es/HelpCenter">Centro de ayuda</a>
      <a href="https://misautonomos.es/PrivacyPolicy">Privacidad</a>
      <a href="https://misautonomos.es/TermsConditions">Términos</a>
    </div>
    <p style="margin-top: 16px; font-size: 12px; color: #6b7280;">
      © ${new Date().getFullYear()} MisAutónomos. Todos los derechos reservados.<br/>
      Si no deseas recibir estos emails, puedes <a href="https://misautonomos.es/MyProfile">gestionar tus preferencias</a>.
    </p>
  </div>
`;

// Sección de promoción para clientes (hazte autónomo)
const promoAutonomoSection = () => `
  <div class="promo-section">
    <h4>🔧 ¿Eres profesional autónomo?</h4>
    <p>Únete a MisAutónomos y empieza a recibir clientes. 7 días gratis sin compromiso.</p>
    <a href="https://misautonomos.es/PricingPlans" class="button button-orange" style="padding: 12px 28px; font-size: 14px;">
      Suscribirme como autónomo →
    </a>
  </div>
`;

// ============================================
// PLANTILLAS DE EMAIL
// ============================================

// 1. BIENVENIDA CLIENTE
export const welcomeClientEmail = (userName) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('¡Bienvenido a MisAutónomos!')}
    
    <div class="content">
      <p class="greeting">¡Hola${userName ? ` ${userName}` : ''}!</p>
      
      <div class="highlight-box success-box">
        <h3>✅ Tu cuenta está lista</h3>
        <p>Ya puedes buscar y contactar con profesionales autónomos verificados en toda España.</p>
      </div>
      
      <p class="message">
        MisAutónomos conecta a clientes como tú con los mejores profesionales autónomos. 
        Todo 100% gratis para ti.
      </p>
      
      <ul class="features">
        <li>Busca autónomos por categoría y ubicación</li>
        <li>Consulta perfiles con fotos, reseñas y valoraciones</li>
        <li>Contacta directamente por chat, teléfono o WhatsApp</li>
        <li>Guarda tus profesionales favoritos</li>
        <li>Sin comisiones ni costes ocultos</li>
      </ul>
      
      <div class="cta">
        <a href="https://misautonomos.es/Search" class="button button-green">
          Buscar autónomos ahora →
        </a>
      </div>
      
      <div class="divider"></div>
      
      ${promoAutonomoSection()}
      
      <p class="small-text">
        ¿Tienes dudas? Escríbenos a <a href="mailto:soporte@misautonomos.es">soporte@misautonomos.es</a>
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

// 2. BIENVENIDA AUTÓNOMO - INICIO PRUEBA GRATUITA (DÍA 0)
export const welcomeAutonomoTrialEmail = (userName, planName = 'Plan Profesional', trialDays = 60, monthlyPrice = 33) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('🎉 ¡Bienvenido a MisAutónomos!', 'Tu prueba gratuita ha comenzado', 'header-success')}
    
    <div class="content">
      <p class="greeting">¡Hola${userName ? ` ${userName}` : ''}!</p>
      
      <div class="highlight-box success-box">
        <h3>🎁 ${trialDays} días GRATIS sin compromiso</h3>
        <p>Tu cuenta profesional está activa. Tienes ${trialDays} días para probar todas las funcionalidades sin coste.</p>
      </div>
      
      <p class="message">
        <strong>¿Qué incluye tu prueba gratuita?</strong>
      </p>
      
      <ul class="features">
        <li>Tu perfil visible en las búsquedas de clientes</li>
        <li>Chat directo con clientes interesados</li>
        <li>Galería de fotos ilimitada</li>
        <li>Sistema de valoraciones y reseñas</li>
        <li>CRM para gestionar tus clientes</li>
        <li>Sistema de facturación integrado</li>
        <li>Soporte 24/7 vía tickets</li>
      </ul>
      
      <div class="highlight-box warning-box">
        <h3>📋 Tu siguiente paso</h3>
        <p>Completa tu perfil profesional para empezar a recibir clientes. Cuanto más completo, más visibilidad tendrás.</p>
      </div>
      
      <div class="cta">
        <a href="https://misautonomos.es/ProfileOnboarding" class="button button-orange">
          Completar mi perfil →
        </a>
      </div>
      
      <div class="divider"></div>
      
      <div class="highlight-box" style="background: #f3f4f6; border-left-color: #6b7280;">
        <h3 style="color: #374151;">💳 ¿Y después de la prueba?</h3>
        <p style="color: #4b5563;">
          Si decides continuar, la suscripción es de <strong>${monthlyPrice}€/mes</strong> (según el plan elegido).<br/>
          Puedes cancelar en cualquier momento antes de que termine la prueba sin coste alguno.
        </p>
      </div>
      
      <p class="small-text">
        ¿Necesitas ayuda? <a href="mailto:soporte@misautonomos.es">soporte@misautonomos.es</a>
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

// 3. RECORDATORIO MITAD DE PRUEBA (DÍA 30)
export const trialMidwayReminderEmail = (userName, daysLeft = 30) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('⏰ Te quedan ' + daysLeft + ' días de prueba', 'Aprovecha al máximo tu perfil', 'header-warning')}
    
    <div class="content">
      <p class="greeting">¡Hola${userName ? ` ${userName}` : ''}!</p>
      
      <p class="message">
        Llevas ya un mes en MisAutónomos. ¿Cómo va todo? Te quedan <strong>${daysLeft} días</strong> de prueba gratuita.
      </p>
      
      <div class="highlight-box warning-box">
        <h3>💡 Consejos para conseguir más clientes</h3>
        <p>Los perfiles más completos reciben hasta 3 veces más contactos.</p>
      </div>
      
      <ul class="features">
        <li><strong>Añade fotos de calidad</strong> de tus trabajos realizados</li>
        <li><strong>Completa tu descripción</strong> con tus servicios y experiencia</li>
        <li><strong>Responde rápido</strong> a los mensajes (mejora tu posición en búsquedas)</li>
        <li><strong>Pide valoraciones</strong> a clientes satisfechos</li>
        <li><strong>Mantén tu horario actualizado</strong> para que los clientes sepan cuándo contactarte</li>
      </ul>
      
      <div class="cta">
        <a href="https://misautonomos.es/MyProfile" class="button">
          Optimizar mi perfil →
        </a>
      </div>
      
      <p class="small-text">
        Si tienes dudas sobre cómo mejorar tu perfil, escríbenos a <a href="mailto:soporte@misautonomos.es">soporte@misautonomos.es</a>
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

// 4. AVISO FIN DE PRUEBA (1 DÍA ANTES)
export const trialEndingEmail = (userName, endDate, monthlyPrice = 33) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('⚠️ Tu prueba termina mañana', 'Revisa tu suscripción', 'header-warning')}
    
    <div class="content">
      <p class="greeting">¡Hola${userName ? ` ${userName}` : ''}!</p>
      
      <div class="highlight-box warning-box">
        <h3>📅 Mañana termina tu prueba gratuita</h3>
        <p>Tu periodo de prueba finaliza el <strong>${endDate}</strong>.</p>
      </div>
      
      <p class="message">
        <strong>¿Qué pasará mañana?</strong>
      </p>
      
      <ul class="features">
        <li>Se realizará el primer cobro de <strong>${monthlyPrice}€</strong> automáticamente</li>
        <li>Tu perfil seguirá visible y activo sin interrupciones</li>
        <li>Continuarás recibiendo mensajes de clientes</li>
      </ul>
      
      <p class="message">
        Si no deseas continuar, puedes cancelar ahora mismo desde tu panel sin ningún coste.
      </p>
      
      <div class="cta">
        <a href="https://misautonomos.es/SubscriptionManagement" class="button">
          Revisar mi suscripción →
        </a>
      </div>
      
      <div class="divider"></div>
      
      <p class="message" style="font-size: 14px;">
        <strong>¿Quieres seguir?</strong> No necesitas hacer nada. Tu suscripción se activará automáticamente.
      </p>
      
      <p class="small-text">
        ¿Dudas? <a href="mailto:soporte@misautonomos.es">soporte@misautonomos.es</a>
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

// 5. CONFIRMACIÓN DE PAGO / INICIO SUSCRIPCIÓN
export const paymentConfirmationEmail = (userName, planName, amount, nextRenewal) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('✅ Pago confirmado', 'Tu suscripción está activa', 'header-success')}
    
    <div class="content">
      <p class="greeting">¡Hola${userName ? ` ${userName}` : ''}!</p>
      
      <div class="highlight-box success-box">
        <h3>💳 Pago procesado correctamente</h3>
        <p>Tu suscripción a MisAutónomos está activa.</p>
      </div>
      
      <p class="message"><strong>Detalles del pago:</strong></p>
      
      <div class="highlight-box" style="background: #f9fafb; border-left-color: #d1d5db;">
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Importe:</strong> ${amount}€</p>
        <p><strong>Próxima renovación:</strong> ${nextRenewal}</p>
        <p><strong>Método de pago:</strong> Tarjeta (Stripe)</p>
      </div>
      
      <p class="message">
        Tu perfil sigue visible para los clientes. Sigue optimizándolo para recibir más contactos.
      </p>
      
      <div class="cta">
        <a href="https://misautonomos.es/ProfessionalDashboard" class="button button-green">
          Ver mi dashboard →
        </a>
      </div>
      
      <p class="small-text">
        Puedes gestionar tu suscripción en cualquier momento desde <a href="https://misautonomos.es/SubscriptionManagement">tu panel</a>.
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

// 6. PAGO FALLIDO
export const paymentFailedEmail = (userName) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('⚠️ Problema con tu pago', 'Actualiza tu método de pago', 'header-error')}
    
    <div class="content">
      <p class="greeting">Hola${userName ? ` ${userName}` : ''},</p>
      
      <div class="highlight-box error-box">
        <h3>❌ No hemos podido procesar tu pago</h3>
        <p>Hubo un problema al cobrar tu suscripción. Tu perfil puede dejar de ser visible pronto.</p>
      </div>
      
      <p class="message">
        Esto puede ocurrir por varios motivos:
      </p>
      
      <ul style="color: #4b5563; line-height: 1.7; margin-bottom: 24px; padding-left: 20px;">
        <li>Tarjeta caducada o cancelada</li>
        <li>Fondos insuficientes</li>
        <li>Bloqueo temporal del banco</li>
      </ul>
      
      <p class="message">
        <strong>Actualiza tu método de pago</strong> para mantener tu perfil activo y seguir recibiendo clientes.
      </p>
      
      <div class="cta">
        <a href="https://misautonomos.es/SubscriptionManagement" class="button" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          Actualizar método de pago →
        </a>
      </div>
      
      <p class="small-text">
        Si crees que es un error, contacta con <a href="mailto:soporte@misautonomos.es">soporte@misautonomos.es</a>
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

// 7. NUEVO MENSAJE RECIBIDO
export const newMessageEmail = (userName, senderName, messagePreview, conversationUrl) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('💬 Nuevo mensaje', 'Tienes un mensaje en MisAutónomos')}
    
    <div class="content">
      <p class="greeting">Hola${userName ? ` ${userName}` : ''},</p>
      
      <p class="message">
        <strong>${senderName}</strong> te ha enviado un mensaje:
      </p>
      
      <div class="highlight-box" style="background: #f3f4f6; border-left-color: #6b7280;">
        <p style="color: #374151; font-style: italic;">"${messagePreview.length > 150 ? messagePreview.substring(0, 150) + '...' : messagePreview}"</p>
      </div>
      
      <div class="cta">
        <a href="${conversationUrl || 'https://misautonomos.es/Messages'}" class="button">
          Ver mensaje completo →
        </a>
      </div>
      
      <p class="small-text">
        Responde rápido para mejorar tu posición en las búsquedas.
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

// 8. MENSAJE ENVIADO (CONFIRMACIÓN PARA CLIENTE)
export const messageSentConfirmationEmail = (userName, professionalName) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${emailHeader('✅ Mensaje enviado', 'Tu solicitud ha sido enviada')}
    
    <div class="content">
      <p class="greeting">Hola${userName ? ` ${userName}` : ''},</p>
      
      <div class="highlight-box success-box">
        <h3>📨 Tu mensaje ha sido enviado</h3>
        <p>Has contactado con <strong>${professionalName}</strong>. Te responderá pronto.</p>
      </div>
      
      <p class="message">
        El profesional recibirá una notificación y podrá responderte directamente por el chat de MisAutónomos.
      </p>
      
      <div class="cta">
        <a href="https://misautonomos.es/Messages" class="button button-green">
          Ver mis conversaciones →
        </a>
      </div>
      
      <div class="divider"></div>
      
      ${promoAutonomoSection()}
      
      <p class="small-text">
        ¿El profesional no responde? Prueba a contactar con otros de la plataforma.
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
`;

export default {
  welcomeClientEmail,
  welcomeAutonomoTrialEmail,
  trialMidwayReminderEmail,
  trialEndingEmail,
  paymentConfirmationEmail,
  paymentFailedEmail,
  newMessageEmail,
  messageSentConfirmationEmail
};