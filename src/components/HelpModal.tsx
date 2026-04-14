import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Upload, Plus, Eye, Navigation, Image, Map, Layers, Share2, BarChart2 } from 'lucide-react';

interface HelpModalProps { onClose: () => void }

const STEPS = [
  {
    id: 1,
    title: 'Create a Project',
    icon: <Plus size={18} />,
    summary: 'Start by creating a project to organise your virtual tours.',
    description: 'From the Home screen, click "New Project", give it a name, then click Create. Each project can hold multiple tours.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s1m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <linearGradient id="s1ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a5a7a"/><stop offset="100%" stopColor="#1a2a4a"/></linearGradient>
          <linearGradient id="s1gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a3a6a"/><stop offset="100%" stopColor="#2a1a3a"/></linearGradient>
          <clipPath id="s1clip1"><rect x="22" y="76" width="126" height="88" rx="8"/></clipPath>
          <clipPath id="s1clip2"><rect x="166" y="76" width="126" height="88" rx="8"/></clipPath>
        </defs>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="22" cy="22" r="13" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="13" fill="white" fontWeight="bold">A</text>
        <text x="42" y="27" fontSize="12" fill="#e0ddd8" fontWeight="600">ArchScape</text>
        {/* Nav tabs */}
        <text x="160" y="26" fontSize="10" fill="#e07b3f" fontWeight="600">Projects</text>
        <rect x="142" y="37" width="52" height="2" rx="1" fill="#e07b3f"/>
        <text x="230" y="26" fontSize="10" fill="#6b7094">Templates</text>
        {/* New Project button */}
        <rect x="356" y="9" width="112" height="26" rx="7" fill="#e07b3f"/>
        <text x="412" y="26" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">+ New Project</text>
        <rect x="352" y="5" width="120" height="34" rx="9" fill="none" stroke="#f0a060" strokeWidth="2"/>
        {/* Section label */}
        <text x="20" y="66" fontSize="9" fill="#6b7094" letterSpacing="1">MY PROJECTS</text>
        <text x="460" y="66" textAnchor="end" fontSize="8" fill="#6b7094">Sort: Recent ▾</text>
        {/* ── Card 1 ── */}
        <rect x="20" y="72" width="130" height="170" rx="10" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        {/* Thumbnail */}
        <rect x="22" y="74" width="126" height="90" rx="8" fill="url(#s1ga)"/>
        {/* Interior perspective lines clipped to thumbnail */}
        <g clipPath="url(#s1clip1)" opacity="0.35">
          <line x1="85" y1="76" x2="22" y2="164" stroke="#7ab0e0" strokeWidth="0.8"/>
          <line x1="85" y1="76" x2="148" y2="164" stroke="#7ab0e0" strokeWidth="0.8"/>
          <line x1="85" y1="76" x2="22" y2="120" stroke="#7ab0e0" strokeWidth="0.5"/>
          <line x1="85" y1="76" x2="148" y2="120" stroke="#7ab0e0" strokeWidth="0.5"/>
          <rect x="65" y="120" width="40" height="44" fill="#2a4a6a" opacity="0.6"/>
          <rect x="30" y="88" width="30" height="20" fill="#3a6a9a" opacity="0.3"/>
          <rect x="90" y="88" width="30" height="20" fill="#3a6a9a" opacity="0.3"/>
        </g>
        {/* Hotspot dot on thumbnail */}
        <circle cx="105" cy="105" r="6" fill="#e07b3f99" stroke="white" strokeWidth="1"/>
        {/* Status badge */}
        <rect x="26" y="78" width="38" height="14" rx="4" fill="#10b981" fillOpacity="0.85"/>
        <text x="45" y="89" textAnchor="middle" fontSize="7" fill="white" fontWeight="600">Published</text>
        {/* Card footer */}
        <rect x="20" y="154" width="130" height="10" fill="#25252f"/>
        <text x="85" y="176" textAnchor="middle" fontSize="9" fill="#e0ddd8" fontWeight="600">Modern Apartment</text>
        {/* Scene pill */}
        <rect x="32" y="182" width="44" height="14" rx="4" fill="#2e2e3a"/>
        <text x="54" y="193" textAnchor="middle" fontSize="7" fill="#9a9ab0">3 scenes</text>
        <rect x="80" y="182" width="36" height="14" rx="4" fill="#2e2e3a"/>
        <text x="98" y="193" textAnchor="middle" fontSize="7" fill="#9a9ab0">2 tours</text>
        <text x="85" y="216" textAnchor="middle" fontSize="7" fill="#6b7094">Edited 2 days ago</text>
        {/* ── Card 2 ── */}
        <rect x="164" y="72" width="130" height="170" rx="10" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="166" y="74" width="126" height="90" rx="8" fill="url(#s1gb)"/>
        <g clipPath="url(#s1clip2)" opacity="0.3">
          <line x1="229" y1="76" x2="166" y2="164" stroke="#c080e0" strokeWidth="0.8"/>
          <line x1="229" y1="76" x2="292" y2="164" stroke="#c080e0" strokeWidth="0.8"/>
          <rect x="205" y="112" width="48" height="52" fill="#4a2a6a" opacity="0.5"/>
        </g>
        <rect x="170" y="78" width="30" height="14" rx="4" fill="#6b7094" fillOpacity="0.85"/>
        <text x="185" y="89" textAnchor="middle" fontSize="7" fill="white" fontWeight="600">Draft</text>
        <rect x="164" y="154" width="130" height="10" fill="#25252f"/>
        <text x="229" y="176" textAnchor="middle" fontSize="9" fill="#e0ddd8" fontWeight="600">Villa Showcase</text>
        <rect x="176" y="182" width="44" height="14" rx="4" fill="#2e2e3a"/>
        <text x="198" y="193" textAnchor="middle" fontSize="7" fill="#9a9ab0">7 scenes</text>
        <text x="229" y="216" textAnchor="middle" fontSize="7" fill="#6b7094">Edited today</text>
        {/* ── New card placeholder ── */}
        <rect x="308" y="72" width="148" height="170" rx="10" fill="#25252f" stroke="#3a3a48" strokeWidth="1" strokeDasharray="5,3"/>
        <circle cx="382" cy="155" r="26" fill="#2e2e3a"/>
        <text x="382" y="163" textAnchor="middle" fontSize="24" fill="#6b7094">+</text>
        <text x="382" y="218" textAnchor="middle" fontSize="9" fill="#6b7094">New project</text>
        {/* Annotation */}
        <path d="M 412 44 L 412 56" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s1m)" strokeDasharray="4,2"/>
        <text x="304" y="64" fontSize="9" fill="#f0a060">① Click to create a new project</text>
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Upload Panoramas',
    icon: <Upload size={18} />,
    summary: 'Upload 360° panoramas and replace them when you have updated images.',
    description: 'Click "Upload" in the toolbar or drag & drop files onto the viewer. Supported formats: equirectangular JPG/PNG, Stereo SBS/TB, Fisheye (auto-converted), and 360° video MP4/WebM. To swap a scene\'s panorama for a newer version, select the scene and click "Replace Panorama" in the Properties panel — hotspots and markers are preserved.',
    tip: 'Format is auto-detected from image dimensions — override it in Properties if needed. Equirectangular is 2:1, Stereo SBS is 4:1, Fisheye is square. Replace Panorama keeps all your hotspots and floor plan markers in place.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s2m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
        </defs>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="22" cy="22" r="12" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">A</text>
        {/* Upload button — highlighted */}
        <rect x="46" y="9" width="68" height="26" rx="6" fill="#e07b3f" fillOpacity="0.18" stroke="#e07b3f" strokeWidth="1.5"/>
        <text x="80" y="26" textAnchor="middle" fontSize="9" fill="#e07b3f" fontWeight="600">⬆ Upload</text>
        {/* Other toolbar items */}
        <rect x="120" y="9" width="70" height="26" rx="6" fill="#2e2e3a"/>
        <text x="155" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">+ Hotspot</text>
        <rect x="420" y="9" width="50" height="26" rx="7" fill="#e07b3f"/>
        <text x="445" y="26" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Publish</text>
        {/* Sidebar */}
        <rect x="0" y="44" width="70" height="216" fill="#22222c"/>
        <text x="35" y="63" textAnchor="middle" fontSize="8" fill="#6b7094">SCENES</text>
        <rect x="6" y="68" width="58" height="24" rx="5" fill="#2e2e3a" stroke="#e07b3f" strokeWidth="1"/>
        <text x="35" y="84" textAnchor="middle" fontSize="7" fill="#e0ddd8">Lobby</text>
        <rect x="6" y="96" width="58" height="24" rx="5" fill="#25252f"/>
        <text x="35" y="112" textAnchor="middle" fontSize="7" fill="#6b7094">Kitchen</text>
        {/* Viewer — drop zone */}
        <rect x="70" y="44" width="298" height="216" fill="#19191f"/>
        {/* Animated-feel drop zone */}
        <rect x="82" y="58" width="274" height="188" rx="12" fill="#e07b3f06" stroke="#e07b3f" strokeWidth="2" strokeDasharray="8,4"/>
        {/* Upload icon group */}
        <circle cx="219" cy="132" r="36" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="211" y="116" width="16" height="20" rx="2" fill="#3a3a48"/>
        <polygon points="219,108 226,116 212,116" fill="#e07b3f"/>
        <rect x="207" y="135" width="24" height="3" rx="1" fill="#3a3a48"/>
        <text x="219" y="154" textAnchor="middle" fontSize="7.5" fill="#6b7094">Drop panoramas here</text>
        <text x="219" y="164" textAnchor="middle" fontSize="6.5" fill="#4a4a5a">JPG · PNG · MP4</text>
        {/* File chips dropping in */}
        <rect x="96" y="68" width="68" height="20" rx="6" fill="#2e2e3a" stroke="#3a3a48" strokeWidth="1"/>
        <text x="130" y="82" textAnchor="middle" fontSize="7" fill="#9a9ab0">lobby.jpg</text>
        <rect x="174" y="68" width="68" height="20" rx="6" fill="#2e2e3a" stroke="#3a3a48" strokeWidth="1"/>
        <text x="208" y="82" textAnchor="middle" fontSize="7" fill="#9a9ab0">kitchen.jpg</text>
        <rect x="252" y="68" width="80" height="20" rx="6" fill="#e07b3f22" stroke="#e07b3f88" strokeWidth="1"/>
        <text x="292" y="82" textAnchor="middle" fontSize="7" fill="#e07b3f">bedroom.jpg ✓</text>
        {/* Upload progress bar on last chip */}
        <rect x="254" y="86" width="76" height="3" rx="1" fill="#3a3a48"/>
        <rect x="254" y="86" width="50" height="3" rx="1" fill="#e07b3f"/>
        {/* Properties panel */}
        <rect x="368" y="44" width="112" height="216" fill="#22222c"/>
        <text x="424" y="63" textAnchor="middle" fontSize="8" fill="#6b7094">PROPERTIES</text>
        <line x1="374" y1="68" x2="474" y2="68" stroke="#3a3a48" strokeWidth="1"/>
        <text x="376" y="83" fontSize="7" fill="#6b7094">Panorama</text>
        <rect x="374" y="86" width="96" height="50" rx="6" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="376" y="88" width="92" height="34" rx="4" fill="#2a3a4a"/>
        <text x="422" y="110" textAnchor="middle" fontSize="7" fill="#6b7094">scene.jpg</text>
        <text x="422" y="127" textAnchor="middle" fontSize="7" fill="#9a9ab0">2:1 Equirectangular</text>
        {/* Replace Panorama button */}
        <rect x="374" y="142" width="96" height="20" rx="5" fill="#e07b3f" fillOpacity="0.15" stroke="#e07b3f" strokeWidth="1"/>
        <text x="422" y="156" textAnchor="middle" fontSize="7" fill="#e07b3f" fontWeight="600">Replace Panorama</text>
        {/* Annotations */}
        <path d="M 80 36 L 80 44" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s2m)"/>
        <text x="82" y="106" fontSize="8" fill="#f0a060">① Upload</text>
        <text x="82" y="117" fontSize="8" fill="#f0a060">   new scene</text>
        <path d="M 370 152 L 360 152" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s2m)" strokeDasharray="3,2"/>
        <text x="248" y="148" fontSize="8" fill="#f0a060">② Replace existing</text>
        <text x="248" y="160" fontSize="8" fill="#f0a060">   (keeps hotspots)</text>
      </svg>
    ),
  },
  {
    id: 3,
    title: 'Add Hotspots',
    icon: <Navigation size={18} />,
    summary: 'Place hotspots to connect scenes and surface rich information.',
    description: 'Press H (or click "Hotspot" in the toolbar), then click in the panorama to place one. Six types are available — choose in the Properties panel:\n\n• Navigation — teleports to another scene.\n• Variants — lets viewers flip through design options (materials, finishes).\n• Info Card — shows a title, icon and body text on click.\n• Compare — overlays two scenes with a draggable split divider.\n• Gallery — opens a full-screen photo lightbox.\n• Room — displays room name, area, ceiling height and finish materials.',
    tip: 'Keyboard: H = place hotspot, M = add media, Esc = cancel. Variants hotspots sync automatically across all linked scenes so the panel stays open while navigating.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s3m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <linearGradient id="s3g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#2a3a4a"/><stop offset="50%" stopColor="#3a4a5a"/><stop offset="100%" stopColor="#2a3a4a"/></linearGradient>
        </defs>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="22" cy="22" r="12" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">A</text>
        <rect x="46" y="9" width="68" height="26" rx="6" fill="#2e2e3a"/>
        <text x="80" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">⬆ Upload</text>
        <rect x="120" y="9" width="70" height="26" rx="6" fill="#e07b3f" fillOpacity="0.18" stroke="#e07b3f" strokeWidth="1.5"/>
        <text x="155" y="26" textAnchor="middle" fontSize="9" fill="#e07b3f" fontWeight="600">+ Hotspot</text>
        <rect x="420" y="9" width="50" height="26" rx="7" fill="#e07b3f"/>
        <text x="445" y="26" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Publish</text>
        {/* Sidebar */}
        <rect x="0" y="44" width="70" height="216" fill="#22222c"/>
        <text x="35" y="63" textAnchor="middle" fontSize="8" fill="#6b7094">SCENES</text>
        <rect x="6" y="68" width="58" height="24" rx="5" fill="#2e2e3a" stroke="#e07b3f" strokeWidth="1"/>
        <text x="35" y="84" textAnchor="middle" fontSize="7" fill="#e0ddd8">Living Room</text>
        <rect x="6" y="96" width="58" height="24" rx="5" fill="#25252f"/>
        <text x="35" y="112" textAnchor="middle" fontSize="7" fill="#6b7094">Kitchen</text>
        {/* Viewer */}
        <rect x="70" y="44" width="290" height="216" fill="url(#s3g)"/>
        {/* Faint perspective lines for interior feel */}
        <line x1="215" y1="44" x2="70" y2="260" stroke="#4a6a8a" strokeWidth="0.5" opacity="0.2"/>
        <line x1="215" y1="44" x2="360" y2="260" stroke="#4a6a8a" strokeWidth="0.5" opacity="0.2"/>
        <line x1="70" y1="180" x2="360" y2="180" stroke="#4a6a8a" strokeWidth="0.5" opacity="0.15"/>
        {/* Navigation hotspot — selected/active */}
        <circle cx="178" cy="148" r="16" fill="#1e1e2688" stroke="#e07b3f" strokeWidth="2"/>
        <text x="178" y="153" textAnchor="middle" fontSize="11" fill="#e07b3f">→</text>
        <circle cx="178" cy="148" r="22" fill="none" stroke="#e07b3f" strokeWidth="1" opacity="0.3"/>
        <rect x="152" y="170" width="52" height="14" rx="5" fill="#00000066"/>
        <text x="178" y="181" textAnchor="middle" fontSize="7" fill="#e0ddd8">Kitchen</text>
        {/* Info Card hotspot */}
        <circle cx="248" cy="108" r="13" fill="#1e1e2688" stroke="#60a0e0" strokeWidth="1.5"/>
        <text x="248" y="113" textAnchor="middle" fontSize="10" fill="#60a0e0" fontWeight="bold">i</text>
        <rect x="222" y="126" width="52" height="14" rx="5" fill="#00000066"/>
        <text x="248" y="137" textAnchor="middle" fontSize="7" fill="#9a9ab0">Info Card</text>
        {/* Variants hotspot */}
        <circle cx="316" cy="165" r="13" fill="#1e1e2688" stroke="#a060e0" strokeWidth="1.5"/>
        <text x="316" y="170" textAnchor="middle" fontSize="9" fill="#a060e0">⊞</text>
        <rect x="290" y="183" width="52" height="14" rx="5" fill="#00000066"/>
        <text x="316" y="194" textAnchor="middle" fontSize="7" fill="#9a9ab0">Variants</text>
        {/* Crosshair cursor */}
        <line x1="130" y1="88" x2="130" y2="106" stroke="#e07b3f" strokeWidth="1.5" opacity="0.7"/>
        <line x1="121" y1="97" x2="139" y2="97" stroke="#e07b3f" strokeWidth="1.5" opacity="0.7"/>
        <circle cx="130" cy="97" r="10" fill="none" stroke="#e07b3f" strokeWidth="1" opacity="0.4"/>
        {/* Properties panel — hotspot type picker */}
        <rect x="360" y="44" width="120" height="216" fill="#22222c"/>
        <text x="420" y="62" textAnchor="middle" fontSize="8" fill="#6b7094">HOTSPOT</text>
        <line x1="366" y1="67" x2="474" y2="67" stroke="#3a3a48" strokeWidth="1"/>
        <text x="368" y="81" fontSize="7" fill="#6b7094">Type</text>
        {/* 3×2 type button grid */}
        {[
          ['→ Nav','⊞ Var','i Info'],
          ['⇔ Cmp','⊟ Gal','⬡ Room'],
        ].map((row, ri) =>
          row.map((label, ci) => (
            <g key={`${ri}-${ci}`}>
              <rect x={368+ci*38} y={86+ri*30} width={35} height={24} rx="5"
                fill={ri===0&&ci===0 ? '#e07b3f22' : '#2e2e3a'}
                stroke={ri===0&&ci===0 ? '#e07b3f' : '#3a3a48'} strokeWidth={ri===0&&ci===0 ? 1.5 : 1}/>
              <text x={385+ci*38} y={102+ri*30} textAnchor="middle" fontSize="7"
                fill={ri===0&&ci===0 ? '#e07b3f' : '#9a9ab0'}>{label}</text>
            </g>
          ))
        )}
        <text x="368" y="158" fontSize="7" fill="#6b7094">Destination</text>
        <rect x="366" y="162" width="96" height="18" rx="4" fill="#2e2e3a" stroke="#3a3a48" strokeWidth="1"/>
        <text x="414" y="175" textAnchor="middle" fontSize="7" fill="#e0ddd8">Kitchen</text>
        <text x="368" y="194" fontSize="7" fill="#6b7094">Label</text>
        <rect x="366" y="198" width="96" height="18" rx="4" fill="#2e2e3a" stroke="#3a3a48" strokeWidth="1"/>
        <text x="414" y="211" textAnchor="middle" fontSize="7" fill="#6b7094">Go to kitchen…</text>
        {/* Annotation arrows */}
        <path d="M 355 108 L 365 108" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s3m)"/>
        <text x="82" y="214" fontSize="8" fill="#f0a060">① Click scene to place hotspot</text>
        <text x="82" y="226" fontSize="8" fill="#f0a060">② Choose type in panel →</text>
      </svg>
    ),
  },
  {
    id: 4,
    title: 'Link Scenes via Scene Picker',
    icon: <Image size={18} />,
    summary: 'Connect a hotspot to a destination scene using the visual picker.',
    description: 'After placing a hotspot, a scene picker appears automatically. Click any scene thumbnail to link it. You can re-link later from the Properties panel → "Change" button on the hotspot. The linked scene name appears as a tooltip on hover.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s4m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
        </defs>
        {/* Dimmed editor behind modal */}
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        <rect width="480" height="44" rx="10" fill="#25252f" fillOpacity="0.4"/>
        <rect y="0" width="480" height="260" fill="#00000066"/>
        {/* Modal card */}
        <rect x="52" y="12" width="376" height="238" rx="14" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        {/* Modal header */}
        <rect x="52" y="12" width="376" height="42" rx="14" fill="#2e2e3a"/>
        <rect x="52" y="40" width="376" height="14" fill="#2e2e3a"/>
        <text x="230" y="37" textAnchor="middle" fontSize="11" fill="#e0ddd8" fontWeight="bold">Select Destination Scene</text>
        <circle cx="412" cy="33" r="11" fill="#3a3a48"/>
        <text x="412" y="37" textAnchor="middle" fontSize="11" fill="#9a9ab0">✕</text>
        <line x1="64" y1="54" x2="416" y2="54" stroke="#3a3a48" strokeWidth="1"/>
        {/* Search bar */}
        <rect x="66" y="58" width="316" height="22" rx="7" fill="#1e1e26" stroke="#3a3a48" strokeWidth="1"/>
        <text x="84" y="73" fontSize="8" fill="#6b7094">🔍  Search scenes…</text>
        {/* Row of 4 thumbnails */}
        {[
          { x:66,  fill:'#2a3a4a', label:'Living Room',  sel:false },
          { x:158, fill:'#3a2a18', label:'Kitchen',      sel:true  },
          { x:250, fill:'#2a1a3a', label:'Bedroom',      sel:false },
          { x:342, fill:'#1a3a2a', label:'Bathroom',     sel:false },
        ].map(t => (
          <g key={t.x}>
            <rect x={t.x} y={86} width={84} height={70} rx="8" fill={t.fill}
              stroke={t.sel ? '#e07b3f' : '#3a3a48'} strokeWidth={t.sel ? 2.5 : 1}/>
            {/* Tiny perspective lines inside each thumb */}
            <line x1={t.x+42} y1={86} x2={t.x} y2={156} stroke="white" strokeWidth="0.4" opacity="0.12"/>
            <line x1={t.x+42} y1={86} x2={t.x+84} y2={156} stroke="white" strokeWidth="0.4" opacity="0.12"/>
            {t.sel && <rect x={t.x} y={140} width={84} height={16} rx="0" fill="#e07b3f22"/>}
            {t.sel && <circle cx={t.x+70} cy={93} r={8} fill="#e07b3f"/>}
            {t.sel && <text x={t.x+70} y={97} textAnchor="middle" fontSize="9" fill="white">✓</text>}
            <text x={t.x+42} y={170} textAnchor="middle" fontSize="7.5"
              fill={t.sel ? '#e07b3f' : '#9a9ab0'} fontWeight={t.sel ? '600' : 'normal'}>{t.label}</text>
          </g>
        ))}
        {/* Callout highlight on selected */}
        <rect x="154" y="82" width="92" height="96" rx="10" fill="none" stroke="#f0a060" strokeWidth="2"/>
        <text x="200" y="192" textAnchor="middle" fontSize="8" fill="#f0a060">① Click to select</text>
        {/* Confirm button */}
        <rect x="66" y="198" width="316" height="28" rx="8" fill="#e07b3f"/>
        <text x="224" y="216" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">Link  →  Kitchen</text>
      </svg>
    ),
  },
  {
    id: 5,
    title: 'Properties Panel',
    icon: <Navigation size={18} />,
    summary: 'Customise every scene, hotspot and design option from the right panel.',
    description: 'Click any scene to rename it, set its initial camera angle, or change panorama format. Click a hotspot to switch its type, update labels, or re-link it. For Variants hotspots, add option cards (images + labels) that sync across all linked scenes automatically. For Room hotspots, enter area, ceiling height and finish materials. Zones (folders) can be colour-coded from the sidebar for easy organisation.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s5m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <linearGradient id="s5g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#2a3a4a"/><stop offset="100%" stopColor="#1a2a3a"/></linearGradient>
        </defs>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="22" cy="22" r="12" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">A</text>
        <rect x="420" y="9" width="50" height="26" rx="7" fill="#e07b3f"/>
        <text x="445" y="26" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Publish</text>
        {/* Sidebar */}
        <rect x="0" y="44" width="72" height="216" fill="#22222c"/>
        <text x="36" y="62" textAnchor="middle" fontSize="8" fill="#6b7094">SCENES</text>
        {['Living Rm','Kitchen','Bedroom'].map((n,i) => (
          <g key={i}>
            <rect x="4" y={68+i*34} width="64" height="26" rx="5" fill={i===0 ? '#2e2e3a' : '#22222c'} stroke={i===0 ? '#e07b3f' : 'none'} strokeWidth="1.5"/>
            <rect x="8" y={72+i*34} width="18" height="18" rx="3" fill="#3a3a48"/>
            <text x="32" y={85+i*34} fontSize="7" fill={i===0 ? '#e0ddd8' : '#6b7094'}>{n}</text>
          </g>
        ))}
        {/* Viewer */}
        <rect x="72" y="44" width="258" height="216" fill="url(#s5g)"/>
        {/* Hotspot in scene */}
        <circle cx="200" cy="150" r="13" fill="#1e1e2699" stroke="#e07b3f" strokeWidth="2"/>
        <text x="200" y="155" textAnchor="middle" fontSize="9" fill="#e07b3f">→</text>
        {/* Properties panel — highlighted */}
        <rect x="330" y="44" width="150" height="216" fill="#22222c"/>
        <rect x="330" y="44" width="150" height="216" fill="none" stroke="#f0a060" strokeWidth="2"/>
        <text x="405" y="62" textAnchor="middle" fontSize="8" fill="#e07b3f" fontWeight="bold">PROPERTIES</text>
        <line x1="336" y1="67" x2="474" y2="67" stroke="#3a3a48" strokeWidth="1"/>
        <text x="338" y="82" fontSize="7" fill="#6b7094">Scene Name</text>
        <rect x="336" y="85" width="136" height="20" rx="4" fill="#2e2e3a"/>
        <text x="344" y="99" fontSize="8" fill="#e0ddd8">Living Room</text>
        <text x="338" y="118" fontSize="7" fill="#6b7094">Initial View</text>
        <rect x="336" y="121" width="136" height="20" rx="4" fill="#e07b3f22" stroke="#e07b3f" strokeWidth="1"/>
        <text x="404" y="135" textAnchor="middle" fontSize="7" fill="#e07b3f">Save Current View</text>
        <text x="338" y="154" fontSize="7" fill="#6b7094">Hotspot Type</text>
        {/* Hotspot type mini-grid in panel */}
        {['→Nav','⊞Var','i Info','⇔Cmp','⊟Gal','⬡Rm'].map((t,i) => (
          <g key={i}>
            <rect x={336+(i%3)*46} y={158+Math.floor(i/3)*24} width={42} height={20} rx="3"
              fill={i===0 ? '#e07b3f22' : '#2e2e3a'} stroke={i===0 ? '#e07b3f' : '#3a3a48'} strokeWidth="1"/>
            <text x={357+(i%3)*46} y={172+Math.floor(i/3)*24} textAnchor="middle" fontSize="6"
              fill={i===0 ? '#e07b3f' : '#9a9ab0'}>{t}</text>
          </g>
        ))}
        {/* Annotations */}
        <path d="M 325 99 L 335 99" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s5m)"/>
        <text x="110" y="96" fontSize="8" fill="#f0a060">① Rename, format,</text>
        <text x="110" y="108" fontSize="8" fill="#f0a060">   set initial view</text>
        <path d="M 325 168 L 335 168" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s5m)"/>
        <text x="110" y="175" fontSize="8" fill="#f0a060">② Choose hotspot type</text>
      </svg>
    ),
  },
  {
    id: 6,
    title: 'Preview & Save',
    icon: <Eye size={18} />,
    summary: 'Experience the tour in full preview mode with navigation aids.',
    description: 'Click "Preview" to enter full-screen mode. In preview:\n\n• Compass (top-right) — rotates with your view; set the North direction per-scene using "Set N" in the editor.\n• Guided Tour — the HUD Play button auto-advances scenes every 10 seconds with a progress bar. Press Space to pause/resume.\n• Scene Breadcrumb — shows your navigation history (bottom-right), click any crumb to jump back.\n• Scene Dots — quick-jump to any scene at the bottom-centre.\n• Design Tray — a persistent strip at the bottom lets viewers flip through material variants without clicking a hotspot.',
    tip: 'Press Space to pause/resume the guided tour. Click "Save" to store your work locally; "Publish" packages the tour for sharing. The splash screen and password gate (if set) are shown to viewers before the tour begins.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s6m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <radialGradient id="s6g" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#2a3a5a"/><stop offset="100%" stopColor="#0e1018"/></radialGradient>
          <linearGradient id="s6gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="transparent"/><stop offset="100%" stopColor="#00000099"/></linearGradient>
        </defs>
        {/* Panorama background */}
        <rect width="480" height="260" rx="10" fill="#0a0c14"/>
        <rect width="480" height="260" rx="10" fill="url(#s6g)"/>
        {/* Subtle horizon */}
        <line x1="0" y1="172" x2="480" y2="172" stroke="#ffffff06" strokeWidth="1"/>
        {/* Guided tour progress bar */}
        <rect width="480" height="3" fill="#3a3a4855"/>
        <rect width="260" height="3" fill="#e07b3f"/>
        <circle cx="260" cy="1.5" r="4" fill="#f0a060"/>
        {/* Top HUD strip */}
        <rect width="480" height="36" fill="#00000044"/>
        <rect x="8" y="8" width="26" height="20" rx="6" fill="#25252f99" stroke="#3a3a4866" strokeWidth="1"/>
        <text x="21" y="22" textAnchor="middle" fontSize="9" fill="#9a9ab0">✕</text>
        <rect x="40" y="8" width="26" height="20" rx="6" fill="#e07b3f22" stroke="#e07b3f88" strokeWidth="1"/>
        <text x="53" y="22" textAnchor="middle" fontSize="11" fill="#e07b3f">▶</text>
        <rect x="72" y="8" width="70" height="20" rx="6" fill="#25252f99" stroke="#3a3a4866" strokeWidth="1"/>
        <text x="107" y="22" textAnchor="middle" fontSize="8" fill="#9a9ab0">2 / 5  ·  8s</text>
        {/* ── Proper 8-point compass rose ── */}
        <circle cx="448" cy="44" r="28" fill="#1e1e26bb" stroke="#3a3a48" strokeWidth="1"/>
        <circle cx="448" cy="44" r="22" fill="none" stroke="#3a3a4840" strokeWidth="1"/>
        {/* N – orange north */}
        <polygon points="448,20 451,40 448,35 445,40" fill="#e07b3f"/>
        {/* S – muted south */}
        <polygon points="448,68 451,48 448,53 445,48" fill="#4a4a60"/>
        {/* E */}
        <polygon points="472,44 452,41 457,44 452,47" fill="#4a4a60"/>
        {/* W */}
        <polygon points="424,44 444,41 439,44 444,47" fill="#4a4a60"/>
        {/* Intercardinals */}
        <polygon points="465,27 452,40 453,38 455,36" fill="#35354a"/>
        <polygon points="431,27 444,40 443,38 441,36" fill="#35354a"/>
        <polygon points="465,61 452,48 453,50 455,52" fill="#35354a"/>
        <polygon points="431,61 444,48 443,50 441,52" fill="#35354a"/>
        <text x="448" y="25" textAnchor="middle" fontSize="7" fill="#e07b3f" fontWeight="bold">N</text>
        <text x="448" y="72" textAnchor="middle" fontSize="6" fill="#6b7094">S</text>
        <text x="474" y="47" textAnchor="middle" fontSize="6" fill="#6b7094">E</text>
        <text x="422" y="47" textAnchor="middle" fontSize="6" fill="#6b7094">W</text>
        {/* Scene hotspot */}
        <circle cx="210" cy="148" r="18" fill="#00000066" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
        <text x="210" y="153" textAnchor="middle" fontSize="12" fill="white">→</text>
        <rect x="166" y="172" width="88" height="18" rx="6" fill="#00000055"/>
        <text x="210" y="185" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">Go to Kitchen</text>
        {/* Bottom gradient */}
        <rect x="0" y="200" width="480" height="60" fill="url(#s6gn)"/>
        {/* Breadcrumb */}
        <rect x="292" y="208" width="182" height="20" rx="7" fill="#25252faa" stroke="#3a3a4844" strokeWidth="1"/>
        <text x="383" y="222" textAnchor="middle" fontSize="7" fill="#9a9ab0">Lobby  ›  Living Rm  ›  Kitchen</text>
        {/* Design tray */}
        <rect x="144" y="232" width="192" height="22" rx="8" fill="#25252faa" stroke="#3a3a4844" strokeWidth="1"/>
        <text x="192" y="247" textAnchor="middle" fontSize="7" fill="#6b7094">Marble</text>
        <rect x="208" y="234" width="52" height="18" rx="5" fill="#e07b3f22" stroke="#e07b3f88" strokeWidth="1"/>
        <text x="234" y="247" textAnchor="middle" fontSize="7" fill="#e07b3f" fontWeight="600">Wood ✓</text>
        <text x="284" y="247" textAnchor="middle" fontSize="7" fill="#6b7094">Concrete</text>
        {/* Scene dots */}
        {[0,1,2,3,4].map(i => (
          <circle key={i} cx={216+i*12} cy={257} r={i===1?5:3.5}
            fill={i===1 ? '#e07b3f' : 'rgba(255,255,255,0.3)'}/>
        ))}
        {/* Annotations */}
        <path d="M 262 2 Q 270 20 248 26" stroke="#f0a060" strokeWidth="1.2" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
        <text x="264" y="20" fontSize="7" fill="#f0a060">Tour progress bar</text>
        <path d="M 420 44 L 410 44" stroke="#f0a060" strokeWidth="1.2" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
        <text x="300" y="40" fontSize="7" fill="#f0a060">Compass rose</text>
        <path d="M 292 218 L 282 226" stroke="#f0a060" strokeWidth="1.2" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
        <text x="180" y="216" fontSize="7" fill="#f0a060">Scene breadcrumb</text>
        <path d="M 234 232 L 234 226" stroke="#f0a060" strokeWidth="1.2" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
        <text x="148" y="224" fontSize="7" fill="#f0a060">Design variants tray</text>
      </svg>
    ),
  },
  {
    id: 7,
    title: 'Floor Plan Minimap',
    icon: <Map size={18} />,
    summary: 'Tag scenes on a floor plan so viewers always know where they are.',
    description: 'Upload a floor plan image from the editor toolbar. Then, in the minimap widget (bottom-left), click "Tag location" and click on the map to place a marker for the current scene. Repeat for every scene.\n\nIn preview mode, the minimap auto-switches to the correct floor when you navigate to a tagged scene. If a scene is tagged on multiple floors an "Also on:" nudge appears. Click any scene dot to teleport directly to that scene.',
    tip: 'Markers persist across sessions. Use the "Move" button to reposition a marker, or "Remove" to untag a scene. The direction arrow in the current-scene dot rotates with your view.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="a7" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/>
          </marker>
          <marker id="a7b" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#60c0ff"/>
          </marker>
          <radialGradient id="g7v" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#2a3a5a"/>
            <stop offset="100%" stopColor="#0e1018"/>
          </radialGradient>
        </defs>
        {/* Viewer background (preview mode) */}
        <rect width="480" height="260" rx="10" fill="#0e1018"/>
        <rect width="480" height="260" rx="10" fill="url(#g7v)"/>
        {/* Header bar */}
        <rect width="480" height="36" rx="10" fill="#1e1e2699"/>
        <rect y="26" width="480" height="10" fill="#1e1e2699"/>
        <text x="240" y="22" textAnchor="middle" fontSize="9" fill="#9a9ab0">Preview Mode — Floor Plan Minimap</text>
        {/* Minimap widget */}
        <rect x="12" y="148" width="190" height="104" rx="10" fill="#25252f" fillOpacity="0.95" stroke="#3a3a48" strokeWidth="1"/>
        {/* Widget header */}
        <rect x="12" y="148" width="190" height="22" rx="10" fill="#2e2e3a"/>
        <rect x="12" y="160" width="190" height="10" fill="#2e2e3a"/>
        <text x="26" y="163" fontSize="8" fill="#9a9ab0">Floor Plan</text>
        {/* Floor tabs */}
        <rect x="12" y="170" width="190" height="16" fill="#22222c"/>
        <text x="30" y="181" fontSize="7" fill="#e07b3f" fontWeight="bold">Floor 1</text>
        <rect x="22" y="184" width="30" height="2" fill="#e07b3f"/>
        <circle cx="55" cy="178" r="3" fill="#e07b3f"/>
        <text x="76" y="181" fontSize="7" fill="#6b7094">Floor 2</text>
        {/* "Also on" nudge */}
        <rect x="12" y="186" width="190" height="14" fill="#e07b3f11"/>
        <text x="22" y="196" fontSize="7" fill="#9a9ab0">Also on:</text>
        <text x="55" y="196" fontSize="7" fill="#e07b3f" fontWeight="bold">Floor 2</text>
        {/* Map area */}
        <rect x="12" y="200" width="190" height="52" rx="0" fill="#19191f"/>
        <rect x="12" y="240" width="190" height="12" rx="10" fill="#19191f"/>
        {/* Floor plan outlines */}
        <rect x="24" y="206" width="48" height="38" rx="2" fill="none" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="68" y="206" width="28" height="18" rx="2" fill="none" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="68" y="224" width="28" height="20" rx="2" fill="none" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="96" y="206" width="36" height="38" rx="2" fill="none" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="132" y="206" width="58" height="38" rx="2" fill="none" stroke="#3a3a48" strokeWidth="1"/>
        {/* Scene markers */}
        <circle cx="44" cy="224" r="7" fill="#e07b3f" stroke="white" strokeWidth="1.5"/>
        <circle cx="44" cy="224" r="12" fill="none" stroke="#e07b3f" strokeWidth="1" opacity="0.4"/>
        <polygon points="44,218 46,224 44,221 42,224" fill="white"/>
        <circle cx="82" cy="214" r="4" fill="#25252f" stroke="#3a3a48" strokeWidth="1.5"/>
        <circle cx="82" cy="234" r="4" fill="#25252f" stroke="#3a3a48" strokeWidth="1.5"/>
        <circle cx="115" cy="224" r="4" fill="#25252f" stroke="#3a3a48" strokeWidth="1.5"/>
        <circle cx="157" cy="218" r="4" fill="#25252f" stroke="#3a3a48" strokeWidth="1.5"/>
        <circle cx="168" cy="234" r="4" fill="#25252f" stroke="#3a3a48" strokeWidth="1.5"/>
        {/* Annotations */}
        <path d="M 205 165 Q 280 140 330 100" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#a7)" strokeDasharray="4,2"/>
        <text x="270" y="90" fontSize="9" fill="#f0a060">① Auto-switches floor</text>
        <text x="270" y="102" fontSize="9" fill="#f0a060">   when navigating</text>
        <path d="M 86 214 Q 160 170 240 155" stroke="#60c0ff" strokeWidth="1.5" fill="none" markerEnd="url(#a7b)" strokeDasharray="4,2"/>
        <text x="242" y="150" fontSize="9" fill="#60c0ff">② Click dot to teleport</text>
        <text x="242" y="163" fontSize="9" fill="#60c0ff">   to that scene</text>
        <path d="M 56 195 Q 100 190 130 185" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#a7)" strokeDasharray="4,2"/>
        <text x="132" y="182" fontSize="8" fill="#f0a060">③ Multi-floor nudge</text>
      </svg>
    ),
  },
  {
    id: 8,
    title: 'Share, Export & Advanced',
    icon: <Share2 size={18} />,
    summary: 'Share your tour via QR code, embed it, export to HTML, and more.',
    description: 'The toolbar utility buttons (icon-only, right of the main actions) unlock powerful features:\n\n• QR Code — generates a scannable QR linking to your published tour.\n• Embed </> — copy an iframe snippet to drop the tour into any website.\n• Export HTML — bundles the entire tour (images + viewer) into one self-contained .html file.\n• Snapshots — save named version checkpoints and restore them at any time.\n• Analytics — see per-scene visit counts and average dwell time across sessions.\n• WebXR / VR — click "Enter VR" in preview (when a compatible headset is connected) for an immersive walkthrough.',
    tip: 'QR and embed codes are generated from the published tour URL. HTML export can take a moment for large tours — progress is shown while images are bundled. Snapshots are stored locally (up to 20 versions).',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="a8" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/>
          </marker>
        </defs>
        {/* Background */}
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Toolbar */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        {/* Logo */}
        <circle cx="22" cy="22" r="12" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">A</text>
        {/* Primary buttons */}
        <rect x="46" y="9" width="58" height="26" rx="6" fill="#2e2e3a"/>
        <text x="75" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">⬆ Upload</text>
        <rect x="110" y="9" width="58" height="26" rx="6" fill="#2e2e3a"/>
        <text x="139" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">+ Hotspot</text>
        {/* Separator */}
        <rect x="175" y="12" width="1" height="20" fill="#3a3a48"/>
        {/* Utility icon buttons — highlighted row */}
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={183+i*33} y="9" width="28" height="26" rx="6"
            fill={i < 3 ? '#e07b3f22' : '#2e2e3a'} stroke={i < 3 ? '#e07b3f' : 'none'} strokeWidth="1"/>
        ))}
        <text x="197" y="26" textAnchor="middle" fontSize="9" fill="#e07b3f">⊞</text>
        <text x="230" y="26" textAnchor="middle" fontSize="9" fill="#e07b3f">{`</>`}</text>
        <text x="263" y="27" textAnchor="middle" fontSize="11" fill="#e07b3f">↓</text>
        <text x="296" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">◷</text>
        <text x="329" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">▦</text>
        <text x="362" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">?</text>
        {/* Separator */}
        <rect x="378" y="12" width="1" height="20" fill="#3a3a48"/>
        {/* Preview/Save/Publish */}
        <rect x="384" y="9" width="46" height="26" rx="6" fill="#2e2e3a"/>
        <text x="407" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">Preview</text>
        <rect x="434" y="9" width="40" height="26" rx="7" fill="#e07b3f"/>
        <text x="454" y="26" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Publish</text>
        {/* Annotation arrows */}
        <path d="M 197 36 L 197 58" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#a8)"/>
        <text x="140" y="72" fontSize="8" fill="#f0a060">QR Code</text>
        <path d="M 230 36 L 230 58" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#a8)"/>
        <text x="214" y="72" fontSize="8" fill="#f0a060">Embed</text>
        <path d="M 263 36 L 263 58" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#a8)"/>
        <text x="248" y="72" fontSize="8" fill="#f0a060">Export HTML</text>
        {/* QR Code Modal */}
        <rect x="56" y="86" width="172" height="168" rx="12" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <text x="142" y="108" textAnchor="middle" fontSize="10" fill="#e0ddd8" fontWeight="bold">Share Tour</text>
        <line x1="68" y1="114" x2="216" y2="114" stroke="#3a3a48" strokeWidth="1"/>
        {/* Realistic QR code — 3 finder squares + data cells */}
        {/* Top-left finder */}
        <rect x="76" y="120" width="36" height="36" rx="3" fill="#e0ddd8"/>
        <rect x="80" y="124" width="28" height="28" rx="2" fill="#25252f"/>
        <rect x="84" y="128" width="20" height="20" rx="1" fill="#e0ddd8"/>
        {/* Top-right finder */}
        <rect x="160" y="120" width="36" height="36" rx="3" fill="#e0ddd8"/>
        <rect x="164" y="124" width="28" height="28" rx="2" fill="#25252f"/>
        <rect x="168" y="128" width="20" height="20" rx="1" fill="#e0ddd8"/>
        {/* Bottom-left finder */}
        <rect x="76" y="200" width="36" height="36" rx="3" fill="#e0ddd8"/>
        <rect x="80" y="204" width="28" height="28" rx="2" fill="#25252f"/>
        <rect x="84" y="208" width="20" height="20" rx="1" fill="#e0ddd8"/>
        {/* Data module scatter */}
        {[[122,120],[130,120],[142,120],[150,124],[122,128],[134,136],[142,132],[150,140],
          [122,144],[138,144],[126,152],[142,152],[154,156],[122,164],[134,160],[146,168],
          [122,184],[130,188],[138,180],[150,184],[126,196],[142,192],[154,196],
          [122,204],[130,208],[138,212],[154,208],[126,220],[146,216]
        ].map(([x,y],i)=>(
          <rect key={i} x={x} y={y} width={6} height={6} rx="1" fill="#e0ddd8"/>
        ))}
        <text x="142" y="250" textAnchor="middle" fontSize="7" fill="#6b7094">archscape.io/tour/abc</text>
        <rect x="68" y="244" width="148" height="18" rx="6" fill="#e07b3f"/>
        <text x="142" y="257" textAnchor="middle" fontSize="8" fill="white" fontWeight="600">Copy Link</text>
        {/* Analytics panel */}
        <rect x="248" y="86" width="220" height="168" rx="12" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <text x="358" y="108" textAnchor="middle" fontSize="10" fill="#e0ddd8" fontWeight="bold">Analytics</text>
        <line x1="260" y1="114" x2="456" y2="114" stroke="#3a3a48" strokeWidth="1"/>
        {/* Axis */}
        <line x1="268" y1="118" x2="268" y2="220" stroke="#3a3a48" strokeWidth="1"/>
        <line x1="268" y1="220" x2="456" y2="220" stroke="#3a3a48" strokeWidth="1"/>
        {/* Bar chart */}
        {[
          {label:'Living Rm', h:76, visits:24, avg:'2m 12s'},
          {label:'Kitchen',   h:48, visits:15, avg:'1m 30s'},
          {label:'Bedroom',   h:60, visits:19, avg:'1m 55s'},
          {label:'Bathroom',  h:30, visits:9,  avg:'0m 48s'},
        ].map((bar, i) => (
          <g key={i}>
            <rect x={278+i*44} y={220-bar.h} width={30} height={bar.h} rx="3"
              fill="#e07b3f" fillOpacity={i===0?0.9:0.55}/>
            <text x={293+i*44} y={228} textAnchor="middle" fontSize="5.5" fill="#6b7094">{bar.label}</text>
            <text x={293+i*44} y={218-bar.h} textAnchor="middle" fontSize="7" fill="#e0ddd8" fontWeight="600">{bar.visits}</text>
          </g>
        ))}
        <text x="358" y="240" textAnchor="middle" fontSize="6.5" fill="#6b7094">scene visits · this week</text>
        {/* Total stat pill */}
        <rect x="284" y="246" width="148" height="16" rx="5" fill="#2e2e3a"/>
        <text x="358" y="258" textAnchor="middle" fontSize="7" fill="#9a9ab0">67 total visits · avg 1m 36s / scene</text>
      </svg>
    ),
  },
  {
    id: 9,
    title: 'Zones & Organisation',
    icon: <Layers size={18} />,
    summary: 'Group scenes into colour-coded zones for cleaner navigation.',
    description: 'Click "+ New Zone" at the bottom of the sidebar to create a folder. Drag scenes into zones to group them — e.g. Ground Floor, First Floor, or Living / Sleeping / Wet Rooms.\n\nEach zone gets a colour: click the coloured dot on the zone row to pick from 8 presets. The colour appears as a tinted left border and badge throughout the sidebar.\n\nThe Zone Overview panel shows all zones as coloured pills — click one to filter the scene list to just that zone.',
    tip: 'Zones are organisational only and do not affect tour flow or hotspot routing. For large projects use zone names that match the floor plan labels so clients can orient themselves.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s9m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <linearGradient id="s9g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#2a3a4a"/><stop offset="50%" stopColor="#3a4a5a"/><stop offset="100%" stopColor="#2a3a4a"/></linearGradient>
        </defs>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="22" cy="22" r="12" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">A</text>
        <rect x="420" y="9" width="50" height="26" rx="7" fill="#e07b3f"/>
        <text x="445" y="26" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Publish</text>
        {/* Sidebar — wider for zones */}
        <rect x="0" y="44" width="130" height="216" fill="#22222c"/>
        {/* Zone Overview bar */}
        <rect x="0" y="44" width="130" height="22" fill="#1e1e26"/>
        <text x="10" y="59" fontSize="8" fill="#6b7094" letterSpacing="0.5">ZONES</text>
        <rect x="102" y="47" width="22" height="14" rx="4" fill="#2e2e3a"/>
        <text x="113" y="58" textAnchor="middle" fontSize="8" fill="#6b7094">+</text>
        {/* Zone 1 — Ground Floor (blue) */}
        <rect x="0" y="66" width="3" height="64" fill="#3a7abf"/>
        <rect x="4" y="68" width="122" height="22" rx="5" fill="#2e2e3a"/>
        <circle cx="14" cy="79" r="5" fill="#3a7abf"/>
        <text x="24" y="83" fontSize="8" fill="#e0ddd8" fontWeight="600">Ground Floor</text>
        <rect x="108" y="71" width="14" height="14" rx="3" fill="#3a3a48"/>
        <text x="115" y="81" textAnchor="middle" fontSize="8" fill="#9a9ab0">▾</text>
        {/* Scenes under Ground Floor */}
        <rect x="8" y="93" width="118" height="18" rx="4" fill="#25252f" stroke="#3a7abf" strokeWidth="1" strokeOpacity="0.5"/>
        <rect x="12" y="97" width="14" height="10" rx="2" fill="#3a7abf" fillOpacity="0.4"/>
        <text x="30" y="106" fontSize="7" fill="#e0ddd8">Lobby</text>
        <rect x="8" y="113" width="118" height="18" rx="4" fill="#25252f"/>
        <rect x="12" y="117" width="14" height="10" rx="2" fill="#3a3a48"/>
        <text x="30" y="126" fontSize="7" fill="#9a9ab0">Living Room</text>
        {/* Zone 2 — First Floor (green, collapsed) */}
        <rect x="0" y="132" width="3" height="22" fill="#3abf7a"/>
        <rect x="4" y="134" width="122" height="22" rx="5" fill="#252530"/>
        <circle cx="14" cy="145" r="5" fill="#3abf7a"/>
        <text x="24" y="149" fontSize="8" fill="#9a9ab0">First Floor</text>
        <rect x="100" y="137" width="22" height="14" rx="3" fill="#2e2e3a"/>
        <text x="111" y="148" textAnchor="middle" fontSize="7" fill="#6b7094">4 sc</text>
        {/* Zone 3 — Roof (orange, collapsed) */}
        <rect x="0" y="158" width="3" height="22" fill="#e07b3f"/>
        <rect x="4" y="160" width="122" height="22" rx="5" fill="#252530"/>
        <circle cx="14" cy="171" r="5" fill="#e07b3f"/>
        <text x="24" y="175" fontSize="8" fill="#9a9ab0">Roof Terrace</text>
        <rect x="100" y="163" width="22" height="14" rx="3" fill="#2e2e3a"/>
        <text x="111" y="174" textAnchor="middle" fontSize="7" fill="#6b7094">2 sc</text>
        {/* + New Zone button */}
        <rect x="4" y="188" width="122" height="20" rx="5" fill="#2e2e3a" stroke="#3a3a48" strokeWidth="1" strokeDasharray="4,2"/>
        <text x="65" y="202" textAnchor="middle" fontSize="8" fill="#6b7094">+ New Zone</text>
        {/* Colour picker popover */}
        <rect x="6" y="214" width="120" height="40" rx="8" fill="#2e2e3a" stroke="#3a3a48" strokeWidth="1"/>
        <text x="66" y="225" textAnchor="middle" fontSize="7" fill="#9a9ab0">Zone colour</text>
        {['#3a7abf','#3abf7a','#e07b3f','#bf3a7a','#7a3abf','#bf9a3a','#3abfbf','#9abf3a'].map((c,i)=>(
          <circle key={i} cx={18+i*14} cy={237} r={5} fill={c} stroke={i===0?'white':'none'} strokeWidth="1.5"/>
        ))}
        {/* Viewer */}
        <rect x="130" y="44" width="240" height="216" fill="url(#s9g)"/>
        {/* Properties panel */}
        <rect x="370" y="44" width="110" height="216" fill="#22222c"/>
        <text x="425" y="62" textAnchor="middle" fontSize="8" fill="#6b7094">SCENE</text>
        <line x1="376" y1="67" x2="474" y2="67" stroke="#3a3a48" strokeWidth="1"/>
        <text x="378" y="82" fontSize="7" fill="#6b7094">Zone</text>
        <rect x="376" y="85" width="96" height="20" rx="4" fill="#3a7abf22" stroke="#3a7abf" strokeWidth="1"/>
        <circle cx="386" cy="95" r="5" fill="#3a7abf"/>
        <text x="415" y="99" textAnchor="middle" fontSize="7" fill="#e0ddd8">Ground Floor</text>
        {/* Annotations */}
        <path d="M 6 188 L 6 196" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s9m)" strokeDasharray="3,2"/>
        <text x="138" y="194" fontSize="8" fill="#f0a060">① Create colour-coded zones</text>
        <path d="M 6 113 L 6 120" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s9m)" strokeDasharray="3,2"/>
        <text x="138" y="120" fontSize="8" fill="#f0a060">② Drag scenes into zones</text>
        <path d="M 370 92 L 360 92" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s9m)" strokeDasharray="3,2"/>
        <text x="148" y="148" fontSize="8" fill="#f0a060">③ Zone shown in Properties →</text>
      </svg>
    ),
  },
  {
    id: 10,
    title: 'Design Variants',
    icon: <Layers size={18} />,
    summary: 'Let viewers switch between finishes and materials inside the tour.',
    description: 'Place a Variants hotspot (set Type = Variants in Properties). Then add option cards — each card has a name, a preview image, and links to the scene that shows that variant (e.g. Marble, Wood, Concrete).\n\nIn preview mode, clicking the hotspot opens a floating selector panel. The persistent Design Tray at the bottom of the screen always shows the options — no hotspot click required.\n\nThe Variants hotspot uses the same ID across all linked variant scenes, so the panel stays open and in sync as viewers navigate between options.',
    tip: 'Set up one scene per variant and link each card to its scene. Shoot all variants from the same camera position for a seamless switch. The active option is highlighted with an orange ring in both the panel and the tray.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s10m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <radialGradient id="s10g" cx="45%" cy="50%" r="65%"><stop offset="0%" stopColor="#2a3a4a"/><stop offset="100%" stopColor="#0a0c14"/></radialGradient>
          <linearGradient id="s10gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="transparent"/><stop offset="100%" stopColor="#000000aa"/></linearGradient>
        </defs>
        {/* Preview background */}
        <rect width="480" height="260" rx="10" fill="#0a0c14"/>
        <rect width="480" height="260" rx="10" fill="url(#s10g)"/>
        {/* HUD bar */}
        <rect width="480" height="32" fill="#00000033"/>
        <rect x="8" y="7" width="24" height="18" rx="5" fill="#25252f99"/>
        <text x="20" y="20" textAnchor="middle" fontSize="9" fill="#9a9ab0">✕</text>
        {/* Variants hotspot in scene */}
        <circle cx="200" cy="150" r="20" fill="#1e1e2688" stroke="#a060e0" strokeWidth="2"/>
        <circle cx="200" cy="150" r="28" fill="none" stroke="#a060e0" strokeWidth="1" opacity="0.3"/>
        <text x="200" y="155" textAnchor="middle" fontSize="12" fill="#a060e0">⊞</text>
        <rect x="164" y="176" width="72" height="16" rx="6" fill="#00000055"/>
        <text x="200" y="188" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">Choose Finish</text>
        {/* Floating variants panel */}
        <rect x="104" y="42" width="272" height="118" rx="12" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="104" y="42" width="272" height="36" rx="12" fill="#2e2e3a"/>
        <rect x="104" y="62" width="272" height="16" fill="#2e2e3a"/>
        <text x="240" y="64" textAnchor="middle" fontSize="10" fill="#e0ddd8" fontWeight="bold">Choose Finish</text>
        <circle cx="360" cy="60" r="10" fill="#3a3a48"/>
        <text x="360" y="64" textAnchor="middle" fontSize="9" fill="#9a9ab0">✕</text>
        <line x1="116" y1="78" x2="364" y2="78" stroke="#3a3a48" strokeWidth="1"/>
        {/* Option cards — 3 side by side */}
        {[
          {x:116, fill:'#e0d8d0', label:'Marble',   sel:true},
          {x:200, fill:'#8a6040', label:'Wood',      sel:false},
          {x:284, fill:'#808080', label:'Concrete',  sel:false},
        ].map(c=>(
          <g key={c.x}>
            <rect x={c.x} y={82} width={76} height={54} rx="8"
              fill={c.fill} fillOpacity="0.25"
              stroke={c.sel ? '#e07b3f' : '#3a3a48'} strokeWidth={c.sel ? 2 : 1}/>
            {/* Swatch */}
            <rect x={c.x+8} y={88} width={60} height={30} rx="5" fill={c.fill} fillOpacity="0.6"/>
            {c.sel && <circle cx={c.x+66} cy={88} r={7} fill="#e07b3f"/>}
            {c.sel && <text x={c.x+66} y={92} textAnchor="middle" fontSize="8" fill="white">✓</text>}
            <text x={c.x+38} y={148} textAnchor="middle" fontSize="7.5"
              fill={c.sel ? '#e07b3f' : '#9a9ab0'} fontWeight={c.sel ? '600':'normal'}>{c.label}</text>
          </g>
        ))}
        {/* Bottom fade + design tray */}
        <rect x="0" y="215" width="480" height="45" fill="url(#s10gn)"/>
        <rect x="120" y="226" width="240" height="26" rx="10" fill="#25252faa" stroke="#3a3a4855" strokeWidth="1"/>
        <rect x="132" y="230" width="68" height="18" rx="6" fill="#e07b3f22" stroke="#e07b3f" strokeWidth="1.5"/>
        <text x="166" y="243" textAnchor="middle" fontSize="7.5" fill="#e07b3f" fontWeight="600">Marble ✓</text>
        <text x="244" y="243" textAnchor="middle" fontSize="7.5" fill="#6b7094">Wood</text>
        <text x="310" y="243" textAnchor="middle" fontSize="7.5" fill="#6b7094">Concrete</text>
        {/* Annotations */}
        <path d="M 240 78 Q 280 30 340 20" stroke="#f0a060" strokeWidth="1.2" fill="none" markerEnd="url(#s10m)" strokeDasharray="3,2"/>
        <text x="292" y="16" fontSize="7" fill="#f0a060">① Click hotspot to open panel</text>
        <path d="M 240 228 L 240 218" stroke="#f0a060" strokeWidth="1.2" fill="none" markerEnd="url(#s10m)" strokeDasharray="3,2"/>
        <text x="364" y="214" fontSize="7" fill="#f0a060">② Persistent design tray</text>
      </svg>
    ),
  },
  {
    id: 11,
    title: 'Compare Hotspot',
    icon: <Image size={18} />,
    summary: 'Overlay two scenes with a draggable before/after divider.',
    description: 'A Compare hotspot links a second scene. Clicking it opens a full-screen split view with a draggable vertical divider — pull it left or right to reveal more of either side.\n\nPerfect for: before/after renovations, furnished vs unfurnished, or day vs night lighting. The divider returns to centre each time the overlay opens.',
    tip: 'The Compare overlay works on touch screens — swipe the divider handle sideways. Press Esc or tap the backdrop to close.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s11am" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <linearGradient id="s11ag1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#1a2a3a"/><stop offset="100%" stopColor="#2a3a4a"/></linearGradient>
          <linearGradient id="s11ag2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#2a1a0a"/><stop offset="100%" stopColor="#1a2a1a"/></linearGradient>
        </defs>
        <rect width="480" height="260" rx="10" fill="#0a0c14"/>
        {/* Before scene — left of divider */}
        <rect x="0" y="0" width="240" height="260" rx="10" fill="url(#s11ag1)"/>
        {/* Interior perspective lines (before — empty room) */}
        <line x1="120" y1="80" x2="0" y2="260" stroke="#4a6a8a" strokeWidth="0.6" opacity="0.3"/>
        <line x1="120" y1="80" x2="240" y2="260" stroke="#4a6a8a" strokeWidth="0.6" opacity="0.3"/>
        <line x1="120" y1="80" x2="0" y2="160" stroke="#4a6a8a" strokeWidth="0.4" opacity="0.25"/>
        <line x1="120" y1="80" x2="240" y2="160" stroke="#4a6a8a" strokeWidth="0.4" opacity="0.25"/>
        {/* Floor line */}
        <line x1="0" y1="195" x2="240" y2="195" stroke="#4a6a8a" strokeWidth="0.5" opacity="0.2"/>
        {/* Before label */}
        <rect x="10" y="222" width="60" height="20" rx="7" fill="#00000088"/>
        <text x="40" y="236" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.8)">◀ Before</text>
        {/* After scene — right of divider */}
        <rect x="240" y="0" width="240" height="260" rx="10" fill="url(#s11ag2)"/>
        {/* Interior with furniture */}
        <line x1="360" y1="80" x2="240" y2="260" stroke="#8a6a4a" strokeWidth="0.6" opacity="0.3"/>
        <line x1="360" y1="80" x2="480" y2="260" stroke="#8a6a4a" strokeWidth="0.6" opacity="0.3"/>
        <rect x="280" y="160" width="80" height="35" rx="4" fill="#3a2a1a" opacity="0.7"/>
        <rect x="340" y="145" width="50" height="50" rx="4" fill="#2a3a1a" opacity="0.6"/>
        {/* After label */}
        <rect x="408" y="222" width="60" height="20" rx="7" fill="#00000088"/>
        <text x="438" y="236" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.8)">After ▶</text>
        {/* Divider line */}
        <rect x="238" y="0" width="4" height="260" fill="white" fillOpacity="0.85"/>
        {/* Drag handle */}
        <circle cx="240" cy="130" r="22" fill="white" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}/>
        <text x="228" y="135" fontSize="14" fill="#333" fontWeight="bold">‹</text>
        <text x="241" y="135" fontSize="14" fill="#333" fontWeight="bold">›</text>
        {/* Panel label */}
        <rect x="8" y="8" width="72" height="20" rx="7" fill="#1e1e2699"/>
        <text x="44" y="22" textAnchor="middle" fontSize="8.5" fill="#e07b3f" fontWeight="600">⇔ Compare</text>
        {/* Annotations */}
        <path d="M 240 108 Q 260 90 310 82" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s11am)" strokeDasharray="3,2"/>
        <text x="314" y="80" fontSize="8" fill="#f0a060">Drag to reveal</text>
        <path d="M 240 152 Q 210 168 170 178" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s11am)" strokeDasharray="3,2"/>
        <text x="60" y="200" fontSize="8" fill="#f0a060">Full-screen overlay</text>
      </svg>
    ),
  },
  {
    id: 12,
    title: 'Gallery Hotspot',
    icon: <Image size={18} />,
    summary: 'Open a full-screen photo lightbox from any hotspot.',
    description: 'A Gallery hotspot holds a list of images. Clicking it opens a full-screen lightbox with previous/next arrows, a scrollable thumbnail strip at the bottom, and a photo counter (e.g. "3 / 8").\n\nIdeal for: material swatches, mood boards, construction progress photos, or any collection of reference images you want viewers to browse.',
    tip: 'Press Esc or click the dark backdrop to close the Gallery. On mobile, swipe left/right to navigate photos.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s11bm" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
        </defs>
        <rect width="480" height="260" rx="10" fill="#0e0e18"/>
        {/* Header bar */}
        <rect width="480" height="36" rx="10" fill="#00000066"/>
        <rect y="26" width="480" height="10" fill="#00000066"/>
        {/* Gallery label */}
        <rect x="8" y="8" width="64" height="20" rx="7" fill="#1e1e2699"/>
        <text x="40" y="22" textAnchor="middle" fontSize="8.5" fill="#a060e0" fontWeight="600">⊟ Gallery</text>
        {/* Title */}
        <text x="240" y="22" textAnchor="middle" fontSize="9" fill="#9a9ab0">Material Swatches</text>
        {/* Counter pill */}
        <rect x="404" y="8" width="38" height="20" rx="7" fill="#1e1e2699"/>
        <text x="423" y="22" textAnchor="middle" fontSize="8.5" fill="#9a9ab0">3 / 8</text>
        {/* Close button */}
        <circle cx="460" cy="18" r="12" fill="#3a3a4888"/>
        <text x="460" y="23" textAnchor="middle" fontSize="11" fill="#9a9ab0">✕</text>
        {/* Main photo */}
        <rect x="30" y="44" width="420" height="166" rx="10" fill="#1e2a1e"/>
        <line x1="34" y1="48" x2="230" y2="206" stroke="#3a5a3a" strokeWidth="0.7" opacity="0.35"/>
        <line x1="230" y1="48" x2="34" y2="206" stroke="#3a5a3a" strokeWidth="0.7" opacity="0.25"/>
        <line x1="230" y1="48" x2="446" y2="206" stroke="#3a5a3a" strokeWidth="0.7" opacity="0.25"/>
        <line x1="446" y1="48" x2="230" y2="206" stroke="#3a5a3a" strokeWidth="0.7" opacity="0.35"/>
        {/* Photo label */}
        <text x="240" y="128" textAnchor="middle" fontSize="11" fill="#4a6a4a">Oak Parquet</text>
        <text x="240" y="144" textAnchor="middle" fontSize="8" fill="#3a4a3a">Photo 3 of 8</text>
        {/* Prev arrow */}
        <circle cx="58" cy="127" r="20" fill="#00000088"/>
        <text x="58" y="133" textAnchor="middle" fontSize="16" fill="white">‹</text>
        {/* Next arrow */}
        <circle cx="422" cy="127" r="20" fill="#00000088"/>
        <text x="422" y="133" textAnchor="middle" fontSize="16" fill="white">›</text>
        {/* Thumbnail strip */}
        <rect x="30" y="218" width="420" height="36" rx="8" fill="#1e1e2699"/>
        {[0,1,2,3,4,5,6].map(i=>(
          <rect key={i} x={36+i*60} y={222} width={52} height={28} rx="5"
            fill={i===2 ? '#1e2a1e' : '#25252f'}
            stroke={i===2 ? '#a060e0' : '#3a3a48'} strokeWidth={i===2 ? 2 : 1}/>
        ))}
        {/* Annotations */}
        <path d="M 240 44 Q 240 30 280 18" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s11bm)" strokeDasharray="3,2"/>
        <text x="12" y="14" fontSize="8" fill="#f0a060">Photo counter</text>
        <path d="M 120 222 Q 110 210 96 204" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s11bm)" strokeDasharray="3,2"/>
        <text x="30" y="258" fontSize="8" fill="#f0a060">Thumbnail strip — click to jump</text>
      </svg>
    ),
  },
  {
    id: 13,
    title: 'Splash Screen',
    icon: <Eye size={18} />,
    summary: 'Brand the tour entry with a logo, password gate, and countdown.',
    description: 'Before the tour opens, viewers see a branded intro card with your project name and logo. You can optionally:\n\n• Set a password — viewers must enter the correct code to proceed.\n• Enable an 8-second countdown — the tour auto-enters when it reaches zero.\n• Customise the intro text and button label.\n\nThe splash screen only appears in Preview and published tours, never in the editor.',
    tip: 'Use the password gate when sharing a draft tour with a client before it is ready for public release.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s13am" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <radialGradient id="s13abg" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#1a2a3a"/><stop offset="100%" stopColor="#060810"/></radialGradient>
        </defs>
        <rect width="480" height="260" rx="10" fill="url(#s13abg)"/>
        {/* Centered splash card */}
        <rect x="100" y="20" width="280" height="224" rx="16" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        {/* Card header band */}
        <rect x="100" y="20" width="280" height="60" rx="16" fill="#2e2e3a"/>
        <rect x="100" y="64" width="280" height="16" fill="#2e2e3a"/>
        {/* Logo circle */}
        <circle cx="174" cy="50" r="22" fill="#e07b3f"/>
        <text x="174" y="57" textAnchor="middle" fontSize="20" fill="white" fontWeight="bold">A</text>
        {/* Brand name */}
        <text x="210" y="43" fontSize="11" fill="#e0ddd8" fontWeight="700">ArchScape</text>
        <text x="210" y="58" fontSize="8" fill="#9a9ab0">Virtual Tour Platform</text>
        {/* Project name */}
        <text x="240" y="106" textAnchor="middle" fontSize="13" fill="#e0ddd8" fontWeight="bold">Luxury Villa Tour</text>
        <text x="240" y="121" textAnchor="middle" fontSize="8" fill="#6b7094">4 scenes · Ground Floor + First Floor</text>
        {/* Divider */}
        <line x1="120" y1="132" x2="360" y2="132" stroke="#3a3a48" strokeWidth="1"/>
        {/* Password field */}
        <text x="114" y="150" fontSize="8" fill="#6b7094">Password</text>
        <rect x="112" y="155" width="256" height="26" rx="8" fill="#1e1e26" stroke="#3a3a48" strokeWidth="1"/>
        <text x="126" y="172" fontSize="9" fill="#6b7094">••••••••</text>
        <rect x="348" y="158" width="16" height="20" rx="4" fill="#2e2e3a"/>
        <text x="356" y="171" textAnchor="middle" fontSize="9" fill="#6b7094">👁</text>
        {/* Countdown ring */}
        <circle cx="200" cy="214" r="0" fill="none"/>
        <circle cx="240" cy="206" r="0" fill="none"/>
        {/* Enter button */}
        <rect x="112" y="188" width="256" height="34" rx="10" fill="#e07b3f"/>
        <text x="240" y="209" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">Enter Tour →</text>
        {/* Annotations */}
        <path d="M 240 155 Q 300 140 340 128" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s13am)" strokeDasharray="3,2"/>
        <text x="344" y="125" fontSize="8" fill="#f0a060">Password gate</text>
        <path d="M 240 188 Q 290 175 330 165" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s13am)" strokeDasharray="3,2"/>
        <text x="334" y="163" fontSize="8" fill="#f0a060">CTA button</text>
        <path d="M 240 106 Q 180 88 150 78" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s13am)" strokeDasharray="3,2"/>
        <text x="70" y="76" fontSize="8" fill="#f0a060">Project name</text>
      </svg>
    ),
  },
  {
    id: 14,
    title: 'Guided Tour Playback',
    icon: <Eye size={18} />,
    summary: 'Auto-advance scenes for hands-free client presentations.',
    description: 'Press Play (▶) in the top-left HUD to start the guided tour. Scenes advance automatically every 10 seconds. A progress bar fills across the top of the screen showing how much time remains before the next scene.\n\nControls:\n• ▶ / ⏸ — play / pause (or press Space)\n• ✕ — exit the guided tour\n• Counter "3 / 5 · 4s" — current scene, total, and seconds remaining\n• Scene dots at the bottom — click any dot to jump to that scene directly',
    tip: 'Use guided tour when presenting on a large screen — scenes advance hands-free. The tour loops back to the first scene after the last.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s14m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <radialGradient id="s14bg" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#2a3a5a"/><stop offset="100%" stopColor="#0a0c18"/></radialGradient>
          <linearGradient id="s14fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00000066"/><stop offset="100%" stopColor="transparent"/></linearGradient>
          <linearGradient id="s14fade2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="transparent"/><stop offset="100%" stopColor="#00000066"/></linearGradient>
        </defs>
        {/* Panorama background */}
        <rect width="480" height="260" rx="10" fill="url(#s14bg)"/>
        {/* Subtle horizon */}
        <line x1="0" y1="155" x2="480" y2="155" stroke="#ffffff05" strokeWidth="1"/>
        {/* Top overlay fade */}
        <rect width="480" height="60" rx="10" fill="url(#s14fade)"/>
        {/* Progress bar track */}
        <rect width="480" height="5" fill="#3a3a4855"/>
        {/* Progress bar fill — 60% */}
        <rect width="288" height="5" fill="#e07b3f"/>
        {/* Scrubber dot */}
        <circle cx="288" cy="2.5" r="6" fill="#f0a060" stroke="white" strokeWidth="1"/>
        {/* HUD strip */}
        <rect width="480" height="42" fill="#00000033"/>
        {/* Exit button */}
        <rect x="10" y="10" width="30" height="24" rx="7" fill="#25252f99" stroke="#3a3a4866" strokeWidth="1"/>
        <text x="25" y="26" textAnchor="middle" fontSize="10" fill="#9a9ab0">✕</text>
        {/* Play/Pause button — highlighted */}
        <rect x="48" y="10" width="30" height="24" rx="7" fill="#e07b3f33" stroke="#e07b3f" strokeWidth="1.5"/>
        <text x="63" y="27" textAnchor="middle" fontSize="13" fill="#e07b3f">⏸</text>
        {/* Counter pill */}
        <rect x="86" y="10" width="76" height="24" rx="7" fill="#25252f99" stroke="#3a3a4866" strokeWidth="1"/>
        <text x="124" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">3 / 5  ·  4s</text>
        {/* Scene name in viewer */}
        <text x="240" y="130" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)">Master Bedroom</text>
        {/* Navigation hotspot */}
        <circle cx="340" cy="150" r="18" fill="#00000055" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
        <text x="340" y="156" textAnchor="middle" fontSize="12" fill="white">→</text>
        {/* Bottom fade */}
        <rect y="200" width="480" height="60" rx="10" fill="url(#s14fade2)"/>
        {/* Scene dots */}
        <rect x="186" y="228" width="108" height="22" rx="8" fill="#25252f55"/>
        {[0,1,2,3,4].map(i => (
          <circle key={i} cx={210 + i * 16} cy={239} r={i === 2 ? 6 : 4}
            fill={i === 2 ? '#e07b3f' : 'rgba(255,255,255,0.28)'}/>
        ))}
        {/* Breadcrumb */}
        <rect x="150" y="252" width="180" height="6" rx="3" fill="#25252f44"/>
        <text x="240" y="257" textAnchor="middle" fontSize="6" fill="#6b7094">Lobby  ›  Living Room  ›  Bedroom</text>
        {/* Annotations */}
        <path d="M 288 0 Q 310 15 360 20" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s14m)" strokeDasharray="3,2"/>
        <text x="364" y="18" fontSize="8" fill="#f0a060">10 s progress bar</text>
        <path d="M 63 34 Q 63 56 90 72" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s14m)" strokeDasharray="3,2"/>
        <text x="94" y="74" fontSize="8" fill="#f0a060">Pause / resume (Space)</text>
        <path d="M 240 228 Q 240 215 280 205" stroke="#f0a060" strokeWidth="1.3" fill="none" markerEnd="url(#s14m)" strokeDasharray="3,2"/>
        <text x="284" y="203" fontSize="8" fill="#f0a060">Scene dots — click to jump</text>
      </svg>
    ),
  },
  {
    id: 13,
    title: 'Snapshots & Version History',
    icon: <BarChart2 size={18} />,
    summary: 'Save named checkpoints of your work and roll back at any time.',
    description: 'Click the Snapshots icon (🕐) in the toolbar to open the Version History panel. Click "+ Save Snapshot" and give it a descriptive name — the full state of all scenes, hotspots, floor plan markers, zones, and properties is captured instantly.\n\nUp to 20 snapshots can be stored. To roll back, click "Restore" next to any entry — the editor reverts to that exact state immediately. Each snapshot shows its name, creation time, and how long ago it was saved.\n\nSnapshots persist in your browser\'s local storage across sessions on the same device.',
    tip: 'Create a snapshot before big structural changes — swapping panoramas, rebuilding zone layout, or adding a wave of new hotspots. Snapshot data does not include panorama image files (those stay in place); only project structure and settings are captured.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker id="s13m" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
        </defs>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="22" cy="22" r="12" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">A</text>
        {/* Toolbar utility icons */}
        <rect x="200" y="9" width="28" height="26" rx="6" fill="#2e2e3a"/>
        <text x="214" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">⊞</text>
        <rect x="232" y="9" width="28" height="26" rx="6" fill="#2e2e3a"/>
        <text x="246" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">{`</>`}</text>
        {/* Snapshots icon — highlighted */}
        <rect x="264" y="9" width="28" height="26" rx="6" fill="#e07b3f22" stroke="#e07b3f" strokeWidth="1.5"/>
        <text x="278" y="26" textAnchor="middle" fontSize="11" fill="#e07b3f">🕐</text>
        <rect x="296" y="9" width="28" height="26" rx="6" fill="#2e2e3a"/>
        <text x="310" y="26" textAnchor="middle" fontSize="9" fill="#9a9ab0">▦</text>
        <rect x="420" y="9" width="50" height="26" rx="7" fill="#e07b3f"/>
        <text x="445" y="26" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Publish</text>
        {/* Snapshots modal */}
        <rect x="50" y="50" width="380" height="202" rx="14" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        {/* Modal header */}
        <rect x="50" y="50" width="380" height="38" rx="14" fill="#2e2e3a"/>
        <rect x="50" y="74" width="380" height="14" fill="#2e2e3a"/>
        <text x="210" y="73" textAnchor="middle" fontSize="11" fill="#e0ddd8" fontWeight="bold">🕐  Version History</text>
        <circle cx="414" cy="69" r="11" fill="#3a3a48"/>
        <text x="414" y="73" textAnchor="middle" fontSize="10" fill="#9a9ab0">✕</text>
        <line x1="62" y1="88" x2="418" y2="88" stroke="#3a3a48" strokeWidth="1"/>
        {/* Snapshot list */}
        {[
          {name:'Initial Layout',    sub:'Lobby + 2 rooms',      time:'2 days ago',     cur:false},
          {name:'With Materials',    sub:'Variants + hotspots',  time:'Yesterday 14:30', cur:false},
          {name:'Client Review v1',  sub:'Floor plan tagged',    time:'5 hours ago',     cur:false},
          {name:'Final Draft  ★',    sub:'All 7 scenes + zones', time:'32 min ago',      cur:true},
        ].map((s,i)=>(
          <g key={i}>
            <rect x="62" y={94+i*36} width="356" height="30" rx="7"
              fill={s.cur ? '#e07b3f08' : '#22222c'}
              stroke={s.cur ? '#e07b3f44' : 'none'} strokeWidth="1"/>
            {/* Timeline */}
            <circle cx="80" cy={109+i*36} r={s.cur ? 7 : 5}
              fill={s.cur ? '#e07b3f' : '#3a3a48'}
              stroke={s.cur ? '#f0a060' : 'none'} strokeWidth="2"/>
            {i < 3 && <line x1="80" y1={116+i*36} x2="80" y2={129+i*36} stroke="#3a3a48" strokeWidth="1" strokeDasharray="2,2"/>}
            {/* Text */}
            <text x="96" y={106+i*36} fontSize="8.5"
              fill={s.cur ? '#e0ddd8' : '#9a9ab0'} fontWeight={s.cur ? '600' : 'normal'}>{s.name}</text>
            <text x="96" y={118+i*36} fontSize="6.5" fill="#6b7094">{s.sub}  ·  {s.time}</text>
            {/* Button */}
            <rect x={346} y={98+i*36} width={64} height={22} rx="6"
              fill={s.cur ? '#e07b3f' : '#2e2e3a'}
              stroke={s.cur ? 'none' : '#3a3a48'} strokeWidth="1"/>
            <text x={378} y={113+i*36} textAnchor="middle" fontSize="7.5"
              fill={s.cur ? 'white' : '#9a9ab0'} fontWeight={s.cur ? '600' : 'normal'}>
              {s.cur ? 'Current' : 'Restore'}
            </text>
          </g>
        ))}
        {/* Save Snapshot button */}
        <rect x="62" y="240" width="356" height="24" rx="8"
          fill="#e07b3f" fillOpacity="0.12" stroke="#e07b3f" strokeWidth="1.5"/>
        <text x="240" y="256" textAnchor="middle" fontSize="9" fill="#e07b3f" fontWeight="600">+ Save Snapshot</text>
        {/* Annotations */}
        <path d="M 278 36 L 278 44" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s13m)" strokeDasharray="3,2"/>
        <text x="282" y="50" fontSize="7" fill="#f0a060">① Open Snapshots</text>
        <path d="M 346 109 L 338 109" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s13m)" strokeDasharray="3,2"/>
        <text x="114" y="100" fontSize="7" fill="#f0a060">② Restore any checkpoint →</text>
        <path d="M 240 240 L 240 232" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s13m)" strokeDasharray="3,2"/>
        <text x="138" y="230" fontSize="7" fill="#f0a060">③ Save current state</text>
      </svg>
    ),
  },
];

