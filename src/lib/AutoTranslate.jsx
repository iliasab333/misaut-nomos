// AutoTranslate — traducción ES→EN en tiempo de ejecución, sin etiquetar string por string.
//
// Cómo funciona
//  1. Escucha el idioma seleccionado (i18n.language: 'es' | 'en').
//  2. Cuando es 'en', recorre los nodos de texto visibles del DOM y manda
//     los que están en español sin traducir a la Edge Function `translate`,
//     en lotes, con caché local (localStorage) para no preguntar dos veces.
//  3. Un MutationObserver mantiene la traducción al día cuando React
//     monta/actualiza componentes, cambia de ruta o carga datos de la BD.
//  4. Al volver a 'es', restaura los textos originales guardados.
//
// Idempotencia: cada nodo de texto traducido se guarda en un WeakMap con su
// `{ original, translated }`. Cuando React re-renderiza y reescribe el ES
// encima de nuestro EN, el observer lo detecta, lo retraduce (cache-hit)
// y vuelve a aplicarlo. Nuestras propias escrituras se ignoran mediante
// otro WeakMap (recentWrites) para evitar bucles.

import React, { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/api/supabaseClient';

// ── Config ───────────────────────────────────────────────────────────────
const TARGET_LANG_API = 'EN-US';
const LS_CACHE_KEY = 'autotr-cache-v1';
const LS_CACHE_MAX_ENTRIES = 4000; // tope blando para no llenar localStorage
const BATCH_INTERVAL_MS = 80;
const MAX_BATCH_SIZE = 50;
const MIN_TEXT_LEN = 2;
const MAX_TEXT_LEN = 2000;

// Elementos cuyo contenido NUNCA se traduce.
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT',
  'SELECT', 'OPTION', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'POLYGON', 'LINE',
  'CANVAS', 'IFRAME', 'OBJECT', 'EMBED',
]);

const BRAND_RE = /^(misautónomos|misautonomos|misAutónomos|misAutonomos|MisAutónomos)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/|www\.|\/[\w-])/i;
const DOMAINY_RE = /^[a-z0-9-]+\.[a-z]{2,}(?:\/|$)/i;
const NUMERIC_RE = /^[\s\d.,€$£%+()\-:/×*x]+$/;
const NO_LETTERS_RE = /^[^\p{L}]+$/u;

// ── Caché en localStorage ────────────────────────────────────────────────
const cacheMap = (() => {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw);
    return new Map(Object.entries(obj));
  } catch (_e) {
    return new Map();
  }
})();

let saveTimer = null;
function scheduleCacheSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      // Si la caché crece demasiado, conservar las últimas N entradas insertadas.
      let entries = Array.from(cacheMap.entries());
      if (entries.length > LS_CACHE_MAX_ENTRIES) {
        entries = entries.slice(-LS_CACHE_MAX_ENTRIES);
        cacheMap.clear();
        for (const [k, v] of entries) cacheMap.set(k, v);
      }
      localStorage.setItem(LS_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch (_e) { /* quota — best effort */ }
  }, 2000);
}

// ── Estado interno del traductor ─────────────────────────────────────────
const nodeMeta = new WeakMap();       // TextNode -> { original, translated }
const touchedNodes = new Set();       // refs para restaurar al volver a 'es'
const recentWrites = new WeakMap();   // TextNode -> string (valor que acabamos de escribir)

const pendingQueue = new Map();       // srcText -> Set<TextNode>
let flushTimer = null;
let observer = null;
let active = false;

