import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import engineSource from './particle-engine.js?raw';
import './particle-engine.js';
import {
  Atom, Check, CheckCircle2, ChevronDown, Circle, Code2, Copy, Download, FilePlus2,
  Heart, ImagePlus, Layers3, Maximize2, MoreHorizontal, MousePointer2, Orbit,
  Palette, Pause, Play, Plus, RotateCcw, Save, SlidersHorizontal, Sparkles, Star,
  Type, Upload, Waves, X, Zap,
} from 'lucide-react';

const EDGES = { Balanced: 144, High: 192, Ultra: 256 };
const DEFAULT_SOURCE = { type: 'text', content: 'MAKE\nMATTER.', font: 'serif', italic: true };
const DEFAULT_SETTINGS = {
  palette: ['#83e5ff', '#8f76ff', '#ffbb83'], background: '#090b12',
  size: 3.2, glow: 0.78, intensity: 0.88, motion: 0.7, turbulence: 0.64,
  repel: 0.34, grain: 0.48, stars: 0.72, twinkle: 0.45, duration: 1.45,
  quality: 'Balanced', imageColors: true, loop: false,
};
const PRESETS = [
  { id: 'orb', name: 'Liquid core', icon: Circle, note: 'Soft sphere' },
  { id: 'galaxy', name: 'Spiral galaxy', icon: Orbit, note: 'Three arms' },
  { id: 'heart', name: 'Heart', icon: Heart, note: 'A little love' },
  { id: 'orbit', name: 'Orbitals', icon: Atom, note: 'Crossing rings' },
  { id: 'wave', name: 'Waveform', icon: Waves, note: 'Living signal' },
  { id: 'star', name: 'Supernova', icon: Star, note: 'Radiant form' },
  { id: 'scatter', name: 'Scatter cloud', icon: Sparkles, note: 'Open formation' },
];
const PALETTES = [
  { name: 'Aurora', colors: ['#83e5ff', '#8f76ff', '#ffbb83'] },
  { name: 'Solar', colors: ['#fff3bc', '#ff9e69', '#ff5b7e'] },
  { name: 'Glacier', colors: ['#d7fff4', '#53d5c3', '#718eff'] },
  { name: 'Orchid', colors: ['#f4c9ff', '#cb70ff', '#ff8dbb'] },
];
const clone = (value) => JSON.parse(JSON.stringify(value));
const makeId = () => 'scene-' + Math.random().toString(36).slice(2, 9);

function sourceName(source) {
  if (source.type === 'text') return source.content.replace(/\n/g, ' ').trim() || 'Untitled text';
  if (source.type === 'image') return source.name || 'Image shape';
  return (PRESETS.find((item) => item.id === source.preset) || {}).name || 'Particle form';
}

function targetForSource(source, count, aspect) {
  const engine = window.ParticleEngine;
  if (source.type === 'preset') return engine.buildPresetTarget(source.preset || 'orb', count, aspect, { color: '#83e5ff' });
  if (source.type === 'image' && source.data) return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(engine.buildImageTarget(image, count, aspect));
    image.onerror = reject;
    image.src = source.data;
  });
  return engine.buildTextTarget(source.content || 'PARTICLE', count, aspect, { font: source.font || 'serif', italic: source.italic !== false });
}

