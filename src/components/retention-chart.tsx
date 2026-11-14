"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { RetentionPoint } from "@/lib/retention";
import { cn } from "@/lib/utils";

export type RetentionSeries = {
  id: string;
  label: string;
  points: RetentionPoint[];
  /** "accent" : la courbe mise en avant. "muted" : la référence (pointillés gris). */
  tone: "accent" | "muted";
};

export type RetentionMarker = { second: number; label: string };

const COLORS = {
  accent: "rgb(var(--accent))",
  muted: "rgb(var(--muted))",
  danger: "rgb(var(--danger))",
  surface: "rgb(var(--surface))",
};

const MARGIN = { top: 14, right: 14, bottom: 26, left: 40 };
const Y_TICKS = [0, 25, 50, 75, 100];
const X_STEPS = [1, 2, 5, 10, 15, 30, 60];

/** Largeur du conteneur, pour dessiner en pixels réels (traits nets, texte non déformé). */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    setWidth(Math.round(element.getBoundingClientRect().width) || fallback);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

function valueAt(points: RetentionPoint[], second: number): number {
  const exact = points.find((point) => point.second === second);
  return exact ? exact.retention : points[points.length - 1]?.retention ?? 0;
}

const formatPercent = (value: number) => `${Math.round(value)} %`;

/**
 * Courbe de rétention : part estimée des spectateurs encore là, seconde par
 * seconde. Survol ou flèches du clavier pour lire chaque seconde.
 */
