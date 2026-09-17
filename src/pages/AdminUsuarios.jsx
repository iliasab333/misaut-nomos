import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconSearch, IconShield, IconStar, IconToggleOff, IconToggleOn,
  IconChevronLeft, IconChevronRight, IconUsers, IconBriefcase,
} from '@/components/Icons';
import { EmptyState } from '@/components/ListStates';
import { toast } from '@/lib/toast';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';

const PAGE_SIZE = 25;

function classNames(...xs) { return xs.filter(Boolean).join(' '); }

function Th({ children, sortKey, sort, setSort, align = 'left' }) {
  // Sin sortKey la columna no participa en el orden (Rol, Tipo, Acciones…).
  // OJO: comprobar AMBOS antes de tocar sort.dir: si los dos son undefined,
  // `sort?.key === sortKey` da true porque undefined === undefined, y caería
  // en `sort.dir` → crash (TypeError: undefined is not an object).
  const sortable = !!sortKey;
  const indicator = sortable && sort && sort.key === sortKey
    ? (sort.dir === 'asc' ? '▲' : '▼')
    : '';
  return (
    <th
      className={`text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} ${sortable ? 'cursor-pointer hover:text-ink' : ''}`}
      onClick={sortable && setSort
        ? () => setSort((s) => {
            const wasAsc = s && s.key === sortKey && s.dir === 'asc';
            return { key: sortKey, dir: wasAsc ? 'desc' : 'asc' };
          })
        : undefined}
    >
      {children} {indicator && <span className="ml-1 text-c-muted">{indicator}</span>}
    </th>
  );
}

