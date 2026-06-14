'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ImagePlus, Move, RefreshCcw, RefreshCw } from 'lucide-react';

type TemplateId =
  | 'grid-pop'
  | 'blue-value'
  | 'yellow-tips'
  | 'speech-note'
  | 'sketch-paper'
  | 'checklist'
  | 'purple-grid'
  | 'stamp-card'
  | 'qa-card'
  | 'memo-stack';
type LayerId = 'kicker' | 'title' | 'highlight' | 'subtitle' | 'points' | 'sticker';

interface Point {
  x: number;
  y: number;
}

interface Rect extends Point {
  w: number;
  h: number;
}

interface CoverTemplateGeneratorProps {
  postTitle: string;
  postSubtitle: string;
  postTags: string;
  uploading: boolean;
  onCreate: (file: File) => Promise<void>;
}

interface CoverForm {
  template: TemplateId;
  kicker: string;
  title: string;
  highlight: string;
  subtitle: string;
  points: string;
  sticker: string;
  accent: string;
  offsets: Record<LayerId, Point>;
}

interface TemplateConfig {
  id: TemplateId;
  name: string;
  desc: string;
  accent: string;
  bg: string;
}

const W = 1080;
const H = 1440;
const EXPORT_W = 900;
const EXPORT_H = 1200;
const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif';

const layerLabels: Record<LayerId, string> = {
  kicker: '小标签',
  title: '主标题',
  highlight: '高亮词',
  subtitle: '副标题',
  points: '清单',
  sticker: '贴纸',
};

const dragLayers: LayerId[] = ['sticker', 'highlight', 'title', 'subtitle', 'points', 'kicker'];

const emptyOffsets: Record<LayerId, Point> = {
  kicker: { x: 0, y: 0 },
  title: { x: 0, y: 0 },
  highlight: { x: 0, y: 0 },
  subtitle: { x: 0, y: 0 },
  points: { x: 0, y: 0 },
  sticker: { x: 0, y: 0 },
};

const templates: TemplateConfig[] = [
  { id: 'grid-pop', name: '网格手账', desc: '纸张 + 胶带 + 荧光标记', accent: '#22c55e', bg: '#f2d6f7' },
  { id: 'blue-value', name: '蓝底高亮', desc: '极简大标题 + 表情贴纸', accent: '#ffe86a', bg: '#d8f7fb' },
  { id: 'yellow-tips', name: '黄色小 tips', desc: '亮黄底 + 圆角白纸', accent: '#0284c7', bg: '#f8dc00' },
  { id: 'speech-note', name: '气泡强标题', desc: '手绘气泡 + 重点词', accent: '#38bdf8', bg: '#fff0b8' },
  { id: 'sketch-paper', name: '手绘纸张', desc: '蓝粉手绘风 + 轻松说明', accent: '#ec4899', bg: '#dff4ff' },
  { id: 'checklist', name: '清单便签', desc: '流程/注意事项首图', accent: '#fb7185', bg: '#bde8ff' },
  { id: 'purple-grid', name: '紫色冲击', desc: '深色网格 + 强反差标题', accent: '#facc15', bg: '#7c3aed' },
  { id: 'stamp-card', name: '红框提醒', desc: '印章边框 + 重点提醒', accent: '#ef4444', bg: '#fff7ed' },
  { id: 'qa-card', name: '问答卡片', desc: '问题引导 + 气泡答案', accent: '#0ea5e9', bg: '#edf7ff' },
  { id: 'memo-stack', name: '文件夹便签', desc: '叠纸 + 磁带 + 笔记感', accent: '#f59e0b', bg: '#e8f2ff' },
];

const accentOptions = ['#2563eb', '#22c55e', '#f97316', '#ec4899', '#8b5cf6', '#ef4444', '#0f766e', '#facc15'];