function standaloneRunner(projectData) {
  const canvas = document.getElementById('scene');
  const status = document.getElementById('status');
  const progress = document.getElementById('progress-fill');
  const settings = projectData.settings;
  const cues = projectData.cues && projectData.cues.length ? projectData.cues : [{ source: projectData.source, name: 'Scene' }];
  const edge = ({ Balanced: 144, High: 192, Ultra: 224 })[settings.quality] || 144;
  const count = edge * edge;
  let engine;
  let active = 0;
  let playing = false;
  let run = 0;
  const aspect = () => canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const makeTarget = (source) => {
    if (source.type === 'preset') return Promise.resolve(ParticleEngine.buildPresetTarget(source.preset || 'orb', count, aspect(), { color: settings.palette[0] }));
    if (source.type === 'image' && source.data) return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(ParticleEngine.buildImageTarget(image, count, aspect()));
      image.onerror = reject;
      image.src = source.data;
    });
    return Promise.resolve(ParticleEngine.buildTextTarget(source.content || 'PARTICLE', count, aspect(), { font: source.font || 'serif', italic: source.italic !== false }));
  };
  const applySettings = () => engine.setParams(Object.assign({}, settings, { imageMix: settings.imageColors ? 0.94 : 0 }));
  const reform = async () => {
    if (!engine) return;
    const cue = cues[active] || cues[0];
    const target = await makeTarget(cue.source);
    applySettings();
    engine.setTarget(target, settings.duration || 1.4);
    status.textContent = 'Reforming';
    progress.style.width = '100%';
    window.setTimeout(() => {
      if (status.textContent === 'Reforming') {
        status.textContent = cue.name || 'Ready';
        progress.style.width = '0';
      }
    }, (settings.duration || 1.4) * 1000);
  };
  const play = async () => {
    if (playing) {
      playing = false;
      run++;
      document.getElementById('play').textContent = 'Play sequence';
      status.textContent = 'Paused';
      return;
    }
    playing = true;
    const ownRun = ++run;
    document.getElementById('play').textContent = 'Pause';
    let index = active;
    while (playing && ownRun === run) {
      const cue = cues[index];
      status.textContent = cue.name || 'Scene ' + (index + 1);
      progress.style.width = '0';
      engine.setTarget(await makeTarget(cue.source), settings.duration || 1.4);
      await new Promise((resolve) => window.setTimeout(resolve, (settings.duration || 1.4) * 1000 + 220));
      if (!playing || ownRun !== run) break;
      active = index;
      progress.style.width = '100%';
      index++;
      if (index >= cues.length) {
        if (settings.loop) index = 0;
        else {
          playing = false;
          document.getElementById('play').textContent = 'Play sequence';
          status.textContent = 'Sequence complete';
        }
      }
    }
  };
  makeTarget(cues[0].source).then((target) => {
    engine = ParticleEngine.create(canvas, { edge, target, ...settings, imageMix: settings.imageColors ? 0.94 : 0 });
    applySettings();
    document.getElementById('replay').onclick = reform;
    document.getElementById('play').onclick = play;
    window.addEventListener('resize', () => makeTarget(cues[active].source).then((next) => engine.setTarget(next, 0.28)));
    if (settings.loop) play();
  }).catch((error) => { status.textContent = error.message || 'Could not start this scene'; });
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function buildStandaloneHtml(project, sourceCode) {
  const title = String(project.name || 'Particle scene').replace(/[<>&]/g, '');
  const runtime = sourceCode.replace(/<\/script/gi, '<\\/script');
  const runner = '(' + standaloneRunner.toString() + ')(' + safeJson(project) + ');';
  const head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="' + project.settings.background + '"><title>' + title + '</title>' +
    '<style>*{box-sizing:border-box}html,body{height:100%;margin:0;background:#07080d;color:#f4f4f6;font:13px/1.4 Inter,ui-sans-serif,system-ui,sans-serif}body{overflow:hidden}.scene{position:relative;width:100%;height:100%;min-height:320px;background:#07080d}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.bar{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;align-items:center;gap:9px;padding:8px 11px;border:1px solid #ffffff1c;border-radius:14px;background:#101116dd;backdrop-filter:blur(18px);box-shadow:0 16px 44px #0007}.bar button{height:34px;border:0;border-radius:9px;padding:0 12px;background:#202127;color:#f7f7fa;font:inherit;cursor:pointer}.bar button.primary{background:#c8f169;color:#11130c;font-weight:700}.label{color:#92939e;font-size:11px;letter-spacing:.13em;text-transform:uppercase}.progress{width:95px;height:3px;border-radius:4px;background:#34353d;overflow:hidden}.progress i{display:block;width:0;height:100%;background:#c8f169;transition:width .2s}.badge{position:absolute;left:24px;top:22px;color:#a0a1ab;font-size:11px;letter-spacing:.14em;text-transform:uppercase}.badge b{color:#f3f3f6;font-weight:650}@media(max-width:540px){.bar{bottom:14px}.progress{width:54px}.badge{left:14px;top:14px}}</style></head><body>' +
    '<main class="scene"><canvas id="scene"></canvas><div class="badge"><b>' + title + '</b> · GPU particle experience</div><div class="bar"><span class="label" id="status">Ready</span><div class="progress"><i id="progress-fill"></i></div><button id="replay">Reform</button><button class="primary" id="play">Play sequence</button></div></main>';
  return head + '\n<script>' + runtime + '</script>\n<script>' + runner + '</script></body></html>';
}

