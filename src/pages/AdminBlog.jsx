import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Edit, Trash2, Copy, BookOpen, Eye, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BlogPostEditor = lazy(() => import('@/components/blog/BlogPostEditor'));

export default function AdminBlogPage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [editing, setEditing] = useState(null); // null=list, false=new, obj=edit
  const [user, setUser] = useState(null);

  // Dentro del componente para que se retraduzcan al cambiar de idioma.
  const STATUS_LABELS = {
    draft: { label: t('draft'), cls: 'bg-gray-100 text-gray-700' },
    scheduled: { label: t('admin.blog.status.scheduled'), cls: 'bg-blue-50 text-blue-700' },
    published: { label: t('admin.blog.status.published'), cls: 'bg-green-50 text-green-700' },
    archived: { label: t('admin.blog.status.archived'), cls: 'bg-red-50 text-red-700' }
  };

  const CAT_LABELS = {
    autonomos: t('footer.for_pros'),
    clientes: t('footer.for_clients'),
    legal_fiscal: t('admin.blog.categories.legalFiscal'),
    herramientas: t('admin.blog.categories.tools'),
    actualidad: t('admin.blog.categories.news')
  };

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        if (u?.role !== 'admin') { window.location.href = '/'; return; }
        setUser(u);
        loadPosts();
      })
      .catch(() => { window.location.href = '/login?next=/admin/blog'; });
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const all = await base44.entities.BlogPost.list('-updated_date', 200);
    setPosts(all);
    setLoading(false);
  };

  const filtered = posts.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (search && !(p.title_es || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (post) => {
    if (!confirm(t('admin.blog.deleteConfirm', { title: post.title_es }))) return;
    await base44.entities.BlogPost.delete(post.id);
    setPosts(prev => prev.filter(p => p.id !== post.id));
  };

  const handleDuplicate = async (post) => {
    const { id, created_date, updated_date, ...rest } = post;
    const newPost = { ...rest, title_es: `[Copia] ${post.title_es}`, slug: `${post.slug}-copia-${Date.now()}`, status: 'draft' };
    const created = await base44.entities.BlogPost.create(newPost);
    setPosts(prev => [created, ...prev]);
  };

  if (!user) return null;
  if (editing !== null) {
    return (
      <Suspense fallback={<div className="p-8 text-center text-gray-500">{t('admin.blog.loadingEditor')}</div>}>
      <BlogPostEditor
        post={editing || null}
        allPosts={posts}
        onSave={async (data) => {
          if (data.id) {
            const updated = await base44.entities.BlogPost.update(data.id, data);
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
          } else {
            const created = await base44.entities.BlogPost.create(data);
            setPosts(prev => [created, ...prev]);
          }
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6" /> {t('admin.blog.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('admin.blog.totalCount', { count: posts.length })}</p>
          </div>
          <Button
            onClick={() => setEditing(false)}
            className="text-white font-semibold"
            style={{ background: '#00255C' }}
          >
            <Plus className="w-4 h-4 mr-1" /> {t('admin.blog.newPost')}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.blog.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
          >
            <option value="all">{t('admin.blog.filters.allStatuses')}</option>
            <option value="draft">{STATUS_LABELS.draft.label}</option>
            <option value="scheduled">{STATUS_LABELS.scheduled.label}</option>
            <option value="published">{STATUS_LABELS.published.label}</option>
            <option value="archived">{STATUS_LABELS.archived.label}</option>
          </select>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
          >
            <option value="all">{t('allCategories')}</option>
            {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">{t('admin.blog.loadingPosts')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t('admin.blog.emptyState')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('admin.blog.table.title')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 hidden md:table-cell">{t('admin.blog.table.category')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('admin.blog.table.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 hidden lg:table-cell">{t('admin.blog.table.date')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700 hidden lg:table-cell">{t('admin.blog.table.views')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">{t('admin.blog.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(post => {
                  const st = STATUS_LABELS[post.status] || STATUS_LABELS.draft;
                  return (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 line-clamp-1">{post.title_es}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{`/blog/${post.slug}`}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">{CAT_LABELS[post.category] || post.category}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                        {post.featured && <span className="ml-1 text-xs text-amber-600">★</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                        {post.publish_date ? new Date(post.publish_date).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-right text-gray-500">
                        <span className="flex items-center justify-end gap-1"><Eye className="w-3 h-3" />{post.views || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {post.status === 'published' && (
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title={t('view')}>
                              <TrendingUp className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button onClick={() => setEditing(post)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title={t('common.edit')}>
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDuplicate(post)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title={t('admin.blog.actions.duplicate')}>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(post)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-red-500" title={t('common.delete')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