// ── Filtros ──────────────────────────────────────────────────────────────
function isAncestorSkippable(node) {
  let p = node.parentNode;
  while (p && p.nodeType === Node.ELEMENT_NODE) {
    if (SKIP_TAGS.has(p.tagName)) return true;
    if (p.hasAttribute && p.hasAttribute('data-i18n-ignore')) return true;
    // Estándar HTML: translate="no" indica que el contenido NO debe traducirse.
    // Lo mismo para la clase `.notranslate` (convención de Google Translate y
    // el resto de proveedores). Usamos los dos para nombres de marca, nombres
    // propios, identificadores técnicos, etc.
    if (p.getAttribute && p.getAttribute('translate') === 'no') return true;
    if (p.classList && p.classList.contains('notranslate')) return true;
    if (p.isContentEditable) return true;
    p = p.parentNode;
  }
  return false;
}

function shouldTranslateText(trimmed) {
  if (!trimmed) return false;
  if (trimmed.length < MIN_TEXT_LEN) return false;
  if (trimmed.length > MAX_TEXT_LEN) return false;
  if (BRAND_RE.test(trimmed)) return false;
  if (EMAIL_RE.test(trimmed)) return false;
  if (URL_RE.test(trimmed)) return false;
  if (DOMAINY_RE.test(trimmed)) return false;
  if (NUMERIC_RE.test(trimmed)) return false;
  if (NO_LETTERS_RE.test(trimmed)) return false;
  return true;
}

// ── Escritura ────────────────────────────────────────────────────────────
function writeNodeTranslation(node, sourceTextTrimmed, translatedTrimmed) {
  if (!node || !node.isConnected) return;
  const currentValue = node.nodeValue;
  // Conservar espacios en blanco al inicio y al fin que React pueda esperar.
  const leading = (currentValue.match(/^\s*/) || [''])[0];
  const trailing = (currentValue.match(/\s*$/) || [''])[0];
  const newValue = leading + translatedTrimmed + trailing;
  if (newValue === currentValue) return;

  const prevMeta = nodeMeta.get(node);
  const original = prevMeta?.original ?? currentValue;

  // Avisar al observer de que esta mutación es nuestra.
  recentWrites.set(node, newValue);
  node.nodeValue = newValue;

  nodeMeta.set(node, { original, translated: newValue, sourceTrimmed: sourceTextTrimmed });
  touchedNodes.add(node);

  const parent = node.parentElement;
  if (parent && !parent.hasAttribute('data-i18n')) {
    parent.setAttribute('data-i18n', '1');
  }
}

function applyTranslation(nodes, srcTrimmed, translatedTrimmed) {
  for (const node of nodes) {
    writeNodeTranslation(node, srcTrimmed, translatedTrimmed);
  }
}

// ── Cola y flush ─────────────────────────────────────────────────────────
function enqueue(node, sourceTrimmed) {
  // Cache local: aplicar al instante.
  const cached = cacheMap.get(sourceTrimmed);
  if (cached) {
    writeNodeTranslation(node, sourceTrimmed, cached);
    return;
  }
  let set = pendingQueue.get(sourceTrimmed);
  if (!set) {
    set = new Set();
    pendingQueue.set(sourceTrimmed, set);
  }
  set.add(node);
  if (!flushTimer) flushTimer = setTimeout(flush, BATCH_INTERVAL_MS);
}

async function flush() {
  flushTimer = null;
  if (!active || pendingQueue.size === 0) return;

  // Toma hasta MAX_BATCH_SIZE entradas del queue.
  const items = [];
  for (const [text, nodes] of pendingQueue) {
    items.push([text, nodes]);
    if (items.length >= MAX_BATCH_SIZE) break;
  }
  for (const [text] of items) pendingQueue.delete(text);

  const texts = items.map(([t]) => t);
  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { texts, target_lang: TARGET_LANG_API },
    });
    if (error) throw error;
    const translations = (data && data.translations) || {};
    let dirty = false;
    for (const [src, nodes] of items) {
      const trans = translations[src];
      if (typeof trans === 'string') {
        cacheMap.set(src, trans);
        dirty = true;
        if (trans !== src) {
          applyTranslation(Array.from(nodes), src, trans);
        }
      }
    }
    if (dirty) scheduleCacheSave();
  } catch (err) {
    // En caso de fallo: descartar este lote para no entrar en bucle.
    console.warn('[AutoTranslate] batch failed:', err && err.message ? err.message : err);
  }

  // Si quedan más, programar siguiente flush.
  if (active && pendingQueue.size > 0 && !flushTimer) {
    flushTimer = setTimeout(flush, BATCH_INTERVAL_MS);
  }
}