function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const noticeTimer = useRef(0);
  const playingRef = useRef(false);
  const playRun = useRef(0);
  const imageInput = useRef(null);
  const projectInput = useRef(null);
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cues, setCues] = useState([{ id: makeId(), name: 'First light', source: DEFAULT_SOURCE }]);
  const [selectedCue, setSelectedCue] = useState(0);
  const [tab, setTab] = useState('Look');
  const [projectName, setProjectName] = useState('Untitled scene');
  const [saved, setSaved] = useState(true);
  const [notice, setNotice] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportHtml, setExportHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [metrics, setMetrics] = useState({ fps: 60, scale: 0.88, count: EDGES.Balanced * EDGES.Balanced });
  const edge = EDGES[settings.quality] || EDGES.Balanced;
  const project = useMemo(() => ({ version: 1, name: projectName, source, cues, settings }), [projectName, source, cues, settings]);
  const sourceRef = useRef(source);
  const settingsRef = useRef(settings);
  sourceRef.current = source;
  settingsRef.current = settings;

  const flash = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2200);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('particle-studio-project');
      if (stored) {
        const loaded = JSON.parse(stored);
        if (loaded.version === 1) {
          setProjectName(loaded.name || 'Untitled scene');
          setSettings({ ...DEFAULT_SETTINGS, ...(loaded.settings || {}) });
          setSource(loaded.source || DEFAULT_SOURCE);
          setCues(loaded.cues?.length ? loaded.cues : [{ id: makeId(), name: 'First light', source: loaded.source || DEFAULT_SOURCE }]);
        }
      }
    } catch { /* Local storage can be disabled by the browser. */ }
  }, []);

  useEffect(() => {
    setSaved(false);
    const timeout = window.setTimeout(() => {
      try {
        const packed = JSON.stringify(project);
        if (packed.length < 2600000) {
          localStorage.setItem('particle-studio-project', packed);
          setSaved(true);
        }
      } catch { /* Keep editing if browser storage is full. */ }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [project]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let alive = true;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const initialSource = sourceRef.current;
    Promise.resolve(targetForSource(initialSource, edge * edge, aspect)).then((target) => {
      if (!alive) return;
      try {
        const engine = window.ParticleEngine.create(canvas, {
          edge, target, ...settingsRef.current,
          imageMix: initialSource.type === 'image' && settingsRef.current.imageColors ? 0.94 : 0,
          onMetrics: (value) => setMetrics({ fps: value.fps, scale: value.scale, count: value.count }),
        });
        engineRef.current = engine;
        const latest = settingsRef.current;
        const latestSource = sourceRef.current;
        engine.setParams({ ...latest, imageMix: latestSource.type === 'image' && latest.imageColors ? 0.94 : 0 });
        if (latestSource !== initialSource) {
          Promise.resolve(targetForSource(latestSource, edge * edge, aspect)).then((next) => {
            if (alive && engineRef.current === engine) engine.setTarget(next, latest.duration);
          });
        }
      } catch (error) { flash(error.message || 'Could not start the WebGL renderer'); }
    }).catch((error) => flash(error.message || 'Could not build this shape'));
    return () => {
      alive = false;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [edge, flash]);

  useEffect(() => {
    if (!engineRef.current) return undefined;
    let alive = true;
    const timeout = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      Promise.resolve(targetForSource(source, edge * edge, canvas.clientWidth / Math.max(1, canvas.clientHeight))).then((target) => {
        if (!alive || !engineRef.current) return;
        engineRef.current.setParams({ ...settings, imageMix: source.type === 'image' && settings.imageColors ? 0.94 : 0 });
        engineRef.current.setTarget(target, settings.duration);
      }).catch((error) => flash(error.message || 'Could not build this shape'));
    }, source.type === 'text' ? 180 : 30);
    return () => { alive = false; window.clearTimeout(timeout); };
  }, [source, settings.quality, settings.imageColors, settings.duration, edge, flash]);

  useEffect(() => {
    engineRef.current?.setParams({ ...settings, imageMix: source.type === 'image' && settings.imageColors ? 0.94 : 0 });
  }, [settings, source.type]);

  useEffect(() => {
    const update = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const setCurrentSource = (next) => {
    setSource(next);
    setCues((items) => items.map((cue, index) => index === selectedCue ? { ...cue, name: sourceName(next).slice(0, 28), source: clone(next) } : cue));
    setSaved(false);
  };
  const updateSettings = (changes) => {
    setSettings((old) => ({ ...old, ...changes }));
    setSaved(false);
  };
  const choosePreset = (id) => {
    setCurrentSource({ type: 'preset', preset: id });
    flash((PRESETS.find((item) => item.id === id) || {}).name + ' is forming');
  };

  const onImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1100 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      setCurrentSource({ type: 'image', data: canvas.toDataURL('image/webp', 0.8), name: file.name.replace(/\.[^.]+$/, '') || 'Image shape' });
      URL.revokeObjectURL(url);
      flash('Image sampled into GPU particles');
    };
    image.onerror = () => { URL.revokeObjectURL(url); flash('Could not read that image'); };
    image.src = url;
  };

  const addCue = () => {
    const cue = { id: makeId(), name: sourceName(source).slice(0, 28), source: clone(source) };
    setCues((items) => [...items, cue]);
    setSelectedCue(cues.length);
    setSaved(false);
    flash('Scene added to your sequence');
  };
  const chooseCue = (index) => {
    if (!cues[index]) return;
    setSelectedCue(index);
    setSource(clone(cues[index].source));
  };

  const handlePointer = (event, active) => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    engineRef.current.setPointer((x * 2 - 1) * rect.width / rect.height, 1 - y * 2, active);
  };

  const toggleSequence = async () => {
    if (playingRef.current) {
      playingRef.current = false;
      playRun.current += 1;
      setPlaying(false);
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    const run = ++playRun.current;
    let index = selectedCue;
    while (playingRef.current && run === playRun.current && cues[index]) {
      const cue = cues[index];
      try {
        const target = await targetForSource(cue.source, edge * edge, canvasRef.current.clientWidth / Math.max(1, canvasRef.current.clientHeight));
        if (!playingRef.current || !engineRef.current) break;
        engineRef.current.setParams({ ...settings, imageMix: cue.source.type === 'image' && settings.imageColors ? 0.94 : 0 });
        engineRef.current.setTarget(target, settings.duration);
        flash('Scene ' + (index + 1) + ' · ' + cue.name);
      } catch (error) { flash(error.message || 'Could not build scene'); }
      await new Promise((resolve) => window.setTimeout(resolve, settings.duration * 1000 + 300));
      if (!playingRef.current || run !== playRun.current) break;
      index += 1;
      if (index >= cues.length) {
        if (settings.loop) index = 0;
        else break;
      }
    }
    if (run === playRun.current) {
      playingRef.current = false;
      setPlaying(false);
    }
  };

  const animateSelected = async () => {
    const cue = cues[selectedCue] || { source };
    if (!engineRef.current) return;
    const target = await targetForSource(cue.source, edge * edge, canvasRef.current.clientWidth / Math.max(1, canvasRef.current.clientHeight));
    engineRef.current.setParams({ ...settings, imageMix: cue.source.type === 'image' && settings.imageColors ? 0.94 : 0 });
    engineRef.current.setTarget(target, settings.duration);
    flash('Reforming ' + (cue.name || 'scene'));
  };

  const saveProject = () => {
    try {
      localStorage.setItem('particle-studio-project', JSON.stringify(project));
      setSaved(true);
      flash('Project saved on this device');
    } catch { flash('Browser storage is full. Download a JSON copy instead.'); }
  };
  const downloadFile = (name, content, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadProject = () => {
    const name = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'particle-scene';
    downloadFile(name + '.particle.json', JSON.stringify(project, null, 2), 'application/json');
    flash('Editable project JSON downloaded');
  };
  const openProject = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const loaded = JSON.parse(await file.text());
      if (loaded.version !== 1) throw new Error('Unsupported project version');
      setProjectName(loaded.name || 'Imported scene');
      setSettings({ ...DEFAULT_SETTINGS, ...(loaded.settings || {}) });
      setSource(loaded.source || DEFAULT_SOURCE);
      setCues(loaded.cues?.length ? loaded.cues : [{ id: makeId(), name: 'Imported scene', source: loaded.source || DEFAULT_SOURCE }]);
      setSelectedCue(0);
      flash('Project opened');
    } catch (error) { flash(error.message || 'Could not open project'); }
    event.target.value = '';
  };
  const openExport = () => {
    const html = buildStandaloneHtml(project, engineSource);
    try {
      new Function(engineSource);
      const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
      scripts.forEach((script) => new Function(script.replace(/^<script>/, '').replace(/<\/script>$/, '')));
      if (!html.includes('ParticleEngine.create') || !html.includes('buildImageTarget')) throw new Error('Particle engine missing from export');
      setExportHtml(html);
      setExportOpen(true);
    } catch (error) { flash('Export check failed: ' + error.message); }
  };
  const downloadExport = () => {
    const name = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'particle-scene';
    downloadFile(name + '.html', exportHtml, 'text/html');
    flash('Standalone HTML exported');
  };
  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportHtml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1700);
    } catch { flash('Clipboard access was blocked. Download the HTML instead.'); }
  };
  const toggleFullscreen = () => {
    const stage = document.querySelector('.stage-wrap');
    if (!document.fullscreenElement) stage?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return <div className="studio-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Atom size={17} strokeWidth={1.8} /></div><span>particle<span className="brand-light">/</span>studio</span><span className="version-pill">BETA</span></div>
      <div className="topbar-divider" />
      <div className="project-title"><input aria-label="Project name" value={projectName} onChange={(event) => { setProjectName(event.target.value); setSaved(false); }} /><ChevronDown size={14} /></div>
      <div className="saved-status"><span className={saved ? 'status-dot' : 'status-dot pending'} />{saved ? 'Saved locally' : 'Unsaved changes'}</div>
      <div className="topbar-spacer" />
      <button className="icon-button project-menu" title="Download project JSON" onClick={downloadProject}><MoreHorizontal size={18} /></button>
      <button className="toolbar-button" onClick={saveProject}><Save size={14} />Save</button>
      <button className="export-button" onClick={openExport}><Code2 size={15} />Export code</button>
    </header>
    <div className="workbench">
      <aside className="source-panel panel">
        <div className="panel-heading"><div><span className="eyebrow">01 / CREATE</span><h1>Shape source</h1></div><button className="tiny-icon" title="Open project JSON" onClick={() => projectInput.current?.click()}><FilePlus2 size={15} /></button></div>
        <input ref={projectInput} type="file" accept=".json,.particle.json,application/json" hidden onChange={openProject} />
        <div className="source-tabs">
          <button className={source.type === 'text' ? 'active' : ''} onClick={() => setCurrentSource({ ...DEFAULT_SOURCE, content: source.type === 'text' ? source.content : 'MAKE\nMATTER.' })}><Type size={15} />Text</button>
          <button className={source.type === 'image' ? 'active' : ''} onClick={() => imageInput.current?.click()}><ImagePlus size={15} />Image</button>
          <button className={source.type === 'preset' ? 'active' : ''} onClick={() => choosePreset(source.preset || 'orb')}><Sparkles size={15} />Forms</button>
        </div>
        <input ref={imageInput} type="file" accept="image/*" hidden onChange={(event) => { onImageFile(event.target.files?.[0]); event.target.value = ''; }} />
        {source.type === 'text' && <div className="source-editor">
          <label className="field-label" htmlFor="text-source">Your particle text</label>
          <textarea id="text-source" value={source.content} onChange={(event) => setCurrentSource({ ...source, content: event.target.value })} maxLength={64} spellCheck="false" />
          <div className="field-row between"><span className="helper">Use a line break for a second line</span><span className="counter">{source.content.length}/64</span></div>
          <div className="field-row font-controls"><div className="select-wrap"><select aria-label="Font style" value={source.font || 'serif'} onChange={(event) => setCurrentSource({ ...source, font: event.target.value })}><option value="serif">Editorial serif</option><option value="sans">Modern sans</option><option value="mono">Mono</option></select><ChevronDown size={13} /></div><button aria-label="Toggle italic" className={source.italic ? 'square-toggle active' : 'square-toggle'} onClick={() => setCurrentSource({ ...source, italic: !source.italic })}><span>It</span></button></div>
        </div>}
        {source.type === 'image' && <div className="image-source">
          <div className="image-preview"><img src={source.data} alt="Current particle source" /><button className="replace-image" onClick={() => imageInput.current?.click()}><Upload size={13} />Replace</button></div>
          <div className="image-source-name"><ImagePlus size={14} /><span>{source.name || 'Uploaded image'}</span></div>
          <p className="helper multiline">Transparent images work best. Your image stays in this browser and is embedded into exports.</p>
          <button className="secondary full-width" onClick={() => setCurrentSource(DEFAULT_SOURCE)}><Type size={14} />Switch back to text</button>
        </div>}
        {source.type === 'preset' && <div className="preset-section"><label className="field-label">Built-in formations</label><div className="preset-grid">
          {PRESETS.map((item) => { const Icon = item.icon; return <button key={item.id} className={source.preset === item.id ? 'preset-card selected' : 'preset-card'} onClick={() => choosePreset(item.id)}><span className={'preset-visual visual-' + item.id}><Icon size={19} /></span><span className="preset-name">{item.name}</span><span className="preset-note">{item.note}</span></button>; })}
        </div><button className="secondary full-width top-gap" onClick={() => setCurrentSource(DEFAULT_SOURCE)}><Type size={14} />Make a text shape</button></div>}
        {source.type !== 'image' && source.type !== 'preset' && <button className="upload-card" onClick={() => imageInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onImageFile(event.dataTransfer.files?.[0]); }}><span className="upload-icon"><Upload size={16} /></span><span className="upload-copy"><strong>Or build from an image</strong><small>Drop a PNG, JPG, or WebP</small></span><Plus size={15} className="upload-plus" /></button>}
        <div className="panel-bottom">
          <div className="bottom-label"><span>SCENE SEQUENCE</span><span>{cues.length} {cues.length === 1 ? 'scene' : 'scenes'}</span></div>
          <div className="scene-list">{cues.map((cue, index) => <button key={cue.id} className={index === selectedCue ? 'scene-item active' : 'scene-item'} onClick={() => chooseCue(index)}><span className="scene-index">{String(index + 1).padStart(2, '0')}</span><span className="scene-item-title">{cue.name}</span><span className="scene-kind">{cue.source.type === 'text' ? 'TYPE' : cue.source.type === 'image' ? 'IMAGE' : 'FORM'}</span></button>)}</div>
          <button className="add-scene" onClick={addCue}><Plus size={14} />Add current shape as a scene</button>
          <div className="storage-note"><span className="local-dot" />Runs entirely in your browser</div>
        </div>
      </aside>
      <main className="preview-column">
        <div className="preview-head"><div className="breadcrumb"><span>CANVAS</span><span className="crumb-slash">/</span><strong>{sourceName(source)}</strong></div><div className="preview-tools"><span className="live-pill"><span />LIVE</span><div className="tool-divider" /><button className="icon-button stage-tool" title="Fullscreen preview" onClick={toggleFullscreen}><Maximize2 size={15} /></button><button className="icon-button stage-tool" title="Reform selected shape" onClick={animateSelected}><RotateCcw size={14} /></button></div></div>
        <div className="stage-wrap">
          <canvas ref={canvasRef} className="particle-canvas" aria-label="Live GPU particle scene preview" onPointerMove={(event) => handlePointer(event, true)} onPointerLeave={(event) => handlePointer(event, false)} />
          <div className="stage-grain" />
          <div className="stage-meta top-left"><span className="meta-kicker">PARTICLE FIELD</span><span className="meta-description">Interactive preview <MousePointer2 size={12} /></span></div>
          <div className="stage-meta top-right"><span className="metric"><Zap size={12} />{metrics.fps} <i>FPS</i></span><span className="metric-separator" /><span className="metric">{(metrics.count / 1000).toFixed(1)}k <i>POINTS</i></span><span className="metric-separator" /><span className="metric">{Math.round(metrics.scale * 100)}% <i>RES</i></span></div>
          <div className="crosshair crosshair-tl" /><div className="crosshair crosshair-tr" /><div className="crosshair crosshair-bl" /><div className="crosshair crosshair-br" />
          <div className="center-caption"><span className="caption-line" />DRAG THROUGH THE PARTICLES<span className="caption-line" /></div>
          {isFullscreen && <button className="fullscreen-exit" onClick={toggleFullscreen}><X size={15} />Exit preview</button>}
        </div>
        <div className="timeline">
          <div className="timeline-heading"><div className="timeline-title"><Layers3 size={15} /><strong>Sequence</strong><span className="timeline-count">{String(cues.length).padStart(2, '0')} CUES</span></div><div className="timeline-actions"><label className="loop-toggle"><input type="checkbox" checked={settings.loop} onChange={(event) => updateSettings({ loop: event.target.checked })} /><span className="toggle-track" /><span>Loop</span></label><button className="play-button" onClick={toggleSequence}>{playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}<span>{playing ? 'Pause' : 'Play sequence'}</span></button></div></div>
          <div className="timeline-track"><div className="track-ruler"><span>00:00</span><span>00:0{Math.max(4, cues.length * Math.round(settings.duration + 0.35))}</span><span>END</span></div><div className="track-cues">{cues.map((cue, index) => <button key={cue.id} className={index === selectedCue ? 'cue-block active' : 'cue-block'} onClick={() => chooseCue(index)} style={{ flex: 1 }}><span className="cue-handle" /><span className="cue-title">{cue.name}</span><span className="cue-type">{cue.source.type === 'text' ? 'TEXT' : cue.source.type.toUpperCase()}</span></button>)}<button className="cue-add" title="Add scene" onClick={addCue}><Plus size={15} /></button></div></div>
        </div>
      </main>
      <aside className="inspector-panel panel">
        <div className="inspector-heading"><div><span className="eyebrow">02 / ADJUST</span><h2>Fine-tune</h2></div><button className="tiny-icon" title="Reset settings" onClick={() => updateSettings(tab === 'Look' ? { palette: DEFAULT_SETTINGS.palette, size: DEFAULT_SETTINGS.size, glow: DEFAULT_SETTINGS.glow, intensity: DEFAULT_SETTINGS.intensity, grain: DEFAULT_SETTINGS.grain, stars: DEFAULT_SETTINGS.stars } : { motion: DEFAULT_SETTINGS.motion, turbulence: DEFAULT_SETTINGS.turbulence, repel: DEFAULT_SETTINGS.repel, duration: DEFAULT_SETTINGS.duration })}><RotateCcw size={14} /></button></div>
        <div className="inspector-tabs">{['Look', 'Motion', 'Quality'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'Look' ? <Palette size={14} /> : item === 'Motion' ? <Waves size={14} /> : <SlidersHorizontal size={14} />}{item}</button>)}</div>
        <div className="inspector-scroll">
          {tab === 'Look' && <>
            <section className="control-section"><div className="section-title"><span>COLOR STORY</span><span className="section-hint">3 tones</span></div><div className="palette-row">{PALETTES.map((item) => <button key={item.name} title={item.name} className={settings.palette.join() === item.colors.join() ? 'palette-preset active' : 'palette-preset'} onClick={() => updateSettings({ palette: item.colors })}><span style={{ background: 'linear-gradient(135deg,' + item.colors.join(',') + ')' }} /></button>)}<button className="palette-label" onClick={() => updateSettings({ palette: DEFAULT_SETTINGS.palette })}>Presets</button></div><div className="color-row">{settings.palette.map((color, index) => <label className="color-swatch" key={index} title={'Palette color ' + (index + 1)}><span className="swatch-preview" style={{ background: color }} /><input type="color" value={color} onChange={(event) => { const palette = [...settings.palette]; palette[index] = event.target.value; updateSettings({ palette }); }} /><span>{color.toUpperCase()}</span></label>)}</div></section>
            <section className="control-section"><div className="section-title"><span>PARTICLE FINISH</span><Sparkles size={13} /></div><RangeControl label="Particle size" value={settings.size} min={1} max={8} step={0.1} display={settings.size.toFixed(1)} unit="px" onChange={(value) => updateSettings({ size: value })} /><RangeControl label="Glow" value={settings.glow} min={0} max={1.5} step={0.01} display={Math.round(settings.glow * 100)} unit="%" onChange={(value) => updateSettings({ glow: value })} /><RangeControl label="Light intensity" value={settings.intensity} min={0.2} max={1.6} step={0.01} display={Math.round(settings.intensity * 100)} unit="%" onChange={(value) => updateSettings({ intensity: value })} />{source.type === 'image' && <label className="check-row"><input type="checkbox" checked={settings.imageColors} onChange={(event) => updateSettings({ imageColors: event.target.checked })} /><span className="custom-checkbox"><Check size={11} /></span><span>Keep source image colors</span></label>}</section>
            <section className="control-section compact-section"><div className="section-title"><span>ATMOSPHERE</span></div><div className="background-row"><span>Background</span><label className="bg-picker"><span style={{ background: settings.background }} /><input type="color" value={settings.background} onChange={(event) => updateSettings({ background: event.target.value })} /></label><select value={settings.background} onChange={(event) => updateSettings({ background: event.target.value })}><option value="#090b12">Deep space</option><option value="#08080a">Ink</option><option value="#11101a">Violet dusk</option><option value="#071213">Abyss</option></select></div><RangeControl label="Star field" value={settings.stars} min={0} max={1.4} step={0.01} display={Math.round(settings.stars * 100)} unit="%" onChange={(value) => updateSettings({ stars: value })} /></section>
          </>}
          {tab === 'Motion' && <>
            <section className="control-section"><div className="section-title"><span>FORMATION</span><span className="section-hint">per scene</span></div><RangeControl label="Transition time" value={settings.duration} min={0.3} max={4} step={0.05} display={settings.duration.toFixed(2)} unit="s" onChange={(value) => updateSettings({ duration: value })} /><RangeControl label="Flow turbulence" value={settings.turbulence} min={0} max={1.5} step={0.01} display={Math.round(settings.turbulence * 100)} unit="%" onChange={(value) => updateSettings({ turbulence: value })} /><RangeControl label="Ambient movement" value={settings.motion} min={0} max={2} step={0.01} display={Math.round(settings.motion * 100)} unit="%" onChange={(value) => updateSettings({ motion: value })} /></section>
            <section className="control-section"><div className="section-title"><span>INTERACTION</span><MousePointer2 size={13} /></div><RangeControl label="Cursor repulsion" value={settings.repel} min={0} max={1} step={0.01} display={Math.round(settings.repel * 100)} unit="%" onChange={(value) => updateSettings({ repel: value })} /><div className="tip-card"><div className="tip-icon"><MousePointer2 size={15} /></div><p>Move through the stage. Particles drift away, then flow back into place.</p></div></section>
            <section className="control-section compact-section"><div className="section-title"><span>SCREEN TEXTURE</span></div><RangeControl label="Film grain" value={settings.grain} min={0} max={1.5} step={0.01} display={Math.round(settings.grain * 100)} unit="%" onChange={(value) => updateSettings({ grain: value })} /></section>
          </>}
          {tab === 'Quality' && <>
            <section className="control-section"><div className="section-title"><span>RENDER BUDGET</span><span className="section-hint">adaptive</span></div><p className="quality-intro">The renderer lowers its internal pixel count under load to keep motion smooth. Particle math stays on the GPU.</p><div className="quality-options">{['Balanced', 'High', 'Ultra'].map((item, index) => <button key={item} className={settings.quality === item ? 'quality-option active' : 'quality-option'} onClick={() => updateSettings({ quality: item })}><span className="quality-radio" /><span><strong>{item}</strong><small>{[Math.round(EDGES[item] ** 2 / 1000) + 'k particles · best performance', Math.round(EDGES[item] ** 2 / 1000) + 'k particles · more detail', Math.round(EDGES[item] ** 2 / 1000) + 'k particles · maximum detail'][index]}</small></span></button>)}</div></section>
            <section className="control-section"><div className="section-title"><span>LIVE TELEMETRY</span><span className="metric-live"><i />LIVE</span></div><div className="telemetry-grid"><div><strong>{metrics.fps}</strong><span>FRAMES / SEC</span></div><div><strong>{Math.round(metrics.scale * 100)}%</strong><span>RENDER SCALE</span></div><div><strong>{(metrics.count / 1000).toFixed(1)}k</strong><span>GPU PARTICLES</span></div><div><strong>1</strong><span>PARTICLE DRAW</span></div></div><div className="quality-footnote"><CheckCircle2 size={13} />No per-frame CPU particle updates</div></section>
            <section className="control-section compact-section"><div className="section-title"><span>EXPORT SAFETY</span></div>{['Shader source included', 'Image data self-contained', 'No server dependency'].map((item) => <div className="safety-row" key={item}><span className="safety-check"><Check size={11} /></span><span>{item}</span><CheckCircle2 size={14} className="safety-state" /></div>)}</section>
          </>}
        </div>
        <div className="inspector-foot"><span><span className="foot-led" />WEBGL 2</span><span>GPU ACCELERATED</span></div>
      </aside>
    </div>
    {notice && <div className="toast"><CheckCircle2 size={15} />{notice}</div>}
    {exportOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setExportOpen(false); }}><div className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="modal-top"><div className="modal-icon"><Code2 size={18} /></div><button className="tiny-icon" onClick={() => setExportOpen(false)} aria-label="Close export"><X size={17} /></button></div>
      <span className="eyebrow">READY TO SHIP</span><h2 id="export-title">Your scene, as working code.</h2><p className="modal-description">One self-contained HTML file: shaders, image data, sequence controls, and the particle engine are included. It runs locally with no build step or server.</p>
      <div className="export-validation"><div className="validation-mark"><Check size={14} /></div><div><strong>Export source validated</strong><span>Shader runtime, scene data, and browser entry point are included.</span></div><span className="validation-label">READY</span></div>
      <div className="export-file"><div className="html-file-mark">&lt;/&gt;</div><div><strong>{projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'particle-scene'}.html</strong><span>Standalone · {Math.max(1, (new Blob([exportHtml]).size / 1024)).toFixed(0)} KB</span></div><button className="copy-button" onClick={copyExport}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button></div>
      <div className="modal-actions"><button className="secondary" onClick={() => setExportOpen(false)}>Keep editing</button><button className="export-button modal-download" onClick={downloadExport}><Download size={15} />Download HTML</button></div>
      <button className="json-export-link" onClick={downloadProject}>Also download editable project JSON <ChevronDown size={13} /></button>
    </div></div>}
  </div>;
}

function RangeControl({ label, value, min, max, step, display, unit, onChange }) {
  const fill = (value - min) / (max - min) * 100;
  return <label className="range-control"><span className="range-head"><span>{label}</span><span className="range-value">{display}<i>{unit}</i></span></span><input type="range" min={min} max={max} step={step} value={value} style={{ '--range-fill': fill + '%' }} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export default App;
