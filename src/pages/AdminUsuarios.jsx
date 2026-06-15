import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search as SearchIcon, ShieldCheck, Star, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Users as UsersIcon, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
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
      className={`text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} ${sortable ? 'cursor-pointer hover:text-slate-900' : ''}`}
      onClick={sortable && setSort
        ? () => setSort((s) => {
            const wasAsc = s && s.key === sortKey && s.dir === 'asc';
            return { key: sortKey, dir: wasAsc ? 'desc' : 'asc' };
          })
        : undefined}
    >
      {children} {indicator && <span className="ml-1 text-slate-400">{indicator}</span>}
    </th>
  );
}

function Pagination({ page, total, perPage, onPage }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="flex items-center justify-between text-xs text-slate-500 px-3 py-3">
      <span>{total.toLocaleString('es-ES')} resultados</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        ><ChevronLeft className="w-4 h-4" /></button>
        <span>Página {page} de {pages}</span>
        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        ><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function UsersTable() {
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
      toast.success(u.disabled ? 'Usuario activado' : 'Usuario desactivado');
      qc.invalidateQueries({ queryKey: ['admin:users:list'] });
    } catch (e) { toast.error('Error: ' + (e.message || e)); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Email o nombre…"
            className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
          />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="all">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <select value={userType} onChange={(e) => { setUserType(e.target.value); setPage(1); }} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="all">Tipo: todos</option>
          <option value="professionnel">Profesional</option>
          <option value="client">Cliente</option>
          <option value="">Sin tipo</option>
        </select>
        <span className="ml-auto text-xs text-slate-500">{isLoading ? 'Cargando…' : `${filtered.length.toLocaleString('es-ES')} de ${users.length.toLocaleString('es-ES')}`}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th sortKey="full_name" sort={sort} setSort={setSort}>Nombre</Th>
              <Th sortKey="email" sort={sort} setSort={setSort}>Email</Th>
              <Th>Rol</Th>
              <Th>Tipo</Th>
              <Th sortKey="created_date" sort={sort} setSort={setSort}>Alta</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {paged.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 text-slate-900">{u.full_name || <span className="text-slate-400">—</span>}</td>
                <td className="px-3 py-2 text-slate-700 font-mono text-[12px]">{u.email}</td>
                <td className="px-3 py-2">
                  <span className={classNames('inline-flex text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full', u.role === 'admin' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700')}>
                    {u.role || 'user'}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{u.user_type || <span className="text-slate-400">—</span>}</td>
                <td className="px-3 py-2 text-slate-500 text-[12px]">
                  {u.created_date ? new Date(u.created_date).toLocaleDateString('es-ES') : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => toggleDisabled(u)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 hover:text-slate-900"
                    title={u.disabled ? 'Activar' : 'Desactivar'}
                  >
                    {u.disabled ? <ToggleLeft className="w-4 h-4 text-rose-500" /> : <ToggleRight className="w-4 h-4 text-emerald-600" />}
                    {u.disabled ? 'Desactivado' : 'Activo'}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && paged.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} perPage={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

function ProsTable() {
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
      toast.success(p.visible_en_busqueda ? 'Perfil oculto en búsqueda' : 'Perfil visible en búsqueda');
      qc.invalidateQueries({ queryKey: ['admin:profiles:list'] });
    } catch (e) { toast.error('Error: ' + (e.message || e)); }
  };
  const toggleAdsPlus = async (p) => {
    try {
      await base44.entities.ProfessionalProfile.update(p.id, { is_ads_plus: !p.is_ads_plus });
      toast.success(p.is_ads_plus ? 'Quitado destacado' : 'Marcado como destacado');
      qc.invalidateQueries({ queryKey: ['admin:profiles:list'] });
    } catch (e) { toast.error('Error: ' + (e.message || e)); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Nombre profesional…"
            className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
          />
        </div>
        <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="all">Estado: todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="all">Verificados: todos</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white max-w-[200px]">
          <option value="all">Categoría: todas</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={ciudad} onChange={(e) => { setCiudad(e.target.value); setPage(1); }} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white max-w-[160px]">
          <option value="all">Ciudad: todas</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500">{isLoading ? 'Cargando…' : `${filtered.length.toLocaleString('es-ES')} de ${profiles.length.toLocaleString('es-ES')}`}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th sortKey="business_name" sort={sort} setSort={setSort}>Nombre</Th>
              <Th>Categoría</Th>
              <Th>Ciudad</Th>
              <Th>Estado</Th>
              <Th>Verificado</Th>
              <Th>Destacado</Th>
              <Th sortKey="created_date" sort={sort} setSort={setSort}>Alta</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p) => {
              const active = p.visible_en_busqueda && p.onboarding_completed;
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2 text-slate-900">{p.business_name || <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 text-slate-700">{(p.categories || []).slice(0, 2).join(', ') || <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 text-slate-700">{p.ciudad || <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2">
                    <span className={classNames('inline-flex text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full', active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600')}>
                      {active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {p.identity_verified ? <ShieldCheck className="w-4 h-4" style={{ color: NAVY }} /> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {p.is_ads_plus ? <Star className="w-4 h-4 fill-current" style={{ color: '#E2A91F' }} /> : <span className="text-slate-300">·</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-[12px]">
                    {p.created_date ? new Date(p.created_date).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => toggleVisible(p)} className="text-[12px] font-medium text-slate-700 hover:text-slate-900" title={p.visible_en_busqueda ? 'Ocultar' : 'Mostrar'}>
                        {p.visible_en_busqueda ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <button onClick={() => toggleAdsPlus(p)} className="text-[12px] font-medium text-slate-700 hover:text-slate-900" title="Toggle Ads+">
                        {p.is_ads_plus ? 'Quitar Ads+' : 'Ads+'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && paged.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} perPage={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

export default function AdminUsuariosPage() {
  const [tab, setTab] = useState('users');
  return (
    <>
      <SEOHead title="Usuarios · Admin" noindex />
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-end justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>Usuarios</h1>
              <p className="text-sm text-slate-500 mt-1">Cuentas registradas y fichas de profesionales.</p>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-slate-100">
              <button onClick={() => setTab('users')} className={classNames('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg', tab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                <UsersIcon className="w-3.5 h-3.5" /> Cuentas
              </button>
              <button onClick={() => setTab('pros')} className={classNames('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg', tab === 'pros' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                <Briefcase className="w-3.5 h-3.5" /> Profesionales
              </button>
            </div>
          </div>

          {tab === 'users' ? <UsersTable /> : <ProsTable />}
        </div>
      </main>
    </>
  );
}
