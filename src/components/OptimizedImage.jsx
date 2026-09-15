import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageIcon } from 'lucide-react';

const OptimizedImage = React.memo(function OptimizedImage({ 
  src, 
  alt = "", 
  className = "", 
  fallback = null,
  priority = false,
  objectFit = "cover",
  width,
  height,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  quality = 75,
  centered = true
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [actualSrc, setActualSrc] = useState(src);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src || src.trim() === '') {
      setError(true);
      setIsLoading(false);
      return;
    }

    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setActualSrc(src);
      setIsInView(true);
      return;
    }

    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      setError(true);
      setIsLoading(false);
      return;
    }

    // Optimize Supabase images via Image Transform endpoint (/render/image/)
    if (src.includes('supabase.co')) {
      const optimalWidth = width ? Math.min(width * 2, 1200) : 400;
      const optimalHeight = height ? Math.min(height * 2, 1200) : 400;

      // Convertir /storage/v1/object/public/ → /storage/v1/render/image/public/
      const renderSrc = src.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
      );
      // Solo añadir params si la URL cambió (evitar double-transform)
      const url = new URL(renderSrc);
      url.searchParams.set('width', optimalWidth.toString());
      url.searchParams.set('height', optimalHeight.toString());
      url.searchParams.set('quality', quality.toString());
      url.searchParams.set('resize', 'cover');
      url.searchParams.set('format', 'webp');
      setActualSrc(url.toString());
    } else if (src.includes('base44.app') && src.includes('/files/public/')) {
      // Optimize Base44 images similarly
      const url = new URL(src);
      const optimalWidth = width ? Math.min(width * 2, 1200) : 400;
      const optimalHeight = height ? Math.min(height * 2, 1200) : 400;
      
      url.searchParams.set('w', optimalWidth.toString());
      url.searchParams.set('h', optimalHeight.toString());
      url.searchParams.set('q', quality.toString());
      url.searchParams.set('fm', 'webp');
      setActualSrc(url.toString());
    } else {
      setActualSrc(src);
    }
  }, [src, width, height, quality]);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    setError(false);
  }, []);

  const handleError = React.useCallback(() => {
    setIsLoading(false);
    setError(true);
  }, []);

  const defaultFallback = (
    <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
      <ImageIcon className="w-1/3 h-1/3 text-gray-400" />
    </div>
  );

  if (error) {
    return fallback || defaultFallback;
  }

  const wrapperStyle = centered && width && height ? {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${width}px`,
    height: `${height}px`
  } : width && height ? { aspectRatio: `${width}/${height}` } : {};

  return (
    <div 
      ref={imgRef} 
      className={`relative ${className} ${centered ? 'flex items-center justify-center' : ''}`}
      style={wrapperStyle}
    >
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" 
          style={width && height ? { width, height } : {}}
        />
      )}
      {isInView && actualSrc && (
        <img
          src={actualSrc}
          alt={alt || "Imagen"}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchpriority={priority ? "high" : "auto"}
          className={`transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ objectFit, maxWidth: '100%', maxHeight: '100%', height: 'auto' }}
          onLoad={handleLoad}
          onError={handleError}
          decoding={priority ? "sync" : "async"}
        />
      )}
    </div>
  );
});

export default OptimizedImage;