/**
 * Carte de score à partager (1080 × 1350, format portrait des réseaux),
 * dessinée dans le navigateur. Aucun texte du script n'y figure.
 */

import type { ViralScore } from "@/lib/viral-score";

const WIDTH = 1080;
const HEIGHT = 1350;
const ACCENT = "#1ed760";
const WARN = "#f5a524";
const DANGER = "#ff5f56";

function colorFor(score: number): string {
  if (score >= 70) return ACCENT;
  if (score >= 45) return WARN;
  return DANGER;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderScoreCard(result: ViralScore, siteHost: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");

  await document.fonts?.ready;
  const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`;

  // Fond et halo
  ctx.fillStyle = "#08090a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH / 2, 330, 40, WIDTH / 2, 330, 620);
  glow.addColorStop(0, `${colorFor(result.total)}33`);
  glow.addColorStop(1, "#08090a00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Marque
  roundedRect(ctx, 80, 80, 64, 64, 16);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.fillStyle = "#08090a";
  ctx.font = font(800, 40);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("V", 112, 114);
  ctx.textAlign = "left";
  ctx.fillStyle = "#f5f5f5";
  ctx.font = font(650, 40);
  ctx.fillText("ViralForge", 164, 114);

  // Anneau de score
  const cx = WIDTH / 2;
  const cy = 400;
  const radius = 190;
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colorFor(result.total);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * result.total) / 100);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = colorFor(result.total);
  ctx.font = font(700, 150);
  ctx.fillText(String(result.total), cx, cy - 6);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = font(500, 30);
  ctx.fillText("SUR 100", cx, cy + 92);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = font(500, 28);
  ctx.fillText("MON SCORE VIRAL", cx, 660);
  ctx.fillStyle = "#f5f5f5";
  ctx.font = font(650, 52);
  ctx.fillText(result.verdict, cx, 722);

  // Critères
  const left = 140;
  const barWidth = WIDTH - left * 2;
  result.criteria.forEach((criterion, index) => {
    const y = 820 + index * 86;
    ctx.textAlign = "left";
    ctx.fillStyle = "#f5f5f5";
    ctx.font = font(600, 30);
    ctx.fillText(criterion.label, left, y);
    ctx.textAlign = "right";
    ctx.fillStyle = colorFor(criterion.score);
    ctx.font = font(700, 30);
    ctx.fillText(String(criterion.score), left + barWidth, y);
    roundedRect(ctx, left, y + 26, barWidth, 12, 6);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    roundedRect(ctx, left, y + 26, Math.max(12, (barWidth * criterion.score) / 100), 12, 6);
    ctx.fillStyle = colorFor(criterion.score);
    ctx.fill();
  });

  // Pied
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = font(500, 28);
  ctx.fillText(`Teste ton script gratuitement sur ${siteHost}`, cx, HEIGHT - 70);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image impossible."))), "image/png"),
  );
}