export default function HelpModal({ onClose }: HelpModalProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--nm-base)',
          boxShadow: '16px 16px 40px rgba(0,0,0,.8), -8px -8px 20px rgba(255,255,255,.04)',
          maxHeight: '90vh',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--nm-border)' }}>
          <div className="flex items-center gap-3">
            <img src="/logo-512.png" alt="" className="w-7 h-7 rounded-full"/>
            <span className="font-syne font-bold text-nm-text text-lg">How to use ArchScape</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-nm-muted hover:text-nm-text transition-colors"
            style={{ boxShadow: '2px 2px 6px rgba(0,0,0,.4), -1px -1px 4px rgba(255,255,255,.04)' }}>
            <X size={15}/>
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">

          {/* Left sidebar — step navigator */}
          <nav className="w-52 flex-shrink-0 overflow-y-auto py-2 flex flex-col"
            style={{ borderRight: '1px solid var(--nm-border)', background: 'rgba(0,0,0,0.18)' }}>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className="flex items-center gap-2.5 py-2.5 pr-3 text-left transition-all"
                style={i === step ? {
                  paddingLeft: 10,
                  borderLeft: '3px solid var(--nm-accent)',
                  background: 'rgba(224,123,63,0.12)',
                } : {
                  paddingLeft: 12,
                  borderLeft: '3px solid transparent',
                }}>
                <span
                  className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0"
                  style={{
                    background: i === step ? 'var(--nm-accent)' : 'var(--nm-border)',
                    color: i === step ? 'white' : 'var(--nm-muted)',
                  }}>
                  {i + 1}
                </span>
                <span
                  className="text-xs leading-tight"
                  style={{ color: i === step ? 'var(--nm-accent)' : 'var(--nm-muted)' }}>
                  {s.title}
                </span>
              </button>
            ))}
          </nav>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {/* Step header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(224,123,63,0.15)', color: 'var(--nm-accent)', boxShadow: '3px 3px 8px rgba(0,0,0,.35)' }}>
                {current.icon}
              </div>
              <div>
                <p className="text-[10px] text-nm-muted uppercase tracking-widest">Step {step + 1} of {STEPS.length}</p>
                <h2 className="font-syne font-bold text-nm-text text-base">{current.title}</h2>
              </div>
            </div>

            {/* Diagram */}
            <div className="rounded-xl overflow-hidden"
              style={{ boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.5), inset -2px -2px 6px rgba(255,255,255,.03)' }}>
              {current.diagram}
            </div>

            {/* Description */}
            <div className="rounded-xl px-4 py-3"
              style={{ boxShadow: 'inset 2px 2px 6px rgba(0,0,0,.4), inset -1px -1px 4px rgba(255,255,255,.03)' }}>
              <p className="text-sm text-nm-text leading-relaxed whitespace-pre-line">{current.description}</p>
            </div>

            {/* Tip */}
            {'tip' in current && current.tip && (
              <div className="rounded-xl px-4 py-3 flex gap-2"
                style={{ background: 'rgba(224,123,63,0.08)', border: '1px solid rgba(224,123,63,0.2)' }}>
                <span className="text-nm-accent text-base flex-shrink-0">💡</span>
                <p className="text-xs text-nm-text leading-relaxed">{current.tip}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--nm-border)' }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-nm-muted hover:text-nm-text disabled:opacity-30 rounded-xl transition-all"
            style={{ boxShadow: '3px 3px 8px rgba(0,0,0,.4), -2px -2px 5px rgba(255,255,255,.04)' }}>
            <ChevronLeft size={14}/> Previous
          </button>

          {/* Progress dots */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  background: i === step ? 'var(--nm-accent)' : 'var(--nm-border)',
                }}/>
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 10px rgba(224,123,63,.4)' }}>
              Next <ChevronRight size={14}/>
            </button>
          ) : (
            <button onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 10px rgba(224,123,63,.4)' }}>
              Get Started ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
