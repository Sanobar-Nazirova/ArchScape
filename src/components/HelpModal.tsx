import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Upload, Plus, Eye, Save, Globe, Navigation, Image, Map } from 'lucide-react';

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
        {/* Home screen mockup */}
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Header */}
        <rect x="0" y="0" width="480" height="44" rx="10" fill="#25252f"/>
        <rect x="0" y="34" width="480" height="10" fill="#25252f"/>
        <circle cx="20" cy="22" r="12" fill="#2e2e3a"/>
        <rect x="40" y="15" width="70" height="14" rx="4" fill="#3a3a48"/>
        {/* Highlight: New Project button */}
        <rect x="370" y="10" width="96" height="26" rx="8" fill="#e07b3f"/>
        <text x="418" y="27" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">+ New Project</text>
        {/* Arrow pointing at button */}
        <path d="M 330 40 Q 350 55 370 28" stroke="#f0a060" strokeWidth="2.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arr)"/>
        <text x="285" y="52" fontSize="11" fill="#f0a060" fontWeight="600">① Click here</text>
        {/* Annotation box */}
        <rect x="358" y="4" width="116" height="36" rx="8" fill="none" stroke="#f0a060" strokeWidth="2"/>
        {/* Empty state */}
        <rect x="100" y="90" width="280" height="120" rx="12" fill="#25252f" opacity="0.6"/>
        <text x="240" y="145" textAnchor="middle" fontSize="12" fill="#6b7094">No projects yet</text>
        <text x="240" y="163" textAnchor="middle" fontSize="10" fill="#4a4a5a">Create your first virtual tour project</text>
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker></defs>
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Upload Panoramas',
    icon: <Upload size={18} />,
    summary: 'Upload your 360° images or videos into the tour editor.',
    description: 'Inside the editor, click "Upload" in the toolbar or drag & drop files onto the viewer. Supported: equirectangular JPG/PNG, 360° video MP4, and fisheye images (auto-converted). You can upload multiple files at once.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Toolbar */}
        <rect x="0" y="0" width="480" height="44" rx="10" fill="#25252f"/>
        <rect x="0" y="34" width="480" height="10" fill="#25252f"/>
        {/* Upload button highlight */}
        <rect x="54" y="9" width="68" height="26" rx="6" fill="#2e2e3a"/>
        <text x="88" y="26" textAnchor="middle" fontSize="10" fill="#e0ddd8">⬆ Upload</text>
        <rect x="50" y="5" width="76" height="34" rx="8" fill="none" stroke="#f0a060" strokeWidth="2.5"/>
        {/* Arrow */}
        <path d="M 88 100 L 88 46" stroke="#f0a060" strokeWidth="2.5" fill="none" markerEnd="url(#arr2)"/>
        <text x="90" y="118" fontSize="11" fill="#f0a060" fontWeight="600">② Click Upload</text>
        {/* Sidebar */}
        <rect x="0" y="44" width="60" height="216" fill="#22222c"/>
        {/* Viewer - empty state */}
        <rect x="60" y="44" width="340" height="216" fill="#19191f"/>
        <circle cx="230" cy="152" r="40" fill="#25252f"/>
        <text x="230" y="156" textAnchor="middle" fontSize="10" fill="#4a4a5a">Drop files here</text>
        {/* Drop zone highlight */}
        <rect x="100" y="80" width="240" height="140" rx="12" fill="none" stroke="#e07b3f" strokeWidth="2" strokeDasharray="8,4" opacity="0.7"/>
        <text x="220" y="230" textAnchor="middle" fontSize="10" fill="#e07b3f">or drag & drop panoramas</text>
        {/* Props panel */}
        <rect x="400" y="44" width="80" height="216" fill="#22222c"/>
        <defs><marker id="arr2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker></defs>
      </svg>
    ),
  },
  {
    id: 3,
    title: 'Add Hotspots',
    icon: <Navigation size={18} />,
    summary: 'Place navigation hotspots to connect scenes together.',
    description: 'Click "Hotspot" in the toolbar (or press H), then click anywhere in the panorama to place a navigation marker. A scene picker pops up — select the destination scene. In the viewer, click the hotspot icon to teleport to the linked scene.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        {/* Toolbar */}
        <rect x="0" y="0" width="480" height="44" rx="10" fill="#25252f"/>
        <rect x="0" y="34" width="480" height="10" fill="#25252f"/>
        {/* Hotspot button */}
        <rect x="130" y="9" width="68" height="26" rx="6" fill="#e07b3f" fillOpacity="0.2"/>
        <text x="164" y="26" textAnchor="middle" fontSize="10" fill="#e07b3f">＋ Hotspot</text>
        <rect x="126" y="5" width="76" height="34" rx="8" fill="none" stroke="#f0a060" strokeWidth="2.5"/>
        <path d="M 164 52 L 164 44" stroke="#f0a060" strokeWidth="2" fill="none" markerEnd="url(#arr3)"/>
        <text x="120" y="68" fontSize="10" fill="#f0a060">③ Click Hotspot</text>
        {/* Panorama viewer */}
        <rect x="60" y="44" width="340" height="200" fill="#19191f"/>
        <image href="" x="60" y="44" width="340" height="200"/>
        {/* Panorama content suggestion */}
        <rect x="60" y="44" width="340" height="200" rx="0" fill="url(#pano-grad)"/>
        <defs>
          <linearGradient id="pano-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a3a4a"/>
            <stop offset="50%" stopColor="#3a4a5a"/>
            <stop offset="100%" stopColor="#2a3a4a"/>
          </linearGradient>
          <marker id="arr3" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
          <marker id="arr4" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#60c0ff"/></marker>
        </defs>
        {/* Crosshair cursor */}
        <line x1="240" y1="135" x2="240" y2="155" stroke="#e07b3f" strokeWidth="1.5"/>
        <line x1="230" y1="145" x2="250" y2="145" stroke="#e07b3f" strokeWidth="1.5"/>
        {/* Click indicator */}
        <circle cx="240" cy="145" r="16" fill="none" stroke="#e07b3f" strokeWidth="1.5" opacity="0.6"/>
        <text x="265" y="140" fontSize="9" fill="#e07b3f">click to place</text>
        {/* Hotspot icon placed */}
        <circle cx="180" cy="160" r="14" fill="#1e1e26" fillOpacity="0.8" stroke="#e07b3f" strokeWidth="2"/>
        <text x="180" y="164" textAnchor="middle" fontSize="10" fill="#e07b3f">→</text>
        <rect x="155" y="140" width="50" height="36" rx="8" fill="none" stroke="#60c0ff" strokeWidth="2"/>
        <path d="M 155 158 Q 120 158 120 180 L 120 190" stroke="#60c0ff" strokeWidth="2" fill="none" markerEnd="url(#arr4)"/>
        <text x="80" y="200" fontSize="9" fill="#60c0ff">④ Click hotspot</text>
        <text x="80" y="213" fontSize="9" fill="#60c0ff">  to teleport</text>
        {/* Sidebar & props */}
        <rect x="0" y="44" width="60" height="200" fill="#22222c"/>
        <rect x="400" y="44" width="80" height="200" fill="#22222c"/>
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
        <rect width="480" height="260" rx="10" fill="#1e1e26" fillOpacity="0.5"/>
        {/* Scene picker modal */}
        <rect x="80" y="20" width="320" height="220" rx="14" fill="#25252f"/>
        <rect x="80" y="20" width="320" height="220" rx="14" fill="none" stroke="#e07b3f" strokeWidth="2"/>
        {/* Title */}
        <text x="240" y="44" textAnchor="middle" fontSize="13" fill="#e0ddd8" fontWeight="bold">Select Destination Scene</text>
        <line x1="96" y1="52" x2="384" y2="52" stroke="#3a3a48" strokeWidth="1"/>
        {/* Scene thumbnails */}
        {[0,1,2].map(i => (
          <g key={i}>
            <rect x={100 + i*108} y={62} width={96} height={70} rx="8" fill={i===1 ? '#3a2a18' : '#2a2a34'}
              stroke={i===1 ? '#e07b3f' : '#3a3a48'} strokeWidth={i===1 ? 2.5 : 1}/>
            <rect x={100 + i*108} y={62} width={96} height={52} rx="8" fill={['#2a3a4a','#3a4a2a','#3a2a4a'][i]}/>
            <text x={148 + i*108} y={146} textAnchor="middle" fontSize="9" fill={i===1 ? '#e07b3f' : '#9a9aaa'}>
              {['Scene 01','Scene 02 ✓','Scene 03'][i]}
            </text>
          </g>
        ))}
        {/* Annotation on selected */}
        <rect x="196" y="56" width="112" height="88" rx="10" fill="none" stroke="#f0a060" strokeWidth="2.5"/>
        <text x="252" y="162" textAnchor="middle" fontSize="9" fill="#f0a060">Linked ✓</text>
        {/* Arrow */}
        <path d="M 360 100 Q 390 100 390 140 L 360 160" stroke="#f0a060" strokeWidth="2" fill="none" markerEnd="url(#arr5)"/>
        <text x="363" y="96" fontSize="9" fill="#f0a060">⑤ Click to link</text>
        {/* Close button */}
        <circle cx="376" cy="32" r="10" fill="#3a3a48"/>
        <text x="376" y="36" textAnchor="middle" fontSize="11" fill="#9a9aaa">✕</text>
        <defs><marker id="arr5" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker></defs>
      </svg>
    ),
  },
  {
    id: 5,
    title: 'Properties Panel',
    icon: <Navigation size={18} />,
    summary: 'Customise each scene and hotspot from the right-side panel.',
    description: 'Click any scene in the sidebar to see its properties: rename it, change panorama format (mono/stereo/fisheye), save your current camera view as the initial angle. Click a hotspot to change its icon, tooltip label, or re-link it to a different scene.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        <rect x="0" y="0" width="480" height="44" rx="10" fill="#25252f"/>
        <rect x="0" y="34" width="480" height="10" fill="#25252f"/>
        {/* Sidebar */}
        <rect x="0" y="44" width="80" height="216" fill="#22222c"/>
        <text x="40" y="65" textAnchor="middle" fontSize="9" fill="#6b7094">SCENES</text>
        {['Scene 01','Scene 02','Scene 03'].map((n,i)=>(
          <g key={i}>
            <rect x="6" y={74+i*36} width="68" height="28" rx="6" fill={i===0 ? '#2e2e3a' : '#22222c'}
              stroke={i===0 ? '#e07b3f' : 'none'} strokeWidth="1.5"/>
            <rect x="10" y={78+i*36} width="20" height="20" rx="3" fill="#3a3a48"/>
            <text x="34" y={92+i*36} fontSize="8" fill={i===0 ? '#e0ddd8' : '#6b7094'}>{n}</text>
          </g>
        ))}
        {/* Viewer */}
        <rect x="80" y="44" width="260" height="216" fill="#19191f"/>
        <rect x="80" y="44" width="260" height="216" fill="url(#v-grad)"/>
        <defs>
          <linearGradient id="v-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a3a4a"/>
            <stop offset="100%" stopColor="#1a2a3a"/>
          </linearGradient>
          <marker id="arr6" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
        </defs>
        {/* Properties panel */}
        <rect x="340" y="44" width="140" height="216" fill="#22222c"/>
        <rect x="340" y="44" width="140" height="216" rx="0" fill="none" stroke="#f0a060" strokeWidth="2.5"/>
        <text x="410" y="64" textAnchor="middle" fontSize="9" fill="#e07b3f" fontWeight="bold">PROPERTIES</text>
        <line x1="346" y1="70" x2="474" y2="70" stroke="#3a3a48" strokeWidth="1"/>
        {/* Fields */}
        {[
          ['Scene Name','Scene 01'],
          ['Format','EQUIRECT'],
          ['Initial View','Save Current View'],
        ].map(([label, val], i) => (
          <g key={i}>
            <text x="348" y={88+i*44} fontSize="8" fill="#6b7094">{label}</text>
            <rect x="346" y={93+i*44} width="126" height="22" rx="4" fill="#2a2a34"/>
            <text x="355" y={108+i*44} fontSize="8" fill={i===2 ? '#e07b3f' : '#e0ddd8'}>{val}</text>
          </g>
        ))}
        {/* Arrow from panel */}
        <path d="M 330 152 L 350 152" stroke="#f0a060" strokeWidth="2" fill="none" markerEnd="url(#arr6)"/>
        <text x="200" y="148" fontSize="9" fill="#f0a060" textAnchor="middle">⑥ Edit scene properties</text>
        <text x="200" y="162" fontSize="9" fill="#f0a060" textAnchor="middle">in the right panel</text>
      </svg>
    ),
  },
  {
    id: 6,
    title: 'Preview & Save',
    icon: <Eye size={18} />,
    summary: 'Test your tour in preview mode, then save or publish.',
    description: 'Click "Preview" in the toolbar to enter full-screen preview mode — all hotspots become clickable and teleport you between scenes. Use the bottom navigation dots to jump between scenes. Click "Save" to save your work, or "Publish" to export the tour as a shareable JSON package.',
    diagram: (
      <svg viewBox="0 0 480 260" className="w-full" style={{ maxHeight: 260 }}>
        <rect width="480" height="260" rx="10" fill="#1e1e26"/>
        <rect x="0" y="0" width="480" height="44" rx="10" fill="#25252f"/>
        <rect x="0" y="34" width="480" height="10" fill="#25252f"/>
        {/* Save button */}
        <rect x="320" y="9" width="54" height="26" rx="6" fill="#2e2e3a"/>
        <text x="347" y="26" textAnchor="middle" fontSize="10" fill="#e0ddd8">💾 Save</text>
        {/* Preview button */}
        <rect x="378" y="9" width="60" height="26" rx="6" fill="#2e2e3a"/>
        <text x="408" y="26" textAnchor="middle" fontSize="10" fill="#e0ddd8">👁 Preview</text>
        <rect x="374" y="5" width="68" height="34" rx="8" fill="none" stroke="#f0a060" strokeWidth="2.5"/>
        <path d="M 408 48 L 408 44" stroke="#f0a060" strokeWidth="2" fill="none" markerEnd="url(#arr7)"/>
        <text x="360" y="62" fontSize="9" fill="#f0a060">⑦ Enter preview mode</text>
        {/* Preview mode viewer */}
        <rect x="0" y="44" width="480" height="216" fill="#0e1018"/>
        <rect x="0" y="44" width="480" height="216" fill="url(#preview-grad)"/>
        <defs>
          <radialGradient id="preview-grad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#2a3a5a"/>
            <stop offset="100%" stopColor="#0e1018"/>
          </radialGradient>
          <marker id="arr7" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f0a060"/></marker>
        </defs>
        {/* Hotspot icons */}
        <circle cx="200" cy="152" r="16" fill="#1e1e26cc" stroke="white" strokeWidth="2"/>
        <text x="200" y="157" textAnchor="middle" fontSize="12" fill="white">→</text>
        <text x="200" y="180" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.7">Next Room</text>
        {/* Bottom nav */}
        <rect x="0" y="220" width="480" height="40" fill="url(#nav-grad)"/>
        <defs>
          <linearGradient id="nav-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent"/>
            <stop offset="100%" stopColor="#00000099"/>
          </linearGradient>
        </defs>
        {/* Scene dots */}
        {[0,1,2].map(i=>(
          <circle key={i} cx={222+i*14} cy={238} r={i===0?5:4}
            fill={i===0 ? 'white' : 'rgba(255,255,255,0.4)'}/>
        ))}
        <rect x="160" y="218" width="160" height="30" rx="0" fill="none" stroke="#60c0ff" strokeWidth="1.5"/>
        <text x="240" y="252" textAnchor="middle" fontSize="8" fill="#60c0ff">Scene navigation dots</text>
        {/* Exit button */}
        <rect x="10" y="224" width="50" height="18" rx="6" fill="rgba(0,0,0,0.5)"/>
        <text x="35" y="236" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">✕ Exit</text>
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

          {/* Tips */}
          {current.id === 3 && (
            <div className="mt-3 rounded-xl px-4 py-3 flex gap-2"
              style={{ background: 'rgba(224,123,63,0.08)', border: '1px solid rgba(224,123,63,0.2)' }}>
              <span className="text-nm-accent text-base flex-shrink-0">💡</span>
              <p className="text-xs text-nm-text leading-relaxed">
                <strong>Keyboard shortcut:</strong> Press <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: 'rgba(255,255,255,.1)', border: '1px solid var(--nm-border)' }}>H</kbd> to activate the Hotspot tool,{' '}
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: 'rgba(255,255,255,.1)', border: '1px solid var(--nm-border)' }}>M</kbd> for Media,{' '}
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: 'rgba(255,255,255,.1)', border: '1px solid var(--nm-border)' }}>Esc</kbd> to cancel.
              </p>
            </div>
          )}
          {current.id === 2 && (
            <div className="mt-3 rounded-xl px-4 py-3 flex gap-2"
              style={{ background: 'rgba(224,123,63,0.08)', border: '1px solid rgba(224,123,63,0.2)' }}>
              <span className="text-nm-accent text-base flex-shrink-0">📐</span>
              <p className="text-xs text-nm-text leading-relaxed">
                Supported formats: <strong>Equirectangular</strong> (2:1 ratio), <strong>Stereo SBS</strong> (4:1), <strong>Stereo Top-Bottom</strong> (1:1), <strong>Fisheye</strong> (auto-converted), <strong>360° video</strong> (MP4/WebM).
                The format is auto-detected from the image dimensions — you can override it in the Properties panel.
              </p>
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