export function RetentionChart({
  series,
  markers = [],
  height = 220,
  label,
  describe,
  className,
}: {
  series: RetentionSeries[];
  /** Moments à risque, marqués sur la courbe mise en avant. */
  markers?: RetentionMarker[];
  height?: number;
  /** Nom accessible du graphique. */
  label: string;
  /** Texte affiché dans l'infobulle pour une seconde donnée (ex. la phrase dite). */
  describe?: (second: number) => string | null;
  className?: string;
}) {
  const [wrapper, width] = useWidth<HTMLDivElement>(560);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  const multi = series.length > 1;
  const main = series.find((item) => item.tone === "accent") ?? series[0];

  const maxSecond = Math.max(1, ...series.map((item) => item.points[item.points.length - 1]?.second ?? 1));
  const right = multi ? 52 : MARGIN.right;
  const innerWidth = Math.max(40, width - MARGIN.left - right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const x = (second: number) => MARGIN.left + (second / maxSecond) * innerWidth;
  const y = (value: number) => MARGIN.top + (1 - value / 100) * innerHeight;

  const xStep = X_STEPS.find((step) => (innerWidth / maxSecond) * step >= 44) ?? 60;
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let second = 0; second <= maxSecond; second += xStep) ticks.push(second);
    return ticks;
  }, [maxSecond, xStep]);

  const paths = series.map((item) => {
    const line = item.points.map((point, index) => `${index ? "L" : "M"}${x(point.second).toFixed(1)},${y(point.retention).toFixed(1)}`).join("");
    return { item, line };
  });
  const mainLine = paths.find((path) => path.item === main)?.line ?? "";
  const area = mainLine ? `${mainLine}L${x(maxSecond)},${y(0)}L${x(0)},${y(0)}Z` : "";

  // Étiquettes directes en fin de courbe (2 séries), écartées si elles se chevauchent.
  const endLabels = multi
    ? (() => {
        const labels = series
          .map((item) => ({ item, value: item.points[item.points.length - 1]?.retention ?? 0 }))
          .map((entry) => ({ ...entry, top: y(entry.value) }))
          .sort((a, b) => a.top - b.top);
        for (let index = 1; index < labels.length; index++) {
          if (labels[index].top - labels[index - 1].top < 14) labels[index].top = labels[index - 1].top + 14;
        }
        return labels;
      })()
    : [];

  function secondFromPointer(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    return Math.min(maxSecond, Math.max(0, Math.round(ratio * maxSecond)));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 };
    if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(maxSecond);
    else if (event.key === "Escape") setActive(null);
    else if (event.key in moves) setActive((current) => Math.min(maxSecond, Math.max(0, (current ?? 0) + moves[event.key])));
    else return;
    event.preventDefault();
  }

  const activeMarker = active === null ? null : [...markers].reverse().find((marker) => marker.second <= active && active - marker.second < 3);
  const description = active === null ? null : describe?.(active) ?? null;
  const tooltipLeft = active === null ? 0 : x(active);
  const flip = tooltipLeft > width * 0.6;
  // Valeurs du tableau : un point par graduation, plus la fin.
  const tableSeconds = xTicks[xTicks.length - 1] === maxSecond ? xTicks : [...xTicks, maxSecond];

  return (
    <div className={cn("w-full", className)}>
      {multi && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Légende">
          {series.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <svg width="18" height="6" aria-hidden>
                <line
                  x1="1"
                  x2="17"
                  y1="3"
                  y2="3"
                  stroke={COLORS[item.tone]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={item.tone === "muted" ? "3 4" : undefined}
                />
              </svg>
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={wrapper}
        className="relative touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        tabIndex={0}
        role="group"
        aria-label={`${label}. Flèches gauche et droite pour lire chaque seconde.`}
        aria-describedby={tableId}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? 0)}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          {/* Grille et axes */}
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={MARGIN.left + innerWidth} y1={y(tick)} y2={y(tick)} stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular-nums">
                {tick} %
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text key={tick} x={x(tick)} y={height - 8} textAnchor="middle" className="fill-faint text-[10px] tabular-nums">
              {tick} s
            </text>
          ))}

          {/* Aire sous la courbe principale (série seule) */}
          {!multi && area && <path d={area} fill={COLORS.accent} fillOpacity="0.1" />}

          {/* Courbes : la référence d'abord, la principale par-dessus */}
          {[...paths]
            .sort((a, b) => Number(a.item.tone === "accent") - Number(b.item.tone === "accent"))
            .map(({ item, line }) => (
              <path
                key={item.id}
                d={line}
                fill="none"
                stroke={COLORS[item.tone]}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={item.tone === "muted" ? "4 5" : undefined}
              />
            ))}

          {/* Moments à risque */}
          {markers.map((marker) => (
            <circle
              key={marker.second}
              cx={x(marker.second)}
              cy={y(valueAt(main.points, marker.second))}
              r="5"
              fill={COLORS.danger}
              stroke={COLORS.surface}
              strokeWidth="2"
            />
          ))}

          {/* Étiquettes de fin (texte en encre, jamais dans la couleur de la série) */}
          {endLabels.map(({ item, value, top }) => (
            <text key={item.id} x={MARGIN.left + innerWidth + 8} y={top} dy="0.32em" className={cn("text-[11px] font-medium tabular-nums", item.tone === "accent" ? "fill-fg" : "fill-muted")}>
              {formatPercent(value)}
            </text>
          ))}

          {/* Réticule */}
          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + innerHeight} stroke="rgb(255 255 255 / 0.25)" strokeWidth="1" />
              {series.map((item) => (
                <circle
                  key={item.id}
                  cx={x(active)}
                  cy={y(valueAt(item.points, active))}
                  r="4.5"
                  fill={COLORS[item.tone]}
                  stroke={COLORS.surface}
                  strokeWidth="2"
                />
              ))}
            </g>
          )}

          {/* Zone de survol, plus large que les marques */}
          <rect
            x={MARGIN.left}
            y={0}
            width={innerWidth}
            height={height}
            fill="transparent"
            onPointerMove={(event) => setActive(secondFromPointer(event))}
            onPointerDown={(event) => setActive(secondFromPointer(event))}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {active !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-max max-w-[240px] rounded-lg border border-white/[0.1] bg-elevated/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
            style={flip ? { right: width - tooltipLeft + 10 } : { left: tooltipLeft + 10 }}
          >
            <p className="font-mono text-[11px] text-faint">{active} s</p>
            {series.map((item) => (
              <p key={item.id} className="mt-1 flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full" style={{ background: COLORS[item.tone] }} aria-hidden />
                  {multi ? item.label : "Spectateurs restants"}
                </span>
                <span className="font-medium tabular-nums text-fg">{formatPercent(valueAt(item.points, active))}</span>
              </p>
            ))}
            {activeMarker && (
              <p className="mt-1.5 flex items-center gap-1.5 text-fg">
                <TriangleAlert className="size-3 shrink-0 text-danger" aria-hidden />
                {activeMarker.label}
              </p>
            )}
            {description && <p className="mt-1.5 line-clamp-3 border-t border-white/[0.08] pt-1.5 leading-snug text-muted">« {description} »</p>}
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {active !== null &&
            `${active} secondes : ${series.map((item) => `${multi ? `${item.label} ` : ""}${formatPercent(valueAt(item.points, active))}`).join(", ")}`}
        </p>
      </div>

      <details className="mt-2 text-xs text-faint">
        <summary className="cursor-pointer select-none hover:text-muted">Voir les valeurs</summary>
        <table id={tableId} className="mt-2 w-full text-left tabular-nums">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="text-faint">
              <th scope="col" className="py-1 pr-4 font-normal">Seconde</th>
              {series.map((item) => (
                <th key={item.id} scope="col" className="py-1 pr-4 font-normal">
                  {multi ? item.label : "Spectateurs restants"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted">
            {tableSeconds.map((second) => (
              <tr key={second} className="border-t border-white/[0.05]">
                <td className="py-1 pr-4">{second} s</td>
                {series.map((item) => (
                  <td key={item.id} className="py-1 pr-4">
                    {formatPercent(valueAt(item.points, second))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