// ── Walker / Observer ────────────────────────────────────────────────────
function handleTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  if (!node.isConnected) return;
  const value = node.nodeValue;
  if (!value) return;
  const trimmed = value.trim();
  if (!trimmed) return;
  if (isAncestorSkippable(node)) return;
  if (!shouldTranslateText(trimmed)) return;

  const meta = nodeMeta.get(node);
  if (meta) {
    // Si el valor actual es exactamente lo que escribimos, está al día.
    if (meta.translated === value) return;
    // Si coincide con un origen ya conocido y cacheado, reaplicar al vuelo.
    const cached = cacheMap.get(trimmed);
    if (cached) {
      writeNodeTranslation(node, trimmed, cached);
      return;
    }
    // El texto cambió: limpiar para tomarlo como nueva fuente.
  } else {
    const cached = cacheMap.get(trimmed);
    if (cached) {
      writeNodeTranslation(node, trimmed, cached);
      return;
    }
  }

  enqueue(node, trimmed);
}

function walkSubtree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    handleTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (SKIP_TAGS.has(root.tagName)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isAncestorSkippable(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) handleTextNode(n);
}

function onMutations(mutations) {
  for (const m of mutations) {
    if (m.type === 'childList') {
      m.addedNodes.forEach((added) => {
        if (added.nodeType === Node.TEXT_NODE) {
          handleTextNode(added);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          walkSubtree(added);
        }
      });
    } else if (m.type === 'characterData') {
      const target = m.target;
      const expected = recentWrites.get(target);
      if (expected !== undefined && expected === target.nodeValue) {
        // Es nuestra propia escritura — ignorar.
        recentWrites.delete(target);
        continue;
      }
      handleTextNode(target);
    }
  }
}

function activate() {
  if (active) return;
  active = true;
  if (!observer) observer = new MutationObserver(onMutations);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  walkSubtree(document.body);
}

function deactivate() {
  if (!active) {
    // Restauración cuando se inicia ya en ES tras un toggle previo a EN cargado en cache.
  }
  active = false;
  if (observer) observer.disconnect();
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  pendingQueue.clear();

  // Restaurar originales.
  const toClear = [];
  for (const node of touchedNodes) {
    if (!node || !node.isConnected) { toClear.push(node); continue; }
    const meta = nodeMeta.get(node);
    if (!meta) { toClear.push(node); continue; }
    // Solo restaurar si el valor actual sigue siendo nuestra traducción
    // (si React lo cambió a otra cosa, dejamos lo que haya).
    if (node.nodeValue === meta.translated) {
      recentWrites.set(node, meta.original);
      node.nodeValue = meta.original;
    }
  }
  for (const n of toClear) touchedNodes.delete(n);

  // Quitar marcadores data-i18n.
  document.querySelectorAll('[data-i18n]').forEach((el) => el.removeAttribute('data-i18n'));
}

// ── Provider de React ───────────────────────────────────────────────────
const AutoTranslateContext = createContext({ language: 'es', ready: true });

export function AutoTranslateProvider({ children }) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';

  useEffect(() => {
    if (currentLang === 'en') {
      // Activamos en el siguiente tick para dar tiempo al primer paint.
      const id = setTimeout(() => activate(), 0);
      return () => clearTimeout(id);
    } else {
      deactivate();
      return undefined;
    }
  }, [currentLang]);

  return (
    <AutoTranslateContext.Provider value={{ language: currentLang, ready: true }}>
      {children}
    </AutoTranslateContext.Provider>
  );
}

export function useAutoTranslate() {
  return useContext(AutoTranslateContext);
}
