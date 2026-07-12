import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  X, Search, MessageSquare, User, Heart, CreditCard, MessageCircle,
  Ticket, Home, Users, FileText, Eye, LogOut, Briefcase, LayoutDashboard, HelpCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const LOGO_URL = '/logo-192.png';

export default function MobileMenu({ isOpen, onClose, user, isProfessional, unreadCount, displayName, profilePicture, onLogin, onLogout }) {
  const location = useLocation();

  if (!isOpen) return null;

  const isActive = (url) => location.pathname === url;

  const itemStyle = (url) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: 500,
    touchAction: 'manipulation',
    textDecoration: 'none',
    borderRadius: '10px',
    margin: '2px 8px',
    color: isActive(url) ? '#1d4ed8' : '#374151',
    background: isActive(url) ? '#eff6ff' : 'transparent',
    transition: 'background 0.1s',
  });

  const NavItem = ({ to, icon: Icon, label, badge }) => (
    <Link to={to} style={itemStyle(to)} onClick={onClose}>
      <Icon style={{ width: 20, height: 20, flexShrink: 0, color: isActive(to) ? '#1d4ed8' : '#6b7280' }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 7px', minWidth: 18, textAlign: 'center' }}>
          {badge}
        </span>
      )}
    </Link>
  );

  const Divider = () => <div style={{ height: 1, background: '#f3f4f6', margin: '8px 0' }} />;

  const menuContent = (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 9998,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 280,
          background: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={LOGO_URL} alt="Logo" width={36} height={36} style={{ borderRadius: 8 }} />
            <span style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>MisAutónomos</span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', touchAction: 'manipulation' }}
            aria-label="Cerrar menú"
          >
            <X style={{ width: 22, height: 22, color: '#6b7280' }} />
          </button>
        </div>

        <div style={{ flex: 1, paddingTop: 8, paddingBottom: 16 }}>

          {/* === USUARIO LOGUEADO === */}
          {user && (
            <>
              {/* Avatar + nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 16px', margin: '0 8px 4px', background: '#eff6ff', borderRadius: 12 }}>
                <Avatar style={{ width: 44, height: 44, border: '2px solid #3b82f6', flexShrink: 0, overflow: 'hidden' }}>
                  {profilePicture ? (
                    <AvatarImage src={profilePicture} alt={displayName} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  ) : (
                    <AvatarFallback style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff', fontWeight: 700, fontSize: 18 }}>
                      {displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{isProfessional ? 'Profesional' : 'Cliente'}</p>
                </div>
              </div>

              <Divider />

              {/* Nav items según tipo */}
              {isProfessional ? (
                <>
                  <NavItem to="/dashboard" icon={Home} label="Inicio" />
                  <NavItem to="/mensajes" icon={MessageSquare} label="Mensajes" badge={unreadCount} />
                  <NavItem to="/mis-clientes" icon={Users} label="Mis clientes" />
                  <NavItem to="/facturas" icon={FileText} label="Facturas" />
                  <NavItem to="/visibilidad" icon={Eye} label="Mi visibilidad" />
                  <NavItem to="/mi-perfil" icon={User} label="Mi perfil" />
                  <NavItem to="/suscripcion" icon={CreditCard} label="Mi suscripción" />
                  {user.role === 'admin' && (
                    <>
                      <Divider />
                      <NavItem to="/admin" icon={LayoutDashboard} label="Administración" />
                      <NavItem to="/admin/pagos" icon={CreditCard} label="Pagos" />
                      <NavItem to="/admin/soporte" icon={MessageCircle} label="Admin Tickets" />
                    </>
                  )}
                </>
              ) : (
                <>
                  <NavItem to="/buscar" icon={Search} label="Buscar Autónomos" />
                  <NavItem to="/mensajes" icon={MessageSquare} label="Mensajes" badge={unreadCount} />
                  <NavItem to="/favoritos" icon={Heart} label="Favoritos" />
                  <NavItem to="/mi-perfil" icon={User} label="Mi Perfil" />
                  <NavItem to="/precios" icon={CreditCard} label="Ver Planes" />
                  <NavItem to="/preguntas-frecuentes" icon={HelpCircle} label="Preguntas frecuentes" />
                  <NavItem to="/soporte" icon={MessageCircle} label="Tickets de soporte" />
                  {user.role === 'admin' && (
                    <>
                      <Divider />
                      <NavItem to="/admin" icon={LayoutDashboard} label="Administración" />
                      <NavItem to="/admin/pagos" icon={CreditCard} label="Pagos" />
                      <NavItem to="/admin/soporte" icon={MessageSquare} label="Admin Tickets" />
                    </>
                  )}
                </>
              )}

              <Divider />

              {/* Cerrar sesión */}
              <button
                onClick={() => { onClose(); onLogout(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 20px', fontSize: 15, fontWeight: 500, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', touchAction: 'manipulation', borderRadius: 10, margin: '2px 8px', width: 'calc(100% - 16px)' }}
              >
                <LogOut style={{ width: 20, height: 20, flexShrink: 0 }} />
                Cerrar sesión
              </button>
            </>
          )}

          {/* === NO LOGUEADO === */}
          {!user && (
            <>
              {/* Botones principales */}
              <div style={{ padding: '8px 16px 8px' }}>
                <Link
                  to="/buscar"
                  onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: 8, touchAction: 'manipulation' }}
                >
                  <User style={{ width: 18, height: 18 }} />
                  Soy cliente
                </Link>
                <Link
                  to="/registro?tipo=autonomo"
                  onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', touchAction: 'manipulation' }}
                >
                  <Briefcase style={{ width: 18, height: 18 }} />
                  Hazte autónomo · Gratis
                </Link>
              </div>

              <Divider />

              {/* Links */}
              <NavItem to="/buscar" icon={Search} label="Buscar autónomos" />
              <NavItem to="/" icon={Home} label="Inicio" />
              <NavItem to="/precios" icon={CreditCard} label="Ver planes" />

              <Divider />

              {/* Iniciar sesión */}
              <button
                onClick={() => { onClose(); onLogin(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: 'calc(100% - 16px)', padding: '14px 20px', fontSize: 15, fontWeight: 600, color: '#374151', background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 10, margin: '4px 8px', cursor: 'pointer', touchAction: 'manipulation' }}
              >
                <User style={{ width: 20, height: 20, color: '#6b7280' }} />
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(menuContent, document.body);
}