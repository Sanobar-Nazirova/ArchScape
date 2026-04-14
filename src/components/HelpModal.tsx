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
        </defs>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect width="480" height="44" rx="10" fill="#25252f"/>
        <rect y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="22" cy="22" r="13" fill="#e07b3f"/>
        <text x="22" y="27" textAnchor="middle" fontSize="13" fill="white" fontWeight="bold">A</text>
        <text x="42" y="27" fontSize="12" fill="#e0ddd8" fontWeight="600">ArchScape</text>
        {/* New Project button */}
        <rect x="356" y="9" width="112" height="26" rx="7" fill="#e07b3f"/>
        <text x="412" y="26" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">+ New Project</text>
        <rect x="352" y="5" width="120" height="34" rx="9" fill="none" stroke="#f0a060" strokeWidth="2"/>
        {/* Section label */}
        <text x="20" y="66" fontSize="9" fill="#6b7094" letterSpacing="1">MY PROJECTS</text>
        {/* Card 1 */}
        <rect x="20" y="74" width="130" height="162" rx="10" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="22" y="76" width="126" height="88" rx="8" fill="url(#s1ga)"/>
        <rect x="20" y="154" width="130" height="10" fill="#25252f"/>
        <text x="85" y="178" textAnchor="middle" fontSize="9" fill="#e0ddd8">Modern Apartment</text>
        <text x="85" y="194" textAnchor="middle" fontSize="8" fill="#6b7094">3 scenes · 2 tours</text>
        {/* Card 2 */}
        <rect x="164" y="74" width="130" height="162" rx="10" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <rect x="166" y="76" width="126" height="88" rx="8" fill="url(#s1gb)"/>
        <rect x="164" y="154" width="130" height="10" fill="#25252f"/>
        <text x="229" y="178" textAnchor="middle" fontSize="9" fill="#e0ddd8">Villa Showcase</text>
        <text x="229" y="194" textAnchor="middle" fontSize="8" fill="#6b7094">7 scenes · 1 tour</text>
        {/* New card placeholder */}
        <rect x="308" y="74" width="150" height="162" rx="10" fill="#25252f" stroke="#3a3a48" strokeWidth="1" strokeDasharray="5,3"/>
        <circle cx="383" cy="154" r="24" fill="#2e2e3a"/>
        <text x="383" y="162" textAnchor="middle" fontSize="22" fill="#6b7094">+</text>
        <text x="383" y="218" textAnchor="middle" fontSize="9" fill="#6b7094">New project</text>
        {/* Arrow annotation */}
        <path d="M 412 44 L 412 54" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s1m)" strokeDasharray="4,2"/>
        <text x="312" y="62" fontSize="9" fill="#f0a060">① Click here to start</text>
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
        <rect x="82" y="58" width="274" height="188" rx="10" fill="none" stroke="#e07b3f" strokeWidth="2" strokeDasharray="8,4"/>
        <circle cx="219" cy="144" r="30" fill="#25252f"/>
        <text x="219" y="138" textAnchor="middle" fontSize="20" fill="#3a3a48">⬆</text>
        <text x="219" y="158" textAnchor="middle" fontSize="8" fill="#6b7094">Drop panoramas here</text>
        <text x="219" y="170" textAnchor="middle" fontSize="7" fill="#4a4a5a">JPG · PNG · MP4 · equirectangular</text>
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
        {/* Placed hotspot dots */}
        <circle cx="180" cy="150" r="14" fill="#1e1e2699" stroke="#e07b3f" strokeWidth="2"/>
        <text x="180" y="155" textAnchor="middle" fontSize="10" fill="#e07b3f">→</text>
        <circle cx="240" cy="110" r="12" fill="#1e1e2699" stroke="#9a9ab0" strokeWidth="1.5"/>
        <text x="240" y="115" textAnchor="middle" fontSize="9" fill="#9a9ab0">i</text>
        <circle cx="300" cy="170" r="12" fill="#1e1e2699" stroke="#9a9ab0" strokeWidth="1.5"/>
        <text x="300" y="175" textAnchor="middle" fontSize="9" fill="#9a9ab0">⊞</text>
        {/* Properties panel — hotspot type picker */}
        <rect x="360" y="44" width="120" height="216" fill="#22222c"/>
        <text x="420" y="62" textAnchor="middle" fontSize="8" fill="#6b7094">HOTSPOT</text>
        <line x1="366" y1="67" x2="474" y2="67" stroke="#3a3a48" strokeWidth="1"/>
        <text x="368" y="81" fontSize="7" fill="#6b7094">Type</text>
        {/* 3×2 type button grid */}
        {[['→ Nav','⊞ Var','i Info'],['⇔ Cmp','⊟ Gal','⬡ Room']].map((row, ri) =>
          row.map((label, ci) => (
            <g key={`${ri}-${ci}`}>
              <rect x={368+ci*38} y={86+ri*28} width={34} height={22} rx="4"
                fill={ri===0&&ci===0 ? '#e07b3f22' : '#2e2e3a'}
                stroke={ri===0&&ci===0 ? '#e07b3f' : '#3a3a48'} strokeWidth="1"/>
              <text x={385+ci*38} y={101+ri*28} textAnchor="middle" fontSize="7"
                fill={ri===0&&ci===0 ? '#e07b3f' : '#9a9ab0'}>{label}</text>
            </g>
          ))
        )}
        <text x="368" y="152" fontSize="7" fill="#6b7094">Destination</text>
        <rect x="366" y="156" width="96" height="18" rx="4" fill="#2e2e3a"/>
        <text x="414" y="169" textAnchor="middle" fontSize="7" fill="#e0ddd8">Kitchen</text>
        <text x="368" y="188" fontSize="7" fill="#6b7094">Tooltip label</text>
        <rect x="366" y="192" width="96" height="18" rx="4" fill="#2e2e3a"/>
        <text x="414" y="205" textAnchor="middle" fontSize="7" fill="#9a9ab0">Go to kitchen…</text>
        {/* Arrow from viewer to panel */}
        <path d="M 355 105 L 365 105" stroke="#f0a060" strokeWidth="1.5" fill="none" markerEnd="url(#s3m)"/>
        <text x="155" y="210" fontSize="8" fill="#f0a060">① Place hotspot in viewer</text>
        <text x="155" y="222" fontSize="8" fill="#f0a060">② Pick type in Properties →</text>
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
        <rect width="480" height="44" rx="10" fill="#25252f" fillOpacity="0.5"/>
        <rect y="34" width="480" height="226" fill="#00000055"/>
        {/* Modal card */}
        <rect x="70" y="18" width="340" height="226" rx="14" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        {/* Modal header */}
        <rect x="70" y="18" width="340" height="40" rx="14" fill="#2e2e3a"/>
        <rect x="70" y="44" width="340" height="14" fill="#2e2e3a"/>
        <text x="240" y="42" textAnchor="middle" fontSize="11" fill="#e0ddd8" fontWeight="bold">Select Destination Scene</text>
        <circle cx="394" cy="38" r="10" fill="#3a3a48"/>
        <text x="394" y="42" textAnchor="middle" fontSize="10" fill="#9a9ab0">✕</text>
        <line x1="82" y1="58" x2="398" y2="58" stroke="#3a3a48" strokeWidth="1"/>
        {/* Search bar */}
        <rect x="84" y="62" width="302" height="20" rx="6" fill="#1e1e26" stroke="#3a3a48" strokeWidth="1"/>
        <text x="102" y="76" fontSize="8" fill="#6b7094">Search scenes…</text>
        {/* Scene thumbnails */}
        <rect x="84" y="88" width="96" height="80" rx="8" fill="#2a3a4a" stroke="#3a3a48" strokeWidth="1"/>
        <text x="132" y="178" textAnchor="middle" fontSize="8" fill="#9a9ab0">Living Room</text>
        {/* Selected thumb */}
        <rect x="192" y="88" width="96" height="80" rx="8" fill="#3a2a18" stroke="#e07b3f" strokeWidth="2.5"/>
        <rect x="192" y="154" width="96" height="14" rx="0" fill="#e07b3f22"/>
        <text x="240" y="178" textAnchor="middle" fontSize="8" fill="#e07b3f" fontWeight="600">Kitchen ✓</text>
        <rect x="300" y="88" width="96" height="80" rx="8" fill="#2a1a3a" stroke="#3a3a48" strokeWidth="1"/>
        <text x="348" y="178" textAnchor="middle" fontSize="8" fill="#9a9ab0">Bedroom</text>
        {/* Callout on selected */}
        <rect x="188" y="84" width="104" height="102" rx="10" fill="none" stroke="#f0a060" strokeWidth="2"/>
        <text x="240" y="204" textAnchor="middle" fontSize="9" fill="#f0a060">① Click to link scene</text>
        {/* Confirm button */}
        <rect x="84" y="210" width="302" height="26" rx="7" fill="#e07b3f"/>
        <text x="235" y="227" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">Link Selected Scene</text>
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
        {/* Full-screen preview background */}
        <rect width="480" height="260" rx="10" fill="#0e1018"/>
        <rect width="480" height="260" rx="10" fill="url(#s6g)"/>
        {/* Guided tour progress bar (top) */}
        <rect width="480" height="4" rx="2" fill="#3a3a48"/>
        <rect width="220" height="4" rx="2" fill="#e07b3f"/>
        {/* Top HUD controls */}
        <rect x="0" y="4" width="90" height="28" rx="0" fill="#1e1e2699"/>
        <rect x="10" y="10" width="22" height="16" rx="5" fill="#2e2e3a"/>
        <text x="21" y="22" textAnchor="middle" fontSize="9" fill="#9a9ab0">✕</text>
        <rect x="36" y="10" width="22" height="16" rx="5" fill="#2e2e3a"/>
        <text x="47" y="22" textAnchor="middle" fontSize="10" fill="#e07b3f">▶</text>
        <rect x="62" y="10" width="22" height="16" rx="5" fill="#2e2e3a"/>
        <text x="73" y="22" textAnchor="middle" fontSize="8" fill="#9a9ab0">⋯</text>
        {/* Compass rose (top-right) */}
        <circle cx="448" cy="28" r="20" fill="#25252f99" stroke="#3a3a48" strokeWidth="1"/>
        <circle cx="448" cy="28" r="16" fill="none" stroke="#3a3a48" strokeWidth="1"/>
        <polygon points="448,13 451,26 448,22 445,26" fill="#e07b3f"/>
        <polygon points="448,43 451,30 448,34 445,30" fill="#6b7094"/>
        <text x="448" y="16" textAnchor="middle" fontSize="6" fill="#e07b3f" fontWeight="bold">N</text>
        {/* Scene hotspot in viewer */}
        <circle cx="220" cy="140" r="15" fill="#1e1e2699" stroke="white" strokeWidth="1.5"/>
        <text x="220" y="145" textAnchor="middle" fontSize="10" fill="white">→</text>
        <text x="220" y="164" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.7">Kitchen</text>
        {/* Bottom gradient */}
        <rect x="0" y="210" width="480" height="50" fill="url(#s6gn)"/>
        {/* Breadcrumb (bottom-right) */}
        <rect x="310" y="216" width="162" height="18" rx="6" fill="#25252f88"/>
        <text x="391" y="229" textAnchor="middle" fontSize="7" fill="#9a9ab0">Lobby › Living Rm › Kitchen</text>
        {/* Scene dots (bottom-centre) */}
        {[0,1,2,3].map(i=>(
          <circle key={i} cx={218+i*14} cy={248} r={i===0?5:3.5}
            fill={i===0 ? '#e07b3f' : 'rgba(255,255,255,0.35)'}/>
        ))}
        {/* Design tray (bottom) */}
        <rect x="120" y="230" width="160" height="22" rx="8" fill="#25252f99" stroke="#3a3a48" strokeWidth="1"/>
        <text x="152" y="245" textAnchor="middle" fontSize="7" fill="#9a9ab0">Marble</text>
        <text x="200" y="245" textAnchor="middle" fontSize="7" fill="#e07b3f" fontWeight="600">Wood ✓</text>
        <text x="248" y="245" textAnchor="middle" fontSize="7" fill="#9a9ab0">Concrete</text>
        {/* Annotations */}
        <path d="M 220 5 L 230 15" stroke="#f0a060" strokeWidth="1" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
        <text x="235" y="13" fontSize="7" fill="#f0a060">Guided tour progress</text>
        <path d="M 428 28 L 418 28" stroke="#f0a060" strokeWidth="1" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
        <text x="310" y="32" fontSize="7" fill="#f0a060">Compass (rotates live)</text>
        <path d="M 310 225 L 300 235" stroke="#f0a060" strokeWidth="1" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
        <text x="210" y="211" fontSize="7" fill="#f0a060">Scene breadcrumb</text>
        <path d="M 200 252 L 200 258" stroke="#f0a060" strokeWidth="1" fill="none" markerEnd="url(#s6m)" strokeDasharray="3,2"/>
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
        <rect x="60" y="90" width="160" height="160" rx="12" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <text x="140" y="112" textAnchor="middle" fontSize="10" fill="#e0ddd8" fontWeight="bold">Share Tour</text>
        <line x1="72" y1="118" x2="208" y2="118" stroke="#3a3a48" strokeWidth="1"/>
        {/* QR code grid */}
        {Array.from({length:6}).map((_,r)=>Array.from({length:6}).map((_,c)=>(
          <rect key={`${r}-${c}`} x={85+c*16} y={126+r*16} width={13} height={13} rx="1"
            fill={(r===0||r===5||c===0||c===5||(r>1&&r<4&&c>1&&c<4)) ? '#e0ddd8' : '#25252f'}/>
        )))}
        <text x="140" y="228" textAnchor="middle" fontSize="8" fill="#6b7094">archscape.io/tour/abc123</text>
        <rect x="76" y="234" width="128" height="10" rx="4" fill="#e07b3f22"/>
        <text x="140" y="243" textAnchor="middle" fontSize="7" fill="#e07b3f">Copy Link</text>
        {/* Analytics panel */}
        <rect x="250" y="90" width="210" height="160" rx="12" fill="#25252f" stroke="#3a3a48" strokeWidth="1"/>
        <text x="355" y="112" textAnchor="middle" fontSize="10" fill="#e0ddd8" fontWeight="bold">Analytics</text>
        <line x1="262" y1="118" x2="448" y2="118" stroke="#3a3a48" strokeWidth="1"/>
        {/* Bar chart */}
        {[
          {label:'Living Rm', h:70, visits:24},
          {label:'Kitchen',   h:45, visits:15},
          {label:'Bedroom',   h:55, visits:19},
          {label:'Bathroom',  h:28, visits:9},
        ].map((bar, i) => (
          <g key={i}>
            <rect x={268+i*48} y={200-bar.h} width={34} height={bar.h} rx="3" fill="#e07b3f" fillOpacity={0.6+i*0.05}/>
            <text x={285+i*48} y={210} textAnchor="middle" fontSize="6" fill="#6b7094">{bar.label}</text>
            <text x={285+i*48} y={198-bar.h} textAnchor="middle" fontSize="7" fill="#e0ddd8">{bar.visits}</text>
          </g>
        ))}
        <text x="355" y="228" textAnchor="middle" fontSize="7" fill="#6b7094">visits per scene · last 7 days</text>
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
        className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden flex flex-col"
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

        {/* Step tabs */}
        <div className="flex gap-1 px-4 pt-3 flex-shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all"
              style={i === step ? {
                background: 'rgba(224,123,63,0.15)',
                color: 'var(--nm-accent)',
                boxShadow: 'inset 2px 2px 5px rgba(0,0,0,.4)',
              } : { color: 'var(--nm-muted)' }}>
              <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
                style={{ background: i === step ? 'var(--nm-accent)' : 'var(--nm-border)', color: i === step ? 'white' : 'var(--nm-muted)' }}>
                {s.id}
              </span>
              <span className="hidden sm:block">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(224,123,63,0.15)', color: 'var(--nm-accent)', boxShadow: '3px 3px 8px rgba(0,0,0,.35)' }}>
              {current.icon}
            </div>
            <div>
              <p className="text-[10px] text-nm-muted uppercase tracking-widest">Step {current.id} of {STEPS.length}</p>
              <h2 className="font-syne font-bold text-nm-text text-base">{current.title}</h2>
            </div>
          </div>

          {/* Diagram */}
          <div className="rounded-xl overflow-hidden mb-4"
            style={{ boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.5), inset -2px -2px 6px rgba(255,255,255,.03)' }}>
            {current.diagram}
          </div>

          {/* Description */}
          <div className="rounded-xl px-4 py-3"
            style={{ boxShadow: 'inset 2px 2px 6px rgba(0,0,0,.4), inset -1px -1px 4px rgba(255,255,255,.03)' }}>
            <p className="text-sm text-nm-text leading-relaxed">{current.description}</p>
          </div>

          {/* Tip */}
          {'tip' in current && current.tip && (
            <div className="mt-3 rounded-xl px-4 py-3 flex gap-2"
              style={{ background: 'rgba(224,123,63,0.08)', border: '1px solid rgba(224,123,63,0.2)' }}>
              <span className="text-nm-accent text-base flex-shrink-0">💡</span>
              <p className="text-xs text-nm-text leading-relaxed">{current.tip}</p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--nm-border)' }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-nm-muted hover:text-nm-text disabled:opacity-30 rounded-xl transition-all"
            style={{ boxShadow: '3px 3px 8px rgba(0,0,0,.4), -2px -2px 5px rgba(255,255,255,.04)' }}>
            <ChevronLeft size={14}/> Previous
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 8, height: 8,
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
