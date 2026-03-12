// SacredScrollCanvas.tsx
// Drop-in replacement for the <section className="writing-canvas ..."> section.

import React, { useRef, useEffect, ReactNode } from 'react';

// ── Module-level texture cache ───────────────────────────────────────────────
// Built once per app session; reused instantly on every remount / navigation.
let _texCache: { canvas: HTMLCanvasElement; w: number } | null = null;

interface SacredScrollCanvasProps {
  toolbar: ReactNode;
  children: ReactNode;
}

const SacredScrollCanvas: React.FC<SacredScrollCanvasProps> = ({ toolbar, children }) => {
  const shellRef   = useRef<HTMLDivElement>(null);
  const pZoneRef   = useRef<HTMLDivElement>(null);
  const pCvsRef    = useRef<HTMLCanvasElement>(null);
  const cTrackRef  = useRef<HTMLDivElement>(null);
  const tRCRef     = useRef<HTMLCanvasElement>(null);
  const bRCRef     = useRef<HTMLCanvasElement>(null);
  const tCLRef     = useRef<HTMLCanvasElement>(null);
  const tCRRef     = useRef<HTMLCanvasElement>(null);
  const bCLRef     = useRef<HTMLCanvasElement>(null);
  const bCRRef     = useRef<HTMLCanvasElement>(null);
  const ropeRef    = useRef<HTMLCanvasElement>(null);
  const topRowRef  = useRef<HTMLDivElement>(null);
  const tSBRef     = useRef<HTMLDivElement>(null);
  const bSBRef     = useRef<HTMLDivElement>(null);

  const S      = useRef({ target: 0, cur: 0, dragging: false });
  const TEX    = useRef<HTMLCanvasElement | null>(null);
  const eLRef  = useRef<number[]>([]);
  const eRRef  = useRef<number[]>([]);
  const rafId  = useRef<number>(0);

  useEffect(() => {
    const KNOT_R  = 11;
    const NE      = 110;
    const TEX_H   = 1200;
    const SHAFT_H = 27;
    const AXLE_R  = 13;
    const GROW    = 18;

    const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
    const hash  = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };

    function fbm(x: number, y: number, o = 4) {
      let v = 0, a = 1, f = 1, m = 0;
      for (let i = 0; i < o; i++) { v += (hash(x * f, y * f) - 0.5) * a; m += a; a *= 0.5; f *= 2.13; }
      return v / m;
    }

    // ── Texture ─────────────────────────────────────────────────────────────
    function buildTex(W: number) {
      if (W < 10) return;
      // Reuse session cache when width matches — avoids the expensive pixel-fill.
      if (_texCache && _texCache.w === W) { TEX.current = _texCache.canvas; return; }
      const o = document.createElement('canvas');
      o.width = W; o.height = TEX_H;
      const c = o.getContext('2d')!;
      c.fillStyle = '#f4ede0'; c.fillRect(0, 0, W, TEX_H);
      const im = c.getImageData(0, 0, W, TEX_H), d = im.data;
      for (let y = 0; y < TEX_H; y++) {
        for (let x = 0; x < W; x++) {
          const i  = (y * W + x) * 4;
          const n  = fbm(x / 58, y / 58) * 30 + fbm(x / 17, y / 17) * 13 + fbm(x / 5, y / 5) * 5;
          const fi = Math.sin(y * 1.1 + x * 0.045) * 3.5 + Math.sin(y * 4.4) * 1.6;
          const bl = Math.max(0, fbm(x / 115, y / 115) * 3 - 1.85) * 52;
          const wm = fbm(x / 220, y / 220) * 19;
          d[i]     = clamp(d[i]     + n + fi - bl + wm,       0, 255);
          d[i + 1] = clamp(d[i + 1] + n * 0.6 + fi * 0.4 - bl + wm * 0.5, 0, 255);
          d[i + 2] = clamp(d[i + 2] + n * 0.2 - bl,          0, 255);
        }
      }
      c.putImageData(im, 0, 0);
      for (let y2 = 1; y2 < TEX_H; y2 += 2 + Math.floor(Math.abs(fbm(y2 * 0.09, 0)) * 5)) {
        const a2 = 0.014 + Math.abs(fbm(0, y2 * 0.065)) * 0.048;
        c.strokeStyle = `rgba(130,100,70,${a2.toFixed(3)})`;
        c.lineWidth   = hash(y2, 1) > 0.6 ? 1 : 0.5;
        c.beginPath(); c.moveTo(0, y2); c.lineTo(W, y2 + (hash(y2, 2) - 0.5) * 5); c.stroke();
      }
      const vg = c.createRadialGradient(W / 2, TEX_H / 2, W * 0.2, W / 2, TEX_H / 2, Math.max(W, TEX_H) * 0.76);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(80,60,40,.05)');
      c.fillStyle = vg; c.fillRect(0, 0, W, TEX_H);
      _texCache = { canvas: o, w: W }; // persist across remounts
      TEX.current = o;
    }

    // ── Edges ────────────────────────────────────────────────────────────────
    function buildEdges() {
      eLRef.current = []; eRRef.current = [];
      for (let i = 0; i <= NE; i++) {
        const t = i / NE;
        eLRef.current.push(8 + Math.abs(fbm(t * 4.1, 1)) * 22 + Math.abs(fbm(t * 12.3, 2.3)) * 8 + Math.abs(fbm(t * 28.7, 3.5)) * 3);
        eRRef.current.push(8 + Math.abs(fbm(t * 3.7, 5.2)) * 22 + Math.abs(fbm(t * 9.5, 6.7)) * 8 + Math.abs(fbm(t * 24.1, 8)) * 3);
      }
    }

    // ── Parchment ────────────────────────────────────────────────────────────
    function drawParch(p: number) {
      const cvs = pCvsRef.current; if (!cvs) return;
      const ctx = cvs.getContext('2d')!, W = cvs.width, H = cvs.height;
      if (!TEX.current || !W) return;
      ctx.clearRect(0, 0, W, H);
      const ty = Math.floor(p * (TEX_H - H)), dr = p * 80;
      ctx.save();
      ctx.beginPath();
      const eL = eLRef.current, eR = eRRef.current;
      for (let i = 0; i <= NE; i++) {
        const t = i / NE, y = t * H, x = eL[i] + Math.sin(t * 9.1 + dr * 0.055) * 3;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(W - eR[NE] - Math.sin(dr * 0.055 + 1) * 3, H);
      for (let i2 = NE; i2 >= 0; i2--) {
        const t2 = i2 / NE, y2 = t2 * H, x2 = W - eR[i2] - Math.sin(t2 * 8.4 + dr * 0.055 + 1.2) * 3;
        ctx.lineTo(x2, y2);
      }
      ctx.closePath(); ctx.clip();
      ctx.drawImage(TEX.current, 0, ty, W, H, 0, 0, W, H);
      let g: CanvasGradient;
      g = ctx.createLinearGradient(0,0,38,0); g.addColorStop(0,'rgba(100,80,60,.12)'); g.addColorStop(1,'rgba(100,80,60,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,38,H);
      g = ctx.createLinearGradient(W,0,W-38,0); g.addColorStop(0,'rgba(100,80,60,.12)'); g.addColorStop(1,'rgba(100,80,60,0)'); ctx.fillStyle=g; ctx.fillRect(W-38,0,38,H);
      g = ctx.createLinearGradient(0,0,0,40); g.addColorStop(0,'rgba(80,60,40,.14)'); g.addColorStop(1,'rgba(80,60,40,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,40);
      g = ctx.createLinearGradient(0,H,0,H-40); g.addColorStop(0,'rgba(80,60,40,.14)'); g.addColorStop(1,'rgba(80,60,40,0)'); ctx.fillStyle=g; ctx.fillRect(0,H-40,W,40);
      ctx.restore();
    }

    // ── Paper Roll ───────────────────────────────────────────────────────────
    function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
    }

    function drawRoll(cvs: HTMLCanvasElement | null, angle: number, frac: number) {
      if (!cvs) return;
      const ctx = cvs.getContext('2d')!, W = cvs.width, H = cvs.height;
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      if (frac < 0.004) return;
      const rollR = AXLE_R + GROW * frac, cy = H / 2, top = cy - rollR, bot = cy + rollR, ht = bot - top;
      const cr = Math.min(rollR * 0.5, W * 0.035);
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0.00,'rgba(140,128,114,.80)'); g.addColorStop(0.07,'#c0b4a4');
      g.addColorStop(0.20,'#d4cabb'); g.addColorStop(0.36,'#e4ddd0');
      g.addColorStop(0.50,'#f0ebe2'); g.addColorStop(0.64,'#e4ddd0');
      g.addColorStop(0.80,'#d4cabb'); g.addColorStop(0.93,'#b8ac9c');
      g.addColorStop(1.00,'rgba(136,124,110,.80)');
      ctx.save(); rrPath(ctx,0,top,W,ht,cr); ctx.fillStyle=g; ctx.fill(); ctx.restore();
      const layerH = Math.max(1.1, 2.5 - frac * 0.8), numL = Math.floor(ht / layerH);
      ctx.save(); rrPath(ctx,0,top,W,ht,cr); ctx.clip();
      for (let i = 0; i <= numL; i++) {
        const ly = top + i * layerH, df = Math.abs(ly - cy) / rollR, ba = 0.04 + df * df * 0.28;
        const wb = Math.sin(i * 9.7 + angle * 0.55) * 0.32;
        ctx.strokeStyle=`rgba(100,90,80,${(ba*0.9).toFixed(3)})`; ctx.lineWidth=0.7;
        ctx.beginPath(); ctx.moveTo(0,ly+wb); ctx.lineTo(W,ly+wb*0.6); ctx.stroke();
        ctx.strokeStyle=`rgba(255,252,245,${(ba*0.45).toFixed(3)})`; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(0,ly+wb+0.9); ctx.lineTo(W,ly+wb*0.6+0.9); ctx.stroke();
      }
      ctx.restore();
      ctx.save(); rrPath(ctx,0,top,W,ht,cr); ctx.clip();
      const gs=26, go=((angle*gs*0.85)%gs+gs)%gs, gc=Math.ceil(W/gs)+2;
      for (let gi = -1; gi <= gc; gi++) {
        const gx=gi*gs-go, ga=0.018+Math.abs(Math.sin(gi*2.4+angle))*0.022;
        ctx.strokeStyle=`rgba(90,82,72,${ga.toFixed(3)})`; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(gx,top); ctx.lineTo(gx+5,bot); ctx.stroke();
      }
      ctx.restore();
      ctx.save(); rrPath(ctx,0,top,W,ht,cr); ctx.clip();
      let eg: CanvasGradient;
      eg=ctx.createLinearGradient(0,top,0,top+14); eg.addColorStop(0,'rgba(60,50,40,.30)'); eg.addColorStop(1,'rgba(60,50,40,0)'); ctx.fillStyle=eg; ctx.fillRect(0,top,W,14);
      eg=ctx.createLinearGradient(0,bot,0,bot-14); eg.addColorStop(0,'rgba(60,50,40,.30)'); eg.addColorStop(1,'rgba(60,50,40,0)'); ctx.fillStyle=eg; ctx.fillRect(0,bot-14,W,14);
      ctx.restore();
      ctx.save(); ctx.strokeStyle='rgba(100,88,76,.50)'; ctx.lineWidth=1.8; rrPath(ctx,0,top,W,ht,cr); ctx.stroke();
      ctx.strokeStyle='rgba(255,252,245,.30)'; ctx.lineWidth=1; rrPath(ctx,1,top+2,W-2,ht-4,Math.max(1,cr-1)); ctx.stroke(); ctx.restore();
    }

    // ── End Cap ──────────────────────────────────────────────────────────────
    function drawCap(cvs: HTMLCanvasElement | null, angle: number, isRight: boolean) {
      if (!cvs) return;
      const ctx = cvs.getContext('2d')!, W = cvs.width, H = cvs.height;
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const cx=W*.5, cy=H*.5, R=Math.min(W,H)*.47;
      ctx.save(); ctx.shadowColor='rgba(0,0,0,.30)'; ctx.shadowBlur=6; ctx.shadowOffsetX=isRight?-1:1; ctx.shadowOffsetY=2;
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle='#9a9288'; ctx.fill(); ctx.restore();
      const gRim=ctx.createRadialGradient(cx,cy,R*.76,cx,cy,R);
      gRim.addColorStop(0,'#c8c0b4'); gRim.addColorStop(.6,'#a89e94'); gRim.addColorStop(1,'#887e74');
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle=gRim; ctx.fill();
      const lx=cx+(isRight?R*.26:-R*.26);
      const gD=ctx.createRadialGradient(lx,cy-R*.22,R*.04,cx,cy,R*.78);
      gD.addColorStop(0,'#eeeae4'); gD.addColorStop(.22,'#ddd8d0'); gD.addColorStop(.52,'#c8c2ba'); gD.addColorStop(.82,'#b0aaa2'); gD.addColorStop(1,'#9c9690');
      ctx.beginPath(); ctx.arc(cx,cy,R*.79,0,Math.PI*2); ctx.fillStyle=gD; ctx.fill();
      for (let i=0; i<20; i++) {
        const a=(i/20)*Math.PI*2+angle*.78, bright=.5+.5*Math.cos(a-(isRight?Math.PI*.32:Math.PI*.68)), al=.03+bright*.09;
        ctx.save(); ctx.strokeStyle=`rgba(${bright>.5?'220,215,205':'100,95,90'},${al.toFixed(3)})`; ctx.lineWidth=1.1;
        ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*R*.2,cy+Math.sin(a)*R*.2); ctx.lineTo(cx+Math.cos(a)*R*.77,cy+Math.sin(a)*R*.77); ctx.stroke(); ctx.restore();
      }
      ctx.beginPath(); ctx.arc(cx,cy,R*.793,0,Math.PI*2); ctx.strokeStyle='rgba(220,215,205,.40)'; ctx.lineWidth=1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*.79,0,Math.PI*2); ctx.strokeStyle='rgba(80,75,70,.35)'; ctx.lineWidth=2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*.67,0,Math.PI*2); ctx.strokeStyle='rgba(70,65,60,.40)'; ctx.lineWidth=3; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*.655,0,Math.PI*2); ctx.strokeStyle='rgba(220,215,205,.20)'; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*.49,0,Math.PI*2); ctx.strokeStyle='rgba(70,65,60,.35)'; ctx.lineWidth=2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*.478,0,Math.PI*2); ctx.strokeStyle='rgba(220,215,205,.18)'; ctx.lineWidth=1; ctx.stroke();
      const gHub=ctx.createRadialGradient(cx+(isRight?.8:-.8)*R*.07,cy-R*.07,R*.01,cx,cy,R*.27);
      gHub.addColorStop(0,'#e8e4de'); gHub.addColorStop(.4,'#cec8c0'); gHub.addColorStop(.78,'#b0aaa2'); gHub.addColorStop(1,'#909088');
      ctx.beginPath(); ctx.arc(cx,cy,R*.27,0,Math.PI*2); ctx.fillStyle=gHub; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,R*.27,0,Math.PI*2); ctx.strokeStyle='rgba(70,65,60,.45)'; ctx.lineWidth=2.2; ctx.stroke();
      const gAx=ctx.createRadialGradient(cx,cy,0,cx,cy,R*.1);
      gAx.addColorStop(0,'#707068'); gAx.addColorStop(.5,'#888078'); gAx.addColorStop(1,'#a09890');
      ctx.beginPath(); ctx.arc(cx,cy,R*.1,0,Math.PI*2); ctx.fillStyle=gAx; ctx.fill();
      const gGl=ctx.createRadialGradient(cx+(isRight?.13:-.32)*R,cy-.3*R,0,cx+(isRight?.13:-.32)*R,cy-.3*R,R*.28);
      gGl.addColorStop(0,'rgba(255,252,248,.28)'); gGl.addColorStop(1,'rgba(255,252,248,0)');
      ctx.beginPath(); ctx.arc(cx,cy,R*.79,0,Math.PI*2); ctx.fillStyle=gGl; ctx.fill();
    }

    // ── Rope ─────────────────────────────────────────────────────────────────
    function drawRope(cvs: HTMLCanvasElement | null, p: number, angle: number) {
      if (!cvs) return;
      const ctx = cvs.getContext('2d')!, W = cvs.width, H = cvs.height;
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5, travel = H - KNOT_R * 2, knotY = KNOT_R + p * travel;
      const cordBot = knotY - KNOT_R;
      if (cordBot > 2) {
        ctx.save(); ctx.lineCap='round'; ctx.lineWidth=W*0.42; ctx.strokeStyle='#b8b0a6';
        ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,cordBot); ctx.stroke(); ctx.restore();
        const strands = [{ph:0,col:'#cec8c0'},{ph:2.094,col:'#a8a29a'},{ph:4.189,col:'#e0dbd4'}];
        for (const {ph,col} of strands) {
          ctx.save(); ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.lineCap='round';
          ctx.beginPath(); let first=true;
          for (let y=0; y<=cordBot; y+=1.2) {
            const t=cordBot>0?y/cordBot:0, twist=11+t*3;
            const x=cx+Math.sin(t*Math.PI*twist+ph+angle*0.8)*(W*0.2);
            if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
          }
          ctx.stroke(); ctx.restore();
        }
        const rg=ctx.createLinearGradient(cx-W*.25,0,cx+W*.25,0);
        rg.addColorStop(0,'rgba(80,70,60,.14)'); rg.addColorStop(.4,'rgba(80,70,60,0)'); rg.addColorStop(1,'rgba(80,70,60,.07)');
        ctx.save(); ctx.fillStyle=rg; ctx.fillRect(cx-W*.25,0,W*.5,cordBot); ctx.restore();
      }
      ctx.save();
      ctx.shadowColor='rgba(80,70,60,.40)'; ctx.shadowBlur=6; ctx.shadowOffsetX=1; ctx.shadowOffsetY=2;
      const gK=ctx.createRadialGradient(cx-KNOT_R*.32,knotY-KNOT_R*.32,KNOT_R*.05,cx,knotY,KNOT_R);
      gK.addColorStop(0,'#e8e4de'); gK.addColorStop(.35,'#ccc6be'); gK.addColorStop(.70,'#aaa49c'); gK.addColorStop(1,'#8a847c');
      ctx.beginPath(); ctx.arc(cx,knotY,KNOT_R,0,Math.PI*2); ctx.fillStyle=gK; ctx.fill(); ctx.restore();
      ctx.save();
      ctx.strokeStyle='rgba(80,70,60,.40)'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.arc(cx,knotY,KNOT_R*.72,Math.PI*.1,Math.PI*.9); ctx.stroke();
      ctx.strokeStyle='rgba(80,70,60,.22)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(cx,knotY,KNOT_R*.72,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
      ctx.fillStyle='rgba(255,252,248,.30)';
      ctx.beginPath(); ctx.arc(cx-KNOT_R*.28,knotY-KNOT_R*.28,KNOT_R*.3,0,Math.PI*2); ctx.fill(); ctx.restore();
      const fringeTop=knotY+KNOT_R, fringeLen=Math.min(18,H-fringeTop);
      if (fringeLen>3) {
        for (let fi=0; fi<6; fi++) {
          ctx.save(); ctx.strokeStyle=`rgba(120,112,104,${(0.22+fi*0.04).toFixed(2)})`; ctx.lineWidth=0.8; ctx.lineCap='round';
          const fx=cx+(fi-2.5)*2.8;
          ctx.beginPath(); ctx.moveTo(fx,fringeTop); ctx.lineTo(fx+(hash(fi,1)-.5)*4,fringeTop+fringeLen*(.6+hash(fi,2)*.4)); ctx.stroke(); ctx.restore();
        }
      }
    }

    // ── Resize ───────────────────────────────────────────────────────────────
    function placeRoll(cvs: HTMLCanvasElement | null, shaftBody: HTMLDivElement | null) {
      if (!cvs || !shaftBody) return;
      const overhang=GROW+8, cvH=SHAFT_H+overhang*2;
      cvs.width=shaftBody.clientWidth; cvs.height=cvH;
      Object.assign(cvs.style, {
        position:'absolute', left:`${shaftBody.offsetLeft}px`, width:`${shaftBody.clientWidth}px`,
        height:`${cvH}px`, top:`${(SHAFT_H-cvH)/2}px`, pointerEvents:'none', zIndex:'6',
      });
    }

    function onResize() {
      const pZone=pZoneRef.current, pCvs=pCvsRef.current;
      if (!pZone||!pCvs) return;
      const zW=pZone.clientWidth, zH=pZone.clientHeight;
      pCvs.width=zW; pCvs.height=zH;
      placeRoll(tRCRef.current, tSBRef.current);
      placeRoll(bRCRef.current, bSBRef.current);
      const CD=32;
      [tCLRef,tCRRef,bCLRef,bCRRef].forEach(r => { if(r.current){r.current.width=CD;r.current.height=CD;} });
      const rope=ropeRef.current, shell=shellRef.current, topRow=topRowRef.current;
      if (!rope||!shell||!pZone||!topRow) return;
      rope.width=26; rope.height=zH;
      const shellRect=shell.getBoundingClientRect(), pZRect=pZone.getBoundingClientRect();
      const pZoneTop=pZRect.top-shellRect.top;
      const pZoneLeft=pZRect.left-shellRect.left;
      Object.assign(rope.style, {
        position:'absolute', top:`${pZoneTop}px`, left:`${pZoneLeft+6}px`, zIndex:'25', cursor:'ns-resize', touchAction:'none',
      });
      TEX.current=null; buildEdges();
      // Use session cache if the width matches (instant); otherwise defer the
      // expensive pixel-fill so the component structure paints first.
      if (_texCache && _texCache.w === zW) {
        TEX.current = _texCache.canvas;
      } else {
        setTimeout(() => buildTex(zW), 0);
      }
    }

    // ── yToP helper ──────────────────────────────────────────────────────────
    function yToP(clientY: number) {
      const rope=ropeRef.current; if(!rope) return 0;
      const rect=rope.getBoundingClientRect(), travel=rope.height-KNOT_R*2;
      return clamp((clientY-rect.top-KNOT_R)/travel, 0, 1);
    }

    // ── Event listeners ──────────────────────────────────────────────────────
    const rope   = ropeRef.current;
    const pZone  = pZoneRef.current;

    const onRopeMD  = (e: MouseEvent)  => { S.current.dragging=true; S.current.target=yToP(e.clientY); e.preventDefault(); };
    const onRopeTS  = (e: TouchEvent)  => { S.current.dragging=true; S.current.target=yToP(e.touches[0].clientY); };
    const onWinMM   = (e: MouseEvent)  => { if(S.current.dragging) S.current.target=yToP(e.clientY); };
    const onWinTM   = (e: TouchEvent)  => { if(S.current.dragging) S.current.target=yToP(e.touches[0].clientY); };
    const onWinMU   = ()               => { S.current.dragging=false; };
    const onWheel   = (e: WheelEvent)  => { e.preventDefault(); S.current.target=clamp(S.current.target+e.deltaY/560,0,1); };
    const onKD      = (e: KeyboardEvent) => {
      const s=0.055;
      if(e.key==='ArrowDown'||e.key==='PageDown') S.current.target=clamp(S.current.target+s,0,1);
      if(e.key==='ArrowUp'  ||e.key==='PageUp'  ) S.current.target=clamp(S.current.target-s,0,1);
    };
    let tY: number|null=null;
    const onPTS = (e: TouchEvent) => { tY=e.touches[0].clientY; };
    const onPTM = (e: TouchEvent) => {
      if(tY===null||S.current.dragging) return;
      S.current.target=clamp(S.current.target+(tY-e.touches[0].clientY)/480,0,1);
      tY=e.touches[0].clientY;
    };

    if(rope)  { rope.addEventListener('mousedown', onRopeMD); rope.addEventListener('touchstart', onRopeTS, {passive:true}); }
    if(pZone) { pZone.addEventListener('wheel', onWheel, {passive:false}); pZone.addEventListener('touchstart', onPTS, {passive:true}); pZone.addEventListener('touchmove', onPTM, {passive:true}); }
    window.addEventListener('mousemove', onWinMM);
    window.addEventListener('touchmove', onWinTM as EventListener, {passive:true});
    window.addEventListener('mouseup',   onWinMU);
    window.addEventListener('touchend',  onWinMU);
    window.addEventListener('keydown',   onKD);

    // ── Render loop ──────────────────────────────────────────────────────────
    function loop() {
      const sv=S.current;
      sv.cur += (sv.target-sv.cur)*0.09;
      const p=sv.cur, angle=p*Math.PI*14;
      const MIN_WIND=0.22;
      const topF=MIN_WIND + p*(1-MIN_WIND*2);
      const botF=1-topF;
      drawRoll(tRCRef.current, angle, topF);
      drawRoll(bRCRef.current, angle, botF);
      drawCap(tCLRef.current, angle, false); drawCap(tCRRef.current, angle, true);
      drawCap(bCLRef.current, angle, false); drawCap(bCRRef.current, angle, true);
      drawParch(p);
      drawRope(ropeRef.current, p, angle);
      const ct=cTrackRef.current, pz=pZoneRef.current;
      if(ct&&pz) {
        const maxOff=Math.max(0, ct.scrollHeight-pz.clientHeight+60);
        ct.style.transform=`translateY(${-(p*maxOff).toFixed(2)}px)`;
      }
      rafId.current=requestAnimationFrame(loop);
    }

    buildEdges(); onResize(); loop();

    let rsTimer: ReturnType<typeof setTimeout>;
    const onResize2 = () => { clearTimeout(rsTimer); rsTimer=setTimeout(onResize, 80); };
    window.addEventListener('resize', onResize2);

    return () => {
      cancelAnimationFrame(rafId.current);
      clearTimeout(rsTimer);
      window.removeEventListener('mousemove', onWinMM);
      window.removeEventListener('touchmove', onWinTM as EventListener);
      window.removeEventListener('mouseup',   onWinMU);
      window.removeEventListener('touchend',  onWinMU);
      window.removeEventListener('keydown',   onKD);
      window.removeEventListener('resize',    onResize2);
      if(rope)  { rope.removeEventListener('mousedown', onRopeMD); rope.removeEventListener('touchstart', onRopeTS); }
      if(pZone) { pZone.removeEventListener('wheel', onWheel); pZone.removeEventListener('touchstart', onPTS); pZone.removeEventListener('touchmove', onPTM); }
    };
  }, []);

  // ── Styles ────────────────────────────────────────────────────────────────
  const shaftBodyStyle: React.CSSProperties = {
    position:'absolute', left:30, right:30, top:0, bottom:0, borderRadius:10,
    background:'linear-gradient(to bottom,#8a8278 0%,#a8a098 10%,#c4beb6 28%,#d8d3cc 44%,#eae7e2 50%,#d8d3cc 56%,#c4beb6 72%,#a8a098 90%,#8a8278 100%)',
    boxShadow:'inset 0 2px 4px rgba(255,252,248,.35),inset 0 -2px 5px rgba(60,55,50,.25),0 3px 10px rgba(60,55,50,.30)', zIndex:2,
  };
  const shaftGrainStyle: React.CSSProperties = {
    position:'absolute', inset:0, borderRadius:10, pointerEvents:'none', zIndex:3,
    background:'repeating-linear-gradient(86deg,transparent 0,transparent 11px,rgba(80,70,60,.08) 11px,rgba(80,70,60,.08) 12.5px,transparent 12.5px,transparent 23px,rgba(255,252,248,.06) 23px,rgba(255,252,248,.06) 24.5px)',
  };
  const rollerRowStyle: React.CSSProperties = {
    position:'relative', width:'100%', height:27, flexShrink:0, zIndex:10,
    display:'flex', alignItems:'center', justifyContent:'center', overflow:'visible',
  };
  const capWrap = (side: 'left'|'right'): React.CSSProperties => ({
    position:'absolute', top:'50%', transform:'translateY(-50%)', zIndex:16,
    ...(side==='left' ? {left:2} : {right:2}),
  });

  return (
    <section
      className="writing-canvas flex-1 overflow-hidden relative flex flex-col"
      style={{ background: 'transparent' }}
    >
      {/* ── Sticky Toolbar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
        {toolbar}
      </div>

      {/* ── Sacred Scroll ────────────────────────────────────────────────── */}
      <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'stretch', overflow:'hidden' }}>
        {/* Shell */}
        <div
          ref={shellRef}
          style={{
            position:'relative', width:'100%', height:'100%',
            display:'flex', flexDirection:'column', alignItems:'center', overflow:'visible',
            filter:'drop-shadow(0 4px 12px rgba(80,70,60,.18))',
          }}
        >
          {/* Top Roller */}
          <div ref={topRowRef} style={rollerRowStyle}>
            <div ref={tSBRef} style={shaftBodyStyle}><div style={shaftGrainStyle}/></div>
            <canvas ref={tRCRef} style={{pointerEvents:'none'}}/>
            <div style={capWrap('left')}><canvas ref={tCLRef}/></div>
            <div style={capWrap('right')}><canvas ref={tCRRef}/></div>
            <div style={{position:'absolute',bottom:-9,left:'10%',width:'80%',height:12,background:'radial-gradient(ellipse,rgba(0,0,0,.62) 0%,transparent 70%)',filter:'blur(5px)',pointerEvents:'none',zIndex:1}}/>
          </div>

          {/* Parchment Zone */}
          <div
            ref={pZoneRef}
            style={{ position:'relative', width:'100%', flex:1, minHeight:0, zIndex:5, overflow:'hidden', cursor:'ns-resize' }}
          >
            <canvas ref={pCvsRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block',pointerEvents:'none'}}/>

            <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:3}}>
              <div
                ref={cTrackRef}
                style={{ padding:'16px 32px 20px', willChange:'transform', pointerEvents:'auto' }}
              >
                {children}
              </div>
            </div>
          </div>

          {/* Bottom Roller */}
          <div style={rollerRowStyle}>
            <div ref={bSBRef} style={shaftBodyStyle}><div style={shaftGrainStyle}/></div>
            <canvas ref={bRCRef} style={{pointerEvents:'none'}}/>
            <div style={capWrap('left')}><canvas ref={bCLRef}/></div>
            <div style={capWrap('right')}><canvas ref={bCRRef}/></div>
          </div>

          <canvas ref={ropeRef} style={{position:'absolute',zIndex:25,cursor:'ns-resize',touchAction:'none'}}/>
        </div>
      </div>

      <style>{`
        .sc-h {
          font-family: 'Cinzel Decorative', serif;
          font-size: clamp(.8rem,2vw,1.25rem);
          color: #1c0b00;
          text-align: center;
          letter-spacing: .22em;
          margin-bottom: 1.3rem;
          text-shadow: 0 1px 0 rgba(255,205,130,.5);
        }
        .sc-r { text-align:center; color:#7a3c10; font-size:.78rem; letter-spacing:.9em; margin:1rem 0; opacity:.55; }
        .sc-v { font-family:'Cinzel',serif; font-size:clamp(.62rem,1.3vw,.8rem); color:#190900; line-height:2.5; text-align:center; letter-spacing:.06em; margin-bottom:.85rem; }
        .sacred-scroll-editor .fraunces-title {
          color: #1c0b00 !important;
          background: transparent !important;
        }
        .sacred-scroll-editor .rich-editor {
          color: #190900 !important;
          background: transparent !important;
        }
        .sacred-scroll-editor .rich-editor:focus { outline: none; }
      `}</style>
    </section>
  );
};

export default SacredScrollCanvas;