function Pagination({ page, total, perPage, onPage }) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="flex items-center justify-between text-xs text-c-muted px-3 py-3">
      <span>{t('admin.users.pagination.results', { total: total.toLocaleString('es-ES') })}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-c-border disabled:opacity-50 hover:bg-soft"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label={t('admin.users.pagination.page', { page: page - 1, pages })}
        ><IconChevronLeft className="w-4 h-4" /></button>
        <span>{t('admin.users.pagination.page', { page, pages })}</span>
        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-c-border disabled:opacity-50 hover:bg-soft"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label={t('admin.users.pagination.page', { page: page + 1, pages })}
        ><IconChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function UsersTable() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin:users:list'],
    queryFn: () => base44.entities.User.list('-created_date', 5000),
    staleTime: 60_000,
  });

  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [userType, setUserType] = useState('all');
  const [sort, setSort] = useState({ key: 'created_date', dir: 'desc' });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let arr = users;
    if (role !== 'all') arr = arr.filter(u => (u.role || 'user') === role);
    if (userType !== 'all') arr = arr.filter(u => (u.user_type || '') === userType);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(u =>
        (u.email || '').toLowerCase().includes(needle) ||
        (u.full_name || '').toLowerCase().includes(needle)
      );
    }
    const sortKey = sort?.key || 'created_date';
    const dir = sort?.dir === 'asc' ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? dir : -dir;
    });
    return arr;
  }, [users, q, role, userType, sort]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const toggleDisabled = async (u) => {
    try {
      await base44.entities.User.update(u.id, { disabled: !u.disabled });
      toast.success(u.disabled ? t('admin.users.userEnabled') : t('admin.users.userDisabled'));
      qc.invalidateQueries({ queryKey: ['admin:users:list'] });
    } catch (e) { toast.error(t('admin.users.errorWithMessage', { message: e.message || e })); }
  };

  return (
    <div className="card rounded-2xl">
      <div className="p-4 border-b border-c-border flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-c-muted pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={t('admin.users.searchPlaceholder')}
            className="input pl-9 text-sm"
          />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="select w-auto text-sm">
          <option value="all">{t('admin.users.filters.allRoles')}</option>
          <option value="admin">{t('admin.users.filters.roleAdmin')}</option>
          <option value="user">{t('admin.users.filters.roleUser')}</option>
        </select>
        <select value={userType} onChange={(e) => { setUserType(e.target.value); setPage(1); }} className="select w-auto text-sm">
          <option value="all">{t('admin.users.filters.allTypes')}</option>
          <option value="professionnel">{t('professionalLabel')}</option>
          <option value="client">{t('clientLabel')}</option>
          <option value="">{t('admin.users.filters.typeNone')}</option>
        </select>
        <span className="ml-auto text-xs text-c-muted">
          {isLoading
            ? t('admin.users.loading')
            : t('admin.users.shownOfTotal', { shown: filtered.length.toLocaleString('es-ES'), total: users.length.toLocaleString('es-ES') })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft">
            <tr>
              <Th sortKey="full_name" sort={sort} setSort={setSort}>{t('auth.name')}</Th>
              <Th sortKey="email" sort={sort} setSort={setSort}>{t('auth.email')}</Th>
              <Th>{t('admin.users.table.role')}</Th>
              <Th>{t('admin.users.table.type')}</Th>
              <Th sortKey="created_date" sort={sort} setSort={setSort}>{t('admin.users.table.signup')}</Th>
              <Th align="right">{t('admin.users.table.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {paged.map((u) => (
              <tr key={u.id} className="border-t border-c-border hover:bg-soft">
                <td className="px-3 py-2 text-ink">{u.full_name || <span className="text-c-muted">—</span>}</td>
                <td className="px-3 py-2 text-ink font-mono text-[12px]">{u.email}</td>
                <td className="px-3 py-2">
                  <span className={classNames('text-[11px] uppercase tracking-[0.06em]', u.role === 'admin' ? 'badge-warning' : 'badge-muted')}>
                    {u.role || 'user'}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink">{u.user_type || <span className="text-c-muted">—</span>}</td>
                <td className="px-3 py-2 text-c-muted text-[12px]">
                  {u.created_date ? new Date(u.created_date).toLocaleDateString('es-ES') : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => toggleDisabled(u)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink hover:text-ink"
                    title={u.disabled ? t('admin.users.actions.enable') : t('admin.users.actions.disable')}
                  >
                    {u.disabled ? <IconToggleOff className="w-4 h-4 text-error" /> : <IconToggleOn className="w-4 h-4 text-success" />}
                    {u.disabled ? t('admin.users.status.disabled') : t('admin.users.status.active')}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && paged.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8"><EmptyState className="border-0 shadow-none" title={t('admin.users.emptyState')} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} perPage={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

function ProsTable() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin:profiles:list'],
    queryFn: () => base44.entities.ProfessionalProfile.list('-created_date', 5000),
    staleTime: 60_000,
  });

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('all');
  const [verified, setVerified] = useState('all');
  const [ciudad, setCiudad] = useState('all');
  const [categoria, setCategoria] = useState('all');
  const [sort, setSort] = useState({ key: 'created_date', dir: 'desc' });
  const [page, setPage] = useState(1);

  const cities = useMemo(() => {
    const set = new Set();
    profiles.forEach(p => { if (p.ciudad) set.add(p.ciudad); });
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [profiles]);
  const categories = useMemo(() => {
    const set = new Set();
    profiles.forEach(p => (p.categories || []).forEach(c => c && set.add(c)));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [profiles]);

  const filtered = useMemo(() => {
    let arr = profiles;
    if (estado === 'activo') arr = arr.filter(p => p.visible_en_busqueda && p.onboarding_completed);
    if (estado === 'inactivo') arr = arr.filter(p => !p.visible_en_busqueda || !p.onboarding_completed);
    if (verified === 'si') arr = arr.filter(p => p.identity_verified === true);
    if (verified === 'no') arr = arr.filter(p => p.identity_verified !== true);
    if (ciudad !== 'all') arr = arr.filter(p => p.ciudad === ciudad);
    if (categoria !== 'all') arr = arr.filter(p => (p.categories || []).includes(categoria));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(p => (p.business_name || '').toLowerCase().includes(needle));
    }
    const sortKey = sort?.key || 'created_date';
    const dir = sort?.dir === 'asc' ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av === bv) return 0;
      if (av == null) return 1; if (bv == null) return -1;
      return av > bv ? dir : -dir;
    });
    return arr;
  }, [profiles, q, estado, verified, ciudad, categoria, sort]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const toggleVisible = async (p) => {
    try {
      await base44.entities.ProfessionalProfile.update(p.id, { visible_en_busqueda: !p.visible_en_busqueda });
      toast.success(p.visible_en_busqueda ? t('admin.users.profileHidden') : t('admin.users.profileVisible'));
      qc.invalidateQueries({ queryKey: ['admin:profiles:list'] });
    } catch (e) { toast.error(t('admin.users.errorWithMessage', { message: e.message || e })); }
  };
  const toggleAdsPlus = async (p) => {
    try {
      await base44.entities.ProfessionalProfile.update(p.id, { is_ads_plus: !p.is_ads_plus });
      toast.success(p.is_ads_plus ? t('admin.users.featuredRemoved') : t('admin.users.featuredAdded'));
      qc.invalidateQueries({ queryKey: ['admin:profiles:list'] });
    } catch (e) { toast.error(t('admin.users.errorWithMessage', { message: e.message || e })); }
  };

  return (
    <div className="card rounded-2xl">
      <div className="p-4 border-b border-c-border flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-c-muted pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={t('admin.users.searchProPlaceholder')}
            className="input pl-9 text-sm"
          />
        </div>
        <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="select w-auto text-sm">
          <option value="all">{t('admin.users.filters.allStatuses')}</option>
          <option value="activo">{t('admin.users.filters.statusActive')}</option>
          <option value="inactivo">{t('admin.users.filters.statusInactive')}</option>
        </select>
        <select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} className="select w-auto text-sm">
          <option value="all">{t('admin.users.filters.allVerified')}</option>
          <option value="si">{t('common.yes')}</option>
          <option value="no">{t('common.no')}</option>
        </select>
        <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }} className="select w-auto text-sm max-w-[200px]">
          <option value="all">{t('admin.users.filters.allCategories')}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={ciudad} onChange={(e) => { setCiudad(e.target.value); setPage(1); }} className="select w-auto text-sm max-w-[160px]">
          <option value="all">{t('admin.users.filters.allCities')}</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-c-muted">
          {isLoading
            ? t('admin.users.loading')
            : t('admin.users.shownOfTotal', { shown: filtered.length.toLocaleString('es-ES'), total: profiles.length.toLocaleString('es-ES') })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft">
            <tr>
              <Th sortKey="business_name" sort={sort} setSort={setSort}>{t('auth.name')}</Th>
              <Th>{t('admin.users.table.category')}</Th>
              <Th>{t('city')}</Th>
              <Th>{t('admin.users.table.status')}</Th>
              <Th>{t('admin.users.table.verified')}</Th>
              <Th>{t('admin.users.table.featured')}</Th>
              <Th sortKey="created_date" sort={sort} setSort={setSort}>{t('admin.users.table.signup')}</Th>
              <Th align="right">{t('admin.users.table.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p) => {
              const active = p.visible_en_busqueda && p.onboarding_completed;
              return (
                <tr key={p.id} className="border-t border-c-border hover:bg-soft">
                  <td className="px-3 py-2 text-ink">{p.business_name || <span className="text-c-muted">—</span>}</td>
                  <td className="px-3 py-2 text-ink">{(p.categories || []).slice(0, 2).join(', ') || <span className="text-c-muted">—</span>}</td>
                  <td className="px-3 py-2 text-ink">{p.ciudad || <span className="text-c-muted">—</span>}</td>
                  <td className="px-3 py-2">
                    <span className={classNames('text-[11px] uppercase tracking-[0.06em]', active ? 'badge-success' : 'badge-muted')}>
                      {active ? t('admin.users.status.active') : t('admin.users.status.inactive')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {p.identity_verified ? <IconShield className="w-4 h-4" style={{ color: NAVY }} /> : <span className="text-c-muted">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {p.is_ads_plus ? <IconStar className="w-4 h-4 text-star" /> : <span className="text-c-muted">·</span>}
                  </td>
                  <td className="px-3 py-2 text-c-muted text-[12px]">
                    {p.created_date ? new Date(p.created_date).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button type="button" onClick={() => toggleVisible(p)} className="text-[12px] font-medium text-ink hover:text-ink" title={p.visible_en_busqueda ? t('admin.users.actions.hide') : t('admin.users.actions.show')}>
                        {p.visible_en_busqueda ? t('admin.users.actions.hide') : t('admin.users.actions.show')}
                      </button>
                      <button type="button" onClick={() => toggleAdsPlus(p)} className="text-[12px] font-medium text-ink hover:text-ink" title={t('admin.users.actions.toggleAdsPlus')}>
                        {p.is_ads_plus ? t('admin.users.actions.removeAdsPlus') : t('admin.users.actions.adsPlus')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && paged.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8"><EmptyState className="border-0 shadow-none" title={t('admin.users.emptyState')} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} perPage={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

export default function AdminUsuariosPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('users');
  return (
    <>
      <SEOHead title={t('admin.users.pageTitle')} noindex />
      <main className="min-h-screen bg-canvas">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-end justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink" style={{ letterSpacing: '-0.02em' }}>{t('admin.users.title')}</h1>
              <p className="text-sm text-c-muted mt-1">{t('admin.users.subtitle')}</p>
            </div>
            <div role="tablist" className="inline-flex p-1 rounded-xl bg-soft">
              <button type="button" role="tab" aria-selected={tab === 'users'} onClick={() => setTab('users')} className={classNames('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg', tab === 'users' ? 'bg-surface text-ink shadow-sm' : 'text-c-muted hover:text-ink')}>
                <IconUsers className="w-3.5 h-3.5" /> {t('admin.users.tabs.accounts')}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'pros'} onClick={() => setTab('pros')} className={classNames('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg', tab === 'pros' ? 'bg-surface text-ink shadow-sm' : 'text-c-muted hover:text-ink')}>
                <IconBriefcase className="w-3.5 h-3.5" /> {t('admin.users.tabs.professionals')}
              </button>
            </div>
          </div>

          {tab === 'users' ? <UsersTable /> : <ProsTable />}
        </div>
      </main>
    </>
  );
}
