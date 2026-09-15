import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Eye, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { slugify } from '@/lib/slugify';

const NAVY = '#00255C';
const NAVY_INK = '#001A45';

const generateSlug = (title) => slugify(title).substring(0, 60);

const calcReadTime = (htmlContent) => {
  const text = (htmlContent || '').replace(/<[^>]+>/g, '');
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
};

const INITIAL = {
  title_es: '', title_en: '', slug: '',
  excerpt_es: '', excerpt_en: '',
  content_es: '', content_en: '',
  category: 'autonomos', tags: [],
  status: 'draft', featured: false,
  featured_image: '', og_image: '',
  author_name: 'Equipo MisAutónomos', author_avatar: '', author_bio: '',
  publish_date: new Date().toISOString().slice(0, 16),
  read_time_minutes: 5,
  meta_title_es: '', meta_description_es: '',
  meta_title_en: '', meta_description_en: '',
  related_articles: [],
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

function Field({ label, hint, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <label className="block text-sm font-semibold text-slate-800 mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-2">{hint}</p>}
    </div>
  );
}

function ImageUploader({ value, onChange, label, ratio = 'aspect-[16/9]' }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast.error(t('blog.editor.upload.notImage')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('blog.editor.upload.tooLarge')); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success(t('blog.editor.upload.success'));
    } catch (err) {
      toast.error(t('blog.editor.upload.error', { message: err?.message || t('blog.editor.unknownError') }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className={`rounded-xl border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center ${ratio} relative`}>
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/90 shadow border border-slate-200 hover:bg-white"
              aria-label={t('blog.editor.upload.remove')}
            >
              <X className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? t('blog.editor.upload.uploading') : t('blog.editor.upload.button')}
          </button>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => upload(e.target.files?.[0])}
          className="hidden"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('blog.editor.upload.urlPlaceholder')}
          className="flex-1 input-base"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export default function BlogPostEditor({ post, allPosts = [], onSave, onCancel }) {
  const { t } = useTranslation();
  const [data, setData] = useState(post ? { ...INITIAL, ...post } : INITIAL);
  const [tagInput, setTagInput] = useState((post?.tags || []).join(', '));
  const [contentLang, setContentLang] = useState('es');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  // Dentro del componente para que las etiquetas se retraduzcan al cambiar de idioma.
  const CATEGORIES = [
    { id: 'autonomos', label: t('footer.for_pros') },
    { id: 'clientes', label: t('footer.for_clients') },
    { id: 'legal_fiscal', label: t('blog.editor.category.legalFiscal') },
    { id: 'herramientas', label: t('blog.editor.category.tools') },
    { id: 'actualidad', label: t('blog.editor.category.news') },
  ];

  const set = (key, val) => setData((d) => ({ ...d, [key]: val }));

  const handleTitleChange = (val) => {
    set('title_es', val);
    if (!post?.slug) set('slug', generateSlug(val));
  };

  const handleContentChange = (val) => {
    if (contentLang === 'es') {
      set('content_es', val);
      set('read_time_minutes', calcReadTime(val));
    } else {
      set('content_en', val);
    }
  };

  const validate = () => {
    if (!data.title_es?.trim()) return t('blog.editor.validation.titleRequired');
    if (!data.slug?.trim()) return t('blog.editor.validation.slugRequired');
    if (!/^[a-z0-9-]+$/.test(data.slug)) return t('blog.editor.validation.slugFormat');
    const collision = allPosts.find((p) => p.slug === data.slug && p.id !== post?.id);
    if (collision) return t('blog.editor.validation.slugExists', { title: collision.title_es });
    if (!data.content_es || data.content_es.replace(/<[^>]+>/g, '').trim().length < 50) {
      return t('blog.editor.validation.contentTooShort');
    }
    return null;
  };

  const handleSave = async (forceStatus) => {
    const error = validate();
    if (error) { toast.error(error); return; }
    setSaving(true);
    try {
      const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
      let finalStatus = forceStatus || data.status;
      if (finalStatus === 'published' && data.publish_date && new Date(data.publish_date) > new Date()) {
        finalStatus = 'scheduled';
      }
      const payload = { ...data, tags, status: finalStatus };
      await onSave(payload);
      toast.success(
        finalStatus === 'published' ? t('blog.editor.saved.published') :
        finalStatus === 'scheduled' ? t('blog.editor.saved.scheduled', { date: new Date(data.publish_date).toLocaleString('es-ES') }) :
        t('blog.editor.saved.draft')
      );
    } catch (err) {
      toast.error(t('blog.editor.saveError', { message: err?.message || t('blog.editor.unknownError') }));
    } finally {
      setSaving(false);
    }
  };

  const otherPosts = (allPosts || []).filter((p) => p.id !== post?.id);

  const TABS = ['content', 'meta', 'seo', 'author', 'publish', 'related'];
  const TAB_LABELS = { content: t('blog.editor.tabs.content'), meta: t('blog.editor.tabs.meta'), seo: t('blog.editor.tabs.seo'), author: t('blog.editor.tabs.author'), publish: t('blog.editor.tabs.publish'), related: t('blog.editor.tabs.related') };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>
          <h2 className="font-semibold text-slate-900 text-sm truncate flex-1 text-center">
            {post ? t('blog.editor.editArticle') : t('blog.editor.newArticle')}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saving}>
              {t('blog.editor.saveDraft')}
            </Button>
            {data.slug && data.status !== 'draft' && (
              <a href={`/blog/${data.slug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><Eye className="w-3.5 h-3.5 mr-1" /> {t('view')}</Button>
              </a>
            )}
            <Button
              size="sm"
              onClick={() => handleSave('published')}
              disabled={saving}
              className="text-white font-semibold"
              style={{ background: NAVY }}
              onMouseEnter={(e) => (e.currentTarget.style.background = NAVY_INK)}
              onMouseLeave={(e) => (e.currentTarget.style.background = NAVY)}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('blog.editor.publishButton')}
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab ? 'text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                style={activeTab === tab ? { borderColor: NAVY } : { borderColor: 'transparent' }}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {activeTab === 'content' && (
          <>
            <Field label={t('blog.editor.content.titleEs')}>
              <input className="input-base" value={data.title_es} onChange={(e) => handleTitleChange(e.target.value)} placeholder={t('blog.editor.content.titleEsPlaceholder')} />
            </Field>
            <Field label={t('blog.editor.content.titleEn')}>
              <input className="input-base" value={data.title_en || ''} onChange={(e) => set('title_en', e.target.value)} placeholder={t('blog.editor.content.titleEnPlaceholder')} />
            </Field>

            <Field label={t('blog.editor.content.excerptEs')}>
              <textarea className="input-base resize-none" rows={3} value={data.excerpt_es || ''} onChange={(e) => set('excerpt_es', e.target.value)} placeholder={t('blog.editor.content.excerptEsPlaceholder')} maxLength={200} />
              <p className="text-xs text-slate-400 mt-1">{(data.excerpt_es || '').length}/200</p>
            </Field>
            <Field label={t('blog.editor.content.excerptEn')}>
              <textarea className="input-base resize-none" rows={3} value={data.excerpt_en || ''} onChange={(e) => set('excerpt_en', e.target.value)} placeholder={t('blog.editor.content.excerptEnPlaceholder')} maxLength={200} />
              <p className="text-xs text-slate-400 mt-1">{(data.excerpt_en || '').length}/200</p>
            </Field>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-800">
                  {t('blog.editor.content.bodyLabel', { lang: contentLang === 'es' ? 'ES *' : 'EN' })}
                </label>
                <div className="inline-flex p-1 rounded-lg bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setContentLang('es')}
                    className={`text-xs font-semibold px-3 py-1 rounded-md ${contentLang === 'es' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >ES</button>
                  <button
                    type="button"
                    onClick={() => setContentLang('en')}
                    className={`text-xs font-semibold px-3 py-1 rounded-md ${contentLang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >EN</button>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <ReactQuill
                  theme="snow"
                  key={contentLang}
                  value={contentLang === 'es' ? data.content_es : data.content_en}
                  onChange={handleContentChange}
                  style={{ minHeight: 400 }}
                  modules={QUILL_MODULES}
                  placeholder={contentLang === 'es' ? t('blog.editor.content.bodyEsPlaceholder') : t('blog.editor.content.bodyEnPlaceholder')}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">{t('blog.editor.content.readTimeEstimate', { minutes: data.read_time_minutes })}</p>
            </div>
          </>
        )}

        {activeTab === 'meta' && (
          <>
            <Field
              label={t('blog.editor.meta.slug')}
              hint={`misautonomos.es/blog/${data.slug || '…'}`}
            >
              <div className="flex gap-2">
                <input className="input-base flex-1" value={data.slug} onChange={(e) => set('slug', e.target.value)} placeholder={t('blog.editor.meta.slugPlaceholder')} />
                <button
                  type="button"
                  onClick={() => set('slug', generateSlug(data.title_es))}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                  title={t('blog.editor.meta.regenerateSlug')}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </Field>
            <Field label={t('blog.editor.meta.category')}>
              <select className="input-base" value={data.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label={t('blog.editor.meta.tags')} hint={t('blog.editor.meta.tagsHint')}>
              <input className="input-base" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder={t('blog.editor.meta.tagsPlaceholder')} />
            </Field>
            <Field label={t('blog.editor.meta.readTime')}>
              <input type="number" className="input-base w-24" min={1} max={60} value={data.read_time_minutes} onChange={(e) => set('read_time_minutes', parseInt(e.target.value || '1'))} />
            </Field>
          </>
        )}

        {activeTab === 'seo' && (
          <>
            <Field label={t('blog.editor.seo.metaTitleEs')} hint={t('blog.editor.seo.charCount', { length: (data.meta_title_es || '').length, max: 70 })}>
              <input className="input-base" value={data.meta_title_es || ''} onChange={(e) => set('meta_title_es', e.target.value)} placeholder={t('blog.editor.seo.metaTitleEsPlaceholder', { title: data.title_es })} maxLength={70} />
            </Field>
            <Field label={t('blog.editor.seo.metaDescriptionEs')} hint={t('blog.editor.seo.charCount', { length: (data.meta_description_es || '').length, max: 160 })}>
              <textarea className="input-base resize-none" rows={3} value={data.meta_description_es || ''} onChange={(e) => set('meta_description_es', e.target.value)} placeholder={t('blog.editor.seo.metaDescriptionEsPlaceholder')} maxLength={160} />
            </Field>
            <Field label={t('blog.editor.seo.metaTitleEn')} hint={t('blog.editor.seo.charCount', { length: (data.meta_title_en || '').length, max: 70 })}>
              <input className="input-base" value={data.meta_title_en || ''} onChange={(e) => set('meta_title_en', e.target.value)} placeholder={t('blog.editor.seo.metaTitleEnPlaceholder', { title: data.title_en || data.title_es })} maxLength={70} />
            </Field>
            <Field label={t('blog.editor.seo.metaDescriptionEn')} hint={t('blog.editor.seo.charCount', { length: (data.meta_description_en || '').length, max: 160 })}>
              <textarea className="input-base resize-none" rows={3} value={data.meta_description_en || ''} onChange={(e) => set('meta_description_en', e.target.value)} placeholder={t('blog.editor.seo.metaDescriptionEnPlaceholder')} maxLength={160} />
            </Field>
            <Field label={t('blog.editor.seo.ogImage')}>
              <ImageUploader value={data.og_image} onChange={(v) => set('og_image', v)} label={t('blog.editor.seo.ogImageAlt')} ratio="aspect-[1200/630]" />
            </Field>
          </>
        )}

        {activeTab === 'author' && (
          <>
            <Field label={t('blog.editor.author.name')}>
              <input className="input-base" value={data.author_name || ''} onChange={(e) => set('author_name', e.target.value)} />
            </Field>
            <Field label={t('blog.editor.author.avatar')}>
              <ImageUploader value={data.author_avatar} onChange={(v) => set('author_avatar', v)} label={t('blog.editor.author.avatar')} ratio="aspect-square w-32 mx-auto rounded-full overflow-hidden" />
            </Field>
            <Field label={t('blog.editor.author.bio')}>
              <textarea className="input-base resize-none" rows={3} value={data.author_bio || ''} onChange={(e) => set('author_bio', e.target.value)} />
            </Field>
          </>
        )}

        {activeTab === 'publish' && (
          <>
            <Field label={t('blog.editor.publish.featuredImage')} hint={t('blog.editor.publish.featuredImageHint')}>
              <ImageUploader value={data.featured_image} onChange={(v) => set('featured_image', v)} label={t('blog.editor.publish.featuredImage')} />
            </Field>
            <Field label={t('blog.editor.publish.status')}>
              <select className="input-base" value={data.status} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">{t('draft')}</option>
                <option value="scheduled">{t('blog.editor.status.scheduled')}</option>
                <option value="published">{t('blog.editor.status.published')}</option>
                <option value="archived">{t('blog.editor.status.archived')}</option>
              </select>
            </Field>
            <Field label={t('blog.editor.publish.date')} hint={t('blog.editor.publish.dateHint')}>
              <input type="datetime-local" className="input-base" value={(data.publish_date || '').slice(0, 16)} onChange={(e) => set('publish_date', e.target.value)} />
            </Field>
            <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                id="featured"
                checked={!!data.featured}
                onChange={(e) => set('featured', e.target.checked)}
                className="w-4 h-4 accent-[#00255C]"
              />
              <label htmlFor="featured" className="text-sm font-medium text-slate-800">{t('blog.editor.publish.featured')}</label>
            </div>
          </>
        )}

        {activeTab === 'related' && (
          <Field label={t('blog.editor.related.title')}>
            <div className="space-y-2">
              {otherPosts.slice(0, 30).map((p) => {
                const isSelected = (data.related_articles || []).includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-[#00255C]"
                      checked={isSelected}
                      onChange={(e) => {
                        const curr = data.related_articles || [];
                        if (e.target.checked) {
                          if (curr.length < 3) set('related_articles', [...curr, p.id]);
                          else toast.info(t('blog.editor.related.maxReached'));
                        } else {
                          set('related_articles', curr.filter((id) => id !== p.id));
                        }
                      }}
                    />
                    <span className="text-sm text-slate-700 line-clamp-1">{p.title_es}</span>
                    <span className="text-xs text-slate-400 ml-auto">{p.status}</span>
                  </label>
                );
              })}
              {otherPosts.length === 0 && <p className="text-xs text-slate-400">{t('blog.editor.related.empty')}</p>}
            </div>
          </Field>
        )}
      </div>

      <style>{`
        .input-base {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          background: #fff;
          outline: none;
          color: #0f172a;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-base:focus {
          border-color: ${NAVY};
          box-shadow: 0 0 0 3px rgba(0,37,92,0.12);
        }
        .ql-container { min-height: 350px; font-size: 15px; }
        .ql-editor { min-height: 350px; }
      `}</style>
    </div>
  );
}
