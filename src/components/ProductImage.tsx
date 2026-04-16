type Props = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Catalog images are usually CDN URLs (see docs/scale-ops.md). Lazy-load and async
 * decode to reduce main-thread work on long product grids.
 */
export function ProductImage({ src, alt, className }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
