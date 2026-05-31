import { ExternalLink, MapPin } from "lucide-react";

/**
 * HospitalMap — embeds Google Maps with NO npm dependency.
 *
 * Two modes:
 *  - "place":      show a single hospital (by name/address or lat,lng)
 *  - "directions": show a route from `origin` to `destination`
 *
 * If a Google Maps Embed API key is provided, we use the official Embed API
 * (reliable inline directions). Without a key we fall back to the keyless
 * `output=embed` iframe, and ALWAYS render an "Open in Google Maps" deep link
 * (universal Maps URL) which works for everyone regardless of key state.
 */

type Common = { apiKey?: string; height?: number; className?: string; title?: string };

type PlaceProps = Common & { mode: "place"; query: string };
type DirectionsProps = Common & { mode: "directions"; origin: string; destination: string };
type Props = PlaceProps | DirectionsProps;

function placeEmbedSrc(query: string, apiKey?: string) {
  const q = encodeURIComponent(query);
  return apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}`
    : `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

function directionsEmbedSrc(origin: string, destination: string, apiKey?: string) {
  const o = encodeURIComponent(origin);
  const d = encodeURIComponent(destination);
  return apiKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${o}&destination=${d}&mode=driving`
    : `https://maps.google.com/maps?saddr=${o}&daddr=${d}&output=embed`;
}

function deepLink(p: Props) {
  if (p.mode === "directions") {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      p.origin
    )}&destination=${encodeURIComponent(p.destination)}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`;
}

export function HospitalMap(props: Props) {
  const { apiKey, height = 300, className, title = "Map" } = props;
  const src =
    props.mode === "directions"
      ? directionsEmbedSrc(props.origin, props.destination, apiKey)
      : placeEmbedSrc(props.query, apiKey);

  return (
    <div className={className}>
      <div
        className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
        style={{ height }}
      >
        <iframe
          title={title}
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0, filter: "grayscale(0.2) contrast(1.05)" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <a
        href={deepLink(props)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-sky-400 transition-colors hover:text-sky-300"
      >
        <MapPin className="h-3 w-3" aria-hidden />
        Open in Google Maps
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    </div>
  );
}