export default function CoverTemplateGenerator({
  postTitle,
  postSubtitle,
  postTags,
  uploading,
  onCreate,
}: CoverTemplateGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<null | { layer: LayerId; start: Point; startOffset: Point }>(null);
  const initialTitle = postTitle.trim() || '英国电话卡\n办理指南';
  const initialSubtitle = postSubtitle.trim() || '新手也能快速上手';
  const initialKicker = postTags.split(',').map((t) => t.trim()).filter(Boolean)[0] || 'GIFFGAFF TIPS';
  const [form, setForm] = useState<CoverForm>({
    template: 'grid-pop',
    kicker: initialKicker,
    title: initialTitle,
    highlight: '避坑重点',
    subtitle: initialSubtitle,
    points: '到货先激活\n保存登录信息\n售后问题先截图',
    sticker: '📱',
    accent: '#2563eb',
    offsets: { ...emptyOffsets },
  });
  const [selectedLayer, setSelectedLayer] = useState<LayerId | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === form.template) || templates[0],
    [form.template],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderCover(canvas, form, selectedLayer);
  }, [form, selectedLayer]);

  function update<K extends keyof CoverForm>(key: K, value: CoverForm[K]) {
    setMessage('');
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectTemplate(template: TemplateConfig) {
    setMessage('');
    setSelectedLayer(null);
    setForm((prev) => ({
      ...prev,
      template: template.id,
      accent: template.accent,
      offsets: { ...emptyOffsets },
    }));
  }

  function resetLayout() {
    setMessage('');
    setSelectedLayer(null);
    setForm((prev) => ({ ...prev, offsets: { ...emptyOffsets } }));
  }

  function syncFromPost() {
    setForm((prev) => ({
      ...prev,
      title: postTitle.trim() || prev.title,
      subtitle: postSubtitle.trim() || prev.subtitle,
      kicker: postTags.split(',').map((t) => t.trim()).filter(Boolean)[0] || prev.kicker,
    }));
  }

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const point = pointFromEvent(e);
    const target = getLayerRects(form)
      .filter(({ rect }) => containsPoint(rect, point))
      .find(({ layer }) => dragLayers.includes(layer));
    if (!target) {
      setSelectedLayer(null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const startOffset = form.offsets[target.layer] || { x: 0, y: 0 };
    dragRef.current = { layer: target.layer, start: point, startOffset };
    setSelectedLayer(target.layer);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointFromEvent(e);
    const next = {
      x: Math.round(drag.startOffset.x + point.x - drag.start.x),
      y: Math.round(drag.startOffset.y + point.y - drag.start.y),
    };
    setForm((prev) => ({
      ...prev,
      offsets: { ...prev.offsets, [drag.layer]: next },
    }));
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    dragRef.current = null;
  }

  async function getGeneratedFile() {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('画布还没准备好');
    renderCover(canvas, form, null);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.88);
    });
    renderCover(canvas, form, selectedLayer);
    if (!blob) throw new Error('生成图片失败');

    const safeTitle = form.title.replace(/\s+/g, '-').replace(/[^\u4e00-\u9fa5\w-]/g, '').slice(0, 24) || 'cover';
    return new File([blob], `xiaohongshu-${safeTitle}.jpg`, { type: 'image/jpeg' });
  }

  async function handleInsert() {
    setBusy(true);
    setMessage('');
    try {
      const file = await getGeneratedFile();
      await onCreate(file);
      setMessage('已生成并插入正文');
    } catch (e: any) {
      setMessage(e?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setBusy(true);
    setMessage('');
    try {
      const file = await getGeneratedFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('JPG 已下载');
    } catch (e: any) {
      setMessage(e?.message || '下载失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line rounded-[18px] bg-paper-2 p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:w-[340px] shrink-0 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary m-0">Cover templates</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={syncFromPost}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border border-line bg-white hover:border-primary hover:text-primary transition"
                >
                  <RefreshCw size={13} />
                  同步
                </button>
                <button
                  type="button"
                  onClick={resetLayout}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border border-line bg-white hover:border-primary hover:text-primary transition"
                >
                  <RefreshCcw size={13} />
                  复位
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => {
                const active = template.id === form.template;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    className={[
                      'text-left rounded-[14px] border p-3 bg-white transition min-h-[86px]',
                      active ? 'border-primary shadow-sm' : 'border-line hover:border-primary',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border border-line" style={{ background: template.bg }} />
                      <span className="text-sm font-black">{template.name}</span>
                    </span>
                    <span className="block text-[11px] text-muted mt-1 leading-relaxed">{template.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <Field label="小标签">
              <input
                value={form.kicker}
                onChange={(e) => update('kicker', e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-sm bg-white focus:border-primary outline-none text-sm"
                placeholder="GIFFGAFF TIPS"
              />
            </Field>
            <Field label="主标题">
              <textarea
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-sm bg-white focus:border-primary outline-none text-sm min-h-24"
                placeholder="每行 4-10 个字更适合首图"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="高亮词">
                <input
                  value={form.highlight}
                  onChange={(e) => update('highlight', e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-sm bg-white focus:border-primary outline-none text-sm"
                  placeholder="避坑重点"
                />
              </Field>
              <Field label="贴纸">
                <input
                  value={form.sticker}
                  onChange={(e) => update('sticker', e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-sm bg-white focus:border-primary outline-none text-sm"
                  placeholder="📱"
                />
              </Field>
            </div>
            <Field label="副标题">
              <input
                value={form.subtitle}
                onChange={(e) => update('subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-sm bg-white focus:border-primary outline-none text-sm"
                placeholder="新手也能快速上手"
              />
            </Field>
            <Field label="清单/补充文案">
              <textarea
                value={form.points}
                onChange={(e) => update('points', e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-sm bg-white focus:border-primary outline-none text-sm min-h-20"
                placeholder="一行一个要点"
              />
            </Field>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5">强调色</label>
              <div className="flex flex-wrap gap-2">
                {accentOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => update('accent', color)}
                    className={[
                      'w-8 h-8 rounded-full border-2 transition',
                      form.accent === color ? 'border-ink shadow-sm' : 'border-white hover:border-line',
                    ].join(' ')}
                    style={{ background: color }}
                    aria-label={`选择颜色 ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-muted bg-white border border-line rounded-sm px-3 py-2">
              <Move size={14} />
              <span>布局：{selectedLayer ? layerLabels[selectedLayer] : '未选中'}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-base font-black m-0">{currentTemplate.name}</h3>
              <p className="text-xs text-muted m-0 mt-0.5">{EXPORT_W} × {EXPORT_H} JPG，小红书首图比例</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-line bg-white hover:border-primary hover:text-primary transition disabled:opacity-60"
              >
                <Download size={14} />
                下载
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={busy || uploading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full bg-primary text-white hover:bg-primary-dark transition disabled:opacity-60"
              >
                <ImagePlus size={14} />
                {busy || uploading ? '处理中…' : '生成并插入'}
              </button>
            </div>
          </div>

          <div className="grid place-items-center bg-white border border-line rounded-[18px] p-3 sm:p-4">
            <canvas
              ref={canvasRef}
              width={EXPORT_W}
              height={EXPORT_H}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              className="w-full max-w-[380px] aspect-[3/4] rounded-[14px] shadow-sm bg-white cursor-grab active:cursor-grabbing touch-none"
            />
          </div>

          {message && (
            <p className="text-xs text-muted bg-white border border-line rounded-sm px-3 py-2 mt-3">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function renderCover(canvas: HTMLCanvasElement, form: CoverForm, selectedLayer: LayerId | null = null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(canvas.width / W, canvas.height / H);
  ctx.imageSmoothingEnabled = true;
  ctx.textBaseline = 'alphabetic';

  switch (form.template) {
    case 'grid-pop':
      drawGridPop(ctx, form);
      break;
    case 'blue-value':
      drawBlueValue(ctx, form);
      break;
    case 'yellow-tips':
      drawYellowTips(ctx, form);
      break;
    case 'speech-note':
      drawSpeechNote(ctx, form);
      break;
    case 'sketch-paper':
      drawSketchPaper(ctx, form);
      break;
    case 'checklist':
      drawChecklist(ctx, form);
      break;
    case 'purple-grid':
      drawPurpleGrid(ctx, form);
      break;
    case 'stamp-card':
      drawStampCard(ctx, form);
      break;
    case 'qa-card':
      drawQaCard(ctx, form);
      break;
    case 'memo-stack':
      drawMemoStack(ctx, form);
      break;
  }

  if (selectedLayer) drawSelection(ctx, getLayerRect(form, selectedLayer));
  ctx.restore();
}

function drawGridPop(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#f3d7f8');
  ctx.save();
  ctx.translate(100, 180);
  ctx.rotate(-0.035);
  roundedRect(ctx, 0, 0, 880, 1060, 26, '#fffdf8');
  drawGrid(ctx, 40, '#e8ddfb', 0, 0, 880, 1060);
  drawTape(ctx, 14, -44, 170, 58, '#c9b7e8', -0.7);
  drawTape(ctx, 702, -42, 170, 58, '#c9b7e8', 0.72);
  drawPaperCurl(ctx, 0, 940);
  ctx.restore();

  const [kx, ky] = withOffset(form, 'kicker', 150, 245);
  const [tx, ty] = withOffset(form, 'title', 540, 540);
  const [hx, hy] = withOffset(form, 'highlight', 540, 725);
  const [sx, sy] = withOffset(form, 'subtitle', 540, 945);
  const [ex, ey] = withOffset(form, 'sticker', 785, 1040);
  drawKicker(ctx, form.kicker, kx, ky, '#2b2435');
  drawTitleBlock(ctx, form.title, tx, ty, 760, 112, 74, '#050505', 'center', 5, '900');
  drawMarker(ctx, hx - 290, hy - 65, 560, 84, '#86efac', -0.035);
  drawTitleBlock(ctx, form.highlight, hx, hy, 620, 92, 62, '#050505', 'center', 2, '900');
  drawSquiggle(ctx, tx - 20, ty + 75, 280, form.accent, 14);
  drawSubtitle(ctx, form.subtitle, sx, sy, 660, '#4338ca');
  drawEmoji(ctx, form.sticker, ex, ey, 174);
}

function drawBlueValue(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#d9f7fb');
  const [tx, ty] = withOffset(form, 'title', 165, 420);
  const [hx, hy] = withOffset(form, 'highlight', 540, 1065);
  const [kx, ky] = withOffset(form, 'kicker', 160, 1280);
  const [ex, ey] = withOffset(form, 'sticker', 770, 380);
  drawMarker(ctx, tx - 8, ty - 100, 560, 72, '#fff27d', 0);
  drawTitleBlock(ctx, form.title, tx, ty, 760, 104, 66, '#123f7a', 'left', 5, '900');
  drawSquiggle(ctx, tx + 445, ty + 315, 250, '#30c7d9', 18);
  drawEmoji(ctx, form.sticker, ex, ey, 142);
  drawEmoji(ctx, '✨', 195, 1060, 88);
  drawMarker(ctx, hx - 330, hy - 45, 640, 66, '#ffffff', -0.015);
  drawSubtitle(ctx, form.highlight || form.subtitle, hx, hy, 660, '#123f7a');
  drawKicker(ctx, form.kicker, kx, ky, '#123f7a');
}

function drawYellowTips(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#f7dc00');
  roundedRect(ctx, 155, 145, 770, 1110, 330, '#fffef8');
  drawLinedPaper(ctx, 180, 230, 720, 890, '#ecebe4');
  const [kx, ky] = withOffset(form, 'kicker', 170, 118);
  const [tx, ty] = withOffset(form, 'title', 540, 560);
  const [hx, hy] = withOffset(form, 'highlight', 540, 915);
  const [ex, ey] = withOffset(form, 'sticker', 840, 1060);
  drawKicker(ctx, form.kicker, kx, ky, '#27230b');
  drawTitleBlock(ctx, form.title, tx, ty, 720, 112, 70, '#050505', 'center', 5, '900');
  drawSquiggle(ctx, tx + 75, ty + 145, 270, form.accent, 18);
  drawTitleBlock(ctx, form.highlight, hx, hy, 620, 86, 58, '#050505', 'center', 2, '900');
  drawEmoji(ctx, form.sticker, ex, ey, 92);
  drawCornerTriangle(ctx, 905, 1265, '#111111');
}

function drawSpeechNote(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#fff0b8');
  drawSpeechBubble(ctx, 145, 205, 790, 970);
  drawEmoji(ctx, '!!', 790, 250, 96, '#ffffff');
  const [tx, ty] = withOffset(form, 'title', 540, 540);
  const [hx, hy] = withOffset(form, 'highlight', 540, 630);
  const [sx, sy] = withOffset(form, 'subtitle', 540, 930);
  const [ex, ey] = withOffset(form, 'sticker', 170, 1120);
  const [kx, ky] = withOffset(form, 'kicker', 185, 315);
  drawKicker(ctx, form.kicker, kx, ky, '#111111');
  drawTitleBlock(ctx, form.title, tx, ty, 700, 94, 58, '#050505', 'center', 4, '900');
  drawMarker(ctx, hx - 270, hy - 45, 540, 90, '#fff0b8', 0.01);
  drawTitleBlock(ctx, form.highlight, hx, hy, 620, 86, 56, form.accent, 'center', 2, '900');
  drawSubtitle(ctx, form.subtitle, sx, sy, 650, '#1f2937');
  drawEmoji(ctx, form.sticker, ex, ey, 90);
  drawDoodleStar(ctx, ex, ey - 30, '#e9b9ff');
}

function drawSketchPaper(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#dff4ff');
  drawLoosePaper(ctx, 150, 225, 780, 980, '#65bdf0');
  const [kx, ky] = withOffset(form, 'kicker', 165, 245);
  const [tx, ty] = withOffset(form, 'title', 540, 555);
  const [hx, hy] = withOffset(form, 'highlight', 540, 840);
  const [sx, sy] = withOffset(form, 'subtitle', 540, 1045);
  const [ex, ey] = withOffset(form, 'sticker', 800, 335);
  drawKicker(ctx, form.kicker, kx, ky, '#65bdf0');
  drawTitleBlock(ctx, form.title, tx, ty, 680, 106, 66, '#62b5eb', 'center', 4, '900');
  drawSquiggle(ctx, tx - 190, ty + 205, 380, '#62b5eb', 16);
  drawTitleBlock(ctx, form.highlight, hx, hy, 680, 92, 58, form.accent, 'center', 2, '900');
  drawSubtitle(ctx, form.subtitle, sx, sy, 600, '#62b5eb');
  drawEmoji(ctx, form.sticker, ex, ey, 90);
  drawSimpleLaptop(ctx, 200, 1110, '#9bd4f5');
}

function drawChecklist(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#bde8ff');
  roundedRect(ctx, 120, 165, 840, 1100, 42, '#fffdf6');
  drawLinedPaper(ctx, 160, 245, 760, 910, '#e7e1d1');
  drawBinding(ctx);
  drawTape(ctx, 640, 140, 190, 52, '#f5c242', -0.02);
  const [kx, ky] = withOffset(form, 'kicker', 170, 230);
  const [tx, ty] = withOffset(form, 'title', 535, 430);
  const [hx, hy] = withOffset(form, 'highlight', 540, 575);
  const [px, py] = withOffset(form, 'points', 245, 800);
  const [ex, ey] = withOffset(form, 'sticker', 800, 1110);
  drawKicker(ctx, form.kicker, kx, ky, '#1e3a8a');
  drawTitleBlock(ctx, form.title, tx, ty, 700, 94, 58, '#050505', 'center', 3, '900');
  drawMarker(ctx, hx - 265, hy - 65, 420, 72, '#fde68a', -0.02);
  drawTitleBlock(ctx, form.highlight, hx, hy, 560, 72, 48, form.accent, 'center', 2, '900');
  drawPoints(ctx, form.points, px, py, 620, form.accent);
  drawEmoji(ctx, form.sticker, ex, ey, 115);
}

function drawPurpleGrid(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#7c3aed');
  drawGrid(ctx, 36, 'rgba(255,255,255,0.12)', 0, 0, W, H);
  roundedRect(ctx, 80, 90, 920, 1260, 34, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.16)', 3);
  const [kx, ky] = withOffset(form, 'kicker', 120, 135);
  const [tx, ty] = withOffset(form, 'title', 155, 500);
  const [hx, hy] = withOffset(form, 'highlight', 155, 765);
  const [sx, sy] = withOffset(form, 'subtitle', 535, 1050);
  const [ex, ey] = withOffset(form, 'sticker', 835, 1090);
  drawKicker(ctx, form.kicker, kx, ky, '#d8b4fe');
  drawTitleBlock(ctx, form.title, tx, ty, 770, 104, 66, '#ffffff', 'left', 5, '900');
  drawMarker(ctx, hx - 8, hy - 54, 540, 76, '#facc15', -0.02);
  drawTitleBlock(ctx, form.highlight, hx + 250, hy, 560, 82, 54, '#111111', 'center', 2, '900');
  drawSquiggle(ctx, tx + 20, ty + 215, 330, '#22d3ee', 18);
  drawSubtitle(ctx, form.subtitle, sx, sy, 720, '#ffffff');
  drawEmoji(ctx, form.sticker, ex, ey, 112);
  drawCornerTriangle(ctx, 930, 1260, '#111111');
}

function drawStampCard(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#fff7ed');
  roundedRect(ctx, 95, 120, 890, 1190, 18, '#fffdf8', '#ef4444', 12);
  drawLinedPaper(ctx, 140, 245, 800, 900, '#f1e4d8');
  const [kx, ky] = withOffset(form, 'kicker', 145, 170);
  const [tx, ty] = withOffset(form, 'title', 540, 520);
  const [hx, hy] = withOffset(form, 'highlight', 540, 775);
  const [sx, sy] = withOffset(form, 'subtitle', 540, 1035);
  const [ex, ey] = withOffset(form, 'sticker', 820, 1115);
  drawKicker(ctx, form.kicker, kx, ky, '#7f1d1d');
  drawTitleBlock(ctx, form.title, tx, ty, 760, 98, 60, '#111111', 'center', 4, '900');
  drawStamp(ctx, hx, hy, 500, 145, form.accent);
  drawTitleBlock(ctx, form.highlight, hx, hy, 500, 76, 48, form.accent, 'center', 2, '900');
  drawSubtitle(ctx, form.subtitle, sx, sy, 680, '#7f1d1d');
  drawEmoji(ctx, form.sticker, ex, ey, 118);
}

function drawQaCard(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#edf7ff');
  roundedRect(ctx, 90, 120, 900, 1180, 38, '#ffffff');
  drawDotGrid(ctx, 42, '#dbeafe', 120, 150, 840, 1100);
  const [kx, ky] = withOffset(form, 'kicker', 140, 170);
  const [tx, ty] = withOffset(form, 'title', 540, 465);
  const [hx, hy] = withOffset(form, 'highlight', 540, 760);
  const [px, py] = withOffset(form, 'points', 230, 920);
  const [ex, ey] = withOffset(form, 'sticker', 835, 360);
  drawKicker(ctx, form.kicker, kx, ky, '#0369a1');
  roundedRect(ctx, tx - 390, ty - 160, 780, 280, 32, '#e0f2fe', '#0ea5e9', 5);
  drawTitleBlock(ctx, form.title, tx, ty, 700, 88, 56, '#0f172a', 'center', 4, '900');
  roundedRect(ctx, hx - 330, hy - 78, 660, 132, 28, '#fff7ed', '#f97316', 4);
  drawTitleBlock(ctx, form.highlight, hx, hy, 560, 72, 46, form.accent, 'center', 2, '900');
  drawPoints(ctx, form.points, px, py, 620, form.accent);
  drawEmoji(ctx, form.sticker, ex, ey, 128);
}

function drawMemoStack(ctx: CanvasRenderingContext2D, form: CoverForm) {
  fill(ctx, '#e8f2ff');
  roundedRect(ctx, 160, 160, 780, 1060, 34, '#9dc7f7');
  roundedRect(ctx, 115, 225, 790, 1040, 28, '#f8f1dc');
  drawLinedPaper(ctx, 155, 310, 710, 750, '#e7dbc2');
  drawTape(ctx, 620, 190, 210, 58, form.accent, -0.04);
  const [kx, ky] = withOffset(form, 'kicker', 165, 285);
  const [tx, ty] = withOffset(form, 'title', 540, 545);
  const [hx, hy] = withOffset(form, 'highlight', 540, 790);
  const [sx, sy] = withOffset(form, 'subtitle', 540, 1015);
  const [ex, ey] = withOffset(form, 'sticker', 225, 735);
  drawKicker(ctx, form.kicker, kx, ky, '#1d4ed8');
  drawTitleBlock(ctx, form.title, tx, ty, 690, 92, 56, '#111111', 'center', 4, '900');
  drawMarker(ctx, hx - 315, hy - 55, 630, 86, '#fde68a', -0.03);
  drawTitleBlock(ctx, form.highlight, hx, hy, 560, 76, 48, '#111111', 'center', 2, '900');
  drawSubtitle(ctx, form.subtitle, sx, sy, 640, '#1d4ed8');
  drawEmoji(ctx, form.sticker, ex, ey, 100);
}

function fill(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

function font(weight: string, size: number) {
  return `${weight} ${size}px ${FONT}`;
}

function withOffset(form: CoverForm, layer: LayerId, x: number, y: number): [number, number] {
  const offset = form.offsets[layer] || { x: 0, y: 0 };
  return [x + offset.x, y + offset.y];
}

function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startSize: number,
  minSize: number,
  color: string,
  align: CanvasTextAlign,
  maxLines: number,
  weight = '900',
) {
  const clean = (text || '').trim() || '填写标题';
  let size = startSize;
  let lines = wrapLines(ctx, clean, maxWidth, maxLines);
  while (size > minSize) {
    ctx.font = font(weight, size);
    lines = wrapLines(ctx, clean, maxWidth, maxLines);
    const tooWide = lines.some((line) => ctx.measureText(line).width > maxWidth);
    if (!tooWide && lines.length <= maxLines) break;
    size -= 4;
  }

  ctx.save();
  ctx.font = font(weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const lineHeight = size * 1.16;
  lines.forEach((line, i) => {
    const lineY = y + (i - (lines.length - 1) / 2) * lineHeight;
    ctx.fillText(line, x, lineY);
  });
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const result: string[] = [];
  const rawLines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (const rawLine of rawLines) {
    let line = '';
    for (const char of Array.from(rawLine)) {
      const test = line + char;
      if (line && ctx.measureText(test).width > maxWidth) {
        result.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  if (result.length <= maxLines) return result;
  const clipped = result.slice(0, maxLines);
  clipped[maxLines - 1] = clipped[maxLines - 1].replace(/[，。,.!?！？、；;：:]?$/, '') + '…';
  return clipped;
}

function drawKicker(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.save();
  ctx.font = font('800', 30);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText((text || 'GIFFGAFF TIPS').toUpperCase(), x, y);
  ctx.restore();
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, color: string) {
  if (!text.trim()) return;
  ctx.save();
  ctx.font = font('800', 38);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapLines(ctx, text, maxWidth, 2);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * 48));
  ctx.restore();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fillColor: string, strokeColor?: string, lineWidth = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor && lineWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, step: number, color: string, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let cx = x; cx <= x + w; cx += step) {
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + h);
    ctx.stroke();
  }
  for (let cy = y; cy <= y + h; cy += step) {
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDotGrid(ctx: CanvasRenderingContext2D, step: number, color: string, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = color;
  for (let cx = x; cx <= x + w; cx += step) {
    for (let cy = y; cy <= y + h; cy += step) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLinedPaper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let cy = y; cy <= y + h; cy += 58) {
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, rotate: number) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotate);
  ctx.globalAlpha = 0.9;
  roundedRect(ctx, -w / 2, -h / 2, w, h, 18, color);
  ctx.restore();
}

function drawSquiggle(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, lineWidth: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < width; i += 42) {
    ctx.quadraticCurveTo(x + i + 20, y + 24, x + i + 42, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, rotate: number) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotate);
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawPaperCurl(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y + 80);
  ctx.quadraticCurveTo(x + 100, y + 20, x + 225, y + 120);
  ctx.lineTo(x + 52, y + 130);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number, color?: string) {
  if (!emoji.trim()) return;
  ctx.save();
  ctx.font = `900 ${size}px "Apple Color Emoji", "Segoe UI Emoji", ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || '#111111';
  ctx.fillText(emoji.slice(0, 6), x, y);
  ctx.restore();
}

function drawCornerTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 36, y);
  ctx.lineTo(x + 36, y - 36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#fffef8';
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 95, y + 20);
  ctx.lineTo(x + w - 105, y);
  ctx.lineTo(x + w - 40, y + 205);
  ctx.lineTo(x + w - 72, y + h - 40);
  ctx.lineTo(x + w - 230, y + h - 10);
  ctx.lineTo(x + w - 185, y + h + 110);
  ctx.lineTo(x + w - 365, y + h - 40);
  ctx.lineTo(x + 70, y + h - 45);
  ctx.lineTo(x + 25, y + 520);
  ctx.lineTo(x + 45, y + 150);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDoodleStar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 16;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 60);
  ctx.lineTo(x + 32, y - 14);
  ctx.lineTo(x + 88, y - 5);
  ctx.lineTo(x + 48, y + 28);
  ctx.lineTo(x + 58, y + 84);
  ctx.lineTo(x, y + 54);
  ctx.lineTo(x - 54, y + 84);
  ctx.lineTo(x - 42, y + 28);
  ctx.lineTo(x - 86, y - 5);
  ctx.lineTo(x - 30, y - 14);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawLoosePaper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.fillStyle = '#fffef8';
  ctx.beginPath();
  ctx.moveTo(x + 30, y + 40);
  ctx.quadraticCurveTo(x + 380, y - 35, x + w - 20, y + 45);
  ctx.lineTo(x + w - 55, y + h - 30);
  ctx.quadraticCurveTo(x + 365, y + h + 15, x + 12, y + h - 48);
  ctx.lineTo(x + 5, y + 90);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSimpleLaptop(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.75;
  ctx.strokeRect(x, y, 160, 92);
  ctx.beginPath();
  ctx.moveTo(x - 30, y + 112);
  ctx.lineTo(x + 190, y + 112);
  ctx.lineTo(x + 150, y + 145);
  ctx.lineTo(x + 5, y + 145);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawBinding(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = '#050505';
  for (let x = 210; x <= 820; x += 150) {
    roundedRect(ctx, x, 100, 54, 112, 28, '#050505');
  }
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(160, 160);
  ctx.lineTo(915, 160);
  ctx.stroke();
  ctx.restore();
}

function drawStamp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.035);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.setLineDash([22, 12]);
  roundedRect(ctx, -w / 2, -h / 2, w, h, 22, 'rgba(255,255,255,0)', color, 10);
  ctx.restore();
}

function drawPoints(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, accent: string) {
  const points = text.split(/\n+/).map((point) => point.trim()).filter(Boolean).slice(0, 4);
  ctx.save();
  ctx.textBaseline = 'top';
  points.forEach((point, index) => {
    const cy = y + index * 88;
    roundedRect(ctx, x - 70, cy - 8, 44, 44, 12, accent);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 58, cy + 12);
    ctx.lineTo(x - 48, cy + 24);
    ctx.lineTo(x - 30, cy + 2);
    ctx.stroke();

    ctx.font = font('800', 42);
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'left';
    const lines = wrapLines(ctx, point, maxWidth, 2);
    lines.forEach((line, lineIndex) => ctx.fillText(line, x, cy - 8 + lineIndex * 46));
  });
  ctx.restore();
}

function getLayerRects(form: CoverForm): { layer: LayerId; rect: Rect }[] {
  const rects = templateRects[form.template];
  return dragLayers.map((layer) => ({ layer, rect: addOffset(rects[layer], form.offsets[layer]) }));
}

function getLayerRect(form: CoverForm, layer: LayerId) {
  return getLayerRects(form).find((item) => item.layer === layer)?.rect || addOffset(templateRects[form.template].title, form.offsets.title);
}

function addOffset(rect: Rect, offset: Point): Rect {
  return { ...rect, x: rect.x + offset.x, y: rect.y + offset.y };
}

function containsPoint(rect: Rect, point: Point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function drawSelection(ctx: CanvasRenderingContext2D, rect: Rect) {
  ctx.save();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 10]);
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 18, 'rgba(255,255,255,0)', '#2563eb', 5);
  ctx.restore();
}

const templateRects: Record<TemplateId, Record<LayerId, Rect>> = {
  'grid-pop': {
    kicker: { x: 140, y: 235, w: 330, h: 58 },
    title: { x: 150, y: 360, w: 780, h: 250 },
    highlight: { x: 220, y: 645, w: 640, h: 150 },
    subtitle: { x: 205, y: 905, w: 670, h: 110 },
    points: { x: 220, y: 810, w: 650, h: 270 },
    sticker: { x: 690, y: 910, w: 210, h: 230 },
  },
  'blue-value': {
    kicker: { x: 150, y: 1268, w: 360, h: 55 },
    title: { x: 140, y: 290, w: 800, h: 470 },
    highlight: { x: 205, y: 1000, w: 680, h: 130 },
    subtitle: { x: 205, y: 1000, w: 680, h: 130 },
    points: { x: 210, y: 820, w: 650, h: 240 },
    sticker: { x: 690, y: 240, w: 190, h: 190 },
  },
  'yellow-tips': {
    kicker: { x: 160, y: 108, w: 360, h: 55 },
    title: { x: 170, y: 340, w: 740, h: 360 },
    highlight: { x: 225, y: 850, w: 620, h: 140 },
    subtitle: { x: 210, y: 1030, w: 650, h: 120 },
    points: { x: 230, y: 920, w: 620, h: 240 },
    sticker: { x: 780, y: 980, w: 150, h: 160 },
  },
  'speech-note': {
    kicker: { x: 175, y: 305, w: 360, h: 55 },
    title: { x: 185, y: 360, w: 710, h: 265 },
    highlight: { x: 245, y: 565, w: 610, h: 145 },
    subtitle: { x: 205, y: 880, w: 690, h: 120 },
    points: { x: 230, y: 930, w: 620, h: 250 },
    sticker: { x: 95, y: 1035, w: 160, h: 170 },
  },
  'sketch-paper': {
    kicker: { x: 155, y: 235, w: 380, h: 60 },
    title: { x: 195, y: 360, w: 700, h: 280 },
    highlight: { x: 200, y: 770, w: 680, h: 140 },
    subtitle: { x: 240, y: 995, w: 600, h: 115 },
    points: { x: 230, y: 920, w: 620, h: 240 },
    sticker: { x: 730, y: 265, w: 150, h: 150 },
  },
  checklist: {
    kicker: { x: 160, y: 220, w: 380, h: 58 },
    title: { x: 185, y: 320, w: 700, h: 210 },
    highlight: { x: 260, y: 520, w: 560, h: 110 },
    subtitle: { x: 220, y: 645, w: 640, h: 110 },
    points: { x: 170, y: 780, w: 750, h: 380 },
    sticker: { x: 725, y: 1010, w: 160, h: 170 },
  },
  'purple-grid': {
    kicker: { x: 110, y: 125, w: 400, h: 60 },
    title: { x: 125, y: 330, w: 820, h: 330 },
    highlight: { x: 145, y: 680, w: 670, h: 150 },
    subtitle: { x: 180, y: 1005, w: 740, h: 115 },
    points: { x: 210, y: 880, w: 650, h: 250 },
    sticker: { x: 755, y: 990, w: 165, h: 170 },
  },
  'stamp-card': {
    kicker: { x: 135, y: 160, w: 390, h: 58 },
    title: { x: 160, y: 355, w: 760, h: 270 },
    highlight: { x: 260, y: 700, w: 560, h: 155 },
    subtitle: { x: 210, y: 990, w: 660, h: 115 },
    points: { x: 210, y: 910, w: 650, h: 260 },
    sticker: { x: 735, y: 1010, w: 170, h: 180 },
  },
  'qa-card': {
    kicker: { x: 130, y: 160, w: 390, h: 58 },
    title: { x: 150, y: 310, w: 780, h: 300 },
    highlight: { x: 205, y: 690, w: 670, h: 150 },
    subtitle: { x: 210, y: 820, w: 640, h: 110 },
    points: { x: 160, y: 900, w: 760, h: 300 },
    sticker: { x: 740, y: 250, w: 180, h: 190 },
  },
  'memo-stack': {
    kicker: { x: 155, y: 275, w: 390, h: 58 },
    title: { x: 190, y: 390, w: 700, h: 250 },
    highlight: { x: 220, y: 720, w: 650, h: 140 },
    subtitle: { x: 230, y: 970, w: 630, h: 115 },
    points: { x: 220, y: 885, w: 640, h: 240 },
    sticker: { x: 155, y: 660, w: 150, h: 160 },
  },
};
