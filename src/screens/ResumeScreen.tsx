import React, { useState } from 'react';
import {
  Mail, Phone, MapPin, Globe, Linkedin, Github,
  Download, ExternalLink, Briefcase, GraduationCap,
  Code2, Layers, Award, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────────────────── */

const PROFILE = {
  name: 'Sanobar Nazirova',
  title: 'Architect & Creative Technologist',
  summary:
    'Award-winning architect with 8+ years designing immersive built environments and pioneering digital-first workflows. Creator of ArchScape — a browser-based virtual tour platform that lets architects share spaces before they exist. Comfortable moving between physical blueprints and interactive 3-D experiences.',
  location: 'Tashkent, Uzbekistan',
  email: 'sanobar@archscape.io',
  phone: '+998 90 123 4567',
  website: 'archscape.io',
  linkedin: 'linkedin.com/in/sanobar-nazirova',
  github: 'github.com/sanobar-nazirova',
};

const EXPERIENCE = [
  {
    role: 'Founder & Lead Architect',
    company: 'ArchScape',
    period: '2022 – Present',
    location: 'Remote',
    bullets: [
      'Built and launched ArchScape — a browser-native 360° virtual-tour platform for architects, adopted by 2 000+ studios worldwide.',
      'Designed the end-to-end product: UX, interaction model, and the equirectangular–fisheye panorama pipeline.',
      'Led a 4-person team shipping bi-weekly releases with zero-downtime Vercel deployments.',
    ],
  },
  {
    role: 'Senior Architect',
    company: 'Forma Studio',
    period: '2019 – 2022',
    location: 'Dubai, UAE',
    bullets: [
      'Led design of a 120-unit mixed-use tower in Downtown Dubai from concept through construction administration.',
      'Introduced VR walkthroughs to client presentations, reducing revision cycles by 35%.',
      'Mentored junior architects on BIM workflows and parametric design in Grasshopper.',
    ],
  },
  {
    role: 'Architectural Designer',
    company: 'Zaha Hadid Architects',
    period: '2016 – 2019',
    location: 'London, UK',
    bullets: [
      'Contributed to competition entries and schematic design for cultural and civic projects across Asia and the Middle East.',
      'Developed computational facade systems using Rhino/Grasshopper, cutting fabrication complexity by 20%.',
      'Produced client-ready renders and physical models for projects valued at £500M+.',
    ],
  },
];

const EDUCATION = [
  {
    degree: 'Master of Architecture (MArch)',
    school: 'Bartlett School of Architecture, UCL',
    year: '2016',
    detail: 'Distinction · Thesis: "Responsive Skins — Parametric Facades for Climate Adaptation"',
  },
  {
    degree: 'Bachelor of Architecture (BArch)',
    school: 'Tashkent State Technical University',
    year: '2014',
    detail: 'First-Class Honours · Valedictorian',
  },
];

const SKILLS = {
  'Architecture & Design': [
    'Schematic Design', 'Design Development', 'BIM / Revit', 'AutoCAD',
    'Rhino 3-D', 'Grasshopper', 'Parametric Design', 'Construction Docs',
  ],
  'Digital & Development': [
    'React / TypeScript', 'Three.js / WebGL', 'Tailwind CSS', 'Vite',
    'Node.js', 'Figma', 'Python (Scripting)', 'Git / CI-CD',
  ],
  'Visualisation': [
    'V-Ray', 'Enscape', '360° Photography', 'Equirectangular Panoramas',
    'Unreal Engine (Arch-Viz)', 'Adobe Creative Suite',
  ],
};

const PROJECTS = [
  {
    name: 'ArchScape Platform',
    year: '2022–Present',
    description:
      'Open-source browser-native virtual tour creator. Supports equirectangular, fisheye, and cubemap panoramas with hotspot navigation, media overlays, and real-time presentation mode.',
    tags: ['React', 'Three.js', 'TypeScript', 'WebGL'],
    link: 'archscape.io',
  },
  {
    name: 'Silk Road Cultural Hub',
    year: '2021',
    description:
      'Mixed-use cultural centre in Samarkand, Uzbekistan. 8 400 m² of public space weaving traditional Timurid geometry with contemporary structural engineering.',
    tags: ['Cultural', 'Parametric', 'BIM'],
  },
  {
    name: 'Desert Bloom Residence',
    year: '2020',
    description:
      'Private villa in Ras Al Khaimah featuring a passive-cooling facade system derived from Voronoi tessellation — reducing HVAC loads by 28%.',
    tags: ['Residential', 'Grasshopper', 'Sustainability'],
  },
];

const AWARDS = [
  { title: 'RIBA President\'s Medal — Commendation', year: '2016' },
  { title: 'Dezeen Award — Digital Architecture Tool of the Year', year: '2023' },
  { title: 'Forbes 30 Under 30 — Architecture & Design (EMEA)', year: '2022' },
];

/* ─── Sub-components ────────────────────────────────────────────────────── */

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-8 h-8 rounded-nm-sm flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--nm-base)',
          boxShadow: '4px 4px 10px var(--sh-d), -2px -2px 6px var(--sh-l)',
          color: 'var(--nm-accent)',
        }}
      >
        <Icon size={15} />
      </div>
      <h2 className="font-syne text-base font-bold tracking-wide text-nm-text uppercase">
        {label}
      </h2>
      <div className="flex-1 h-px" style={{ background: 'var(--nm-border)' }} />
    </div>
  );
}

function SkillPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-nm-muted"
      style={{ boxShadow: '3px 3px 7px var(--sh-d), -2px -2px 5px var(--sh-l)', background: 'var(--nm-base)' }}
    >
      {label}
    </span>
  );
}

function ProjectCard({ project }: { project: typeof PROJECTS[0] }) {
  return (
    <div
      className="rounded-nm p-5"
      style={{ background: 'var(--nm-base)', boxShadow: '6px 6px 14px var(--sh-d), -4px -4px 10px var(--sh-l)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-syne font-semibold text-nm-text">{project.name}</h4>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-nm-muted">{project.year}</span>
          {project.link && (
            <a
              href={`https://${project.link}`}
              target="_blank"
              rel="noreferrer"
              className="text-nm-accent hover:text-nm-text transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
      <p className="text-sm text-nm-muted leading-relaxed mb-3">{project.description}</p>
      <div className="flex flex-wrap gap-2">
        {project.tags.map(t => (
          <span
            key={t}
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(224,123,63,0.12)', color: 'var(--nm-accent)' }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── ResumeScreen ──────────────────────────────────────────────────────── */

export default function ResumeScreen() {
  const [expandedExp, setExpandedExp] = useState<number | null>(null);

  const handlePrint = () => window.print();

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: 'var(--nm-base)', color: 'var(--nm-text)' }}
    >
      {/* ── Sticky nav bar ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 sm:px-10 h-14 print:hidden"
        style={{ background: 'var(--nm-base)', boxShadow: '0 4px 14px var(--sh-d)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="logo-512.png"
            alt="ArchScape"
            className="w-8 h-8 rounded-full object-cover"
            style={{ boxShadow: '3px 3px 8px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
          />
          <span className="font-syne text-sm font-bold text-nm-text">ArchScape</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-nm-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 10px rgba(224,123,63,.35)' }}
        >
          <Download size={13} />
          Download PDF
        </button>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-10">

        {/* ── Hero / Profile ─────────────────────────────────────────── */}
        <section
          className="rounded-nm-lg p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-center sm:items-start"
          style={{ boxShadow: '10px 10px 24px var(--sh-d), -6px -6px 16px var(--sh-l)' }}
        >
          {/* Avatar */}
          <div
            className="w-28 h-28 rounded-full flex-shrink-0 flex items-center justify-center font-syne text-3xl font-bold"
            style={{
              boxShadow: '8px 8px 18px var(--sh-d), -5px -5px 12px var(--sh-l)',
              background: 'var(--nm-base)',
              color: 'var(--nm-accent)',
            }}
          >
            SN
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-syne text-3xl sm:text-4xl font-bold text-nm-text mb-1">
              {PROFILE.name}
            </h1>
            <p className="font-syne text-nm-accent font-semibold mb-4 tracking-wide">
              {PROFILE.title}
            </p>
            <p className="text-sm text-nm-muted leading-relaxed max-w-2xl mb-6">
              {PROFILE.summary}
            </p>

            {/* Contact row */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              {[
                { icon: MapPin, label: PROFILE.location },
                { icon: Mail,   label: PROFILE.email,    href: `mailto:${PROFILE.email}` },
                { icon: Phone,  label: PROFILE.phone,    href: `tel:${PROFILE.phone}` },
                { icon: Globe,  label: PROFILE.website,  href: `https://${PROFILE.website}` },
                { icon: Linkedin, label: 'LinkedIn',     href: `https://${PROFILE.linkedin}` },
                { icon: Github,   label: 'GitHub',       href: `https://${PROFILE.github}` },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href ?? '#'}
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-nm-sm text-xs text-nm-muted hover:text-nm-accent transition-colors"
                  style={{ boxShadow: '3px 3px 7px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
                >
                  <Icon size={12} />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Experience ─────────────────────────────────────────────── */}
        <section>
          <SectionHeading icon={Briefcase} label="Experience" />
          <div className="space-y-4">
            {EXPERIENCE.map((exp, i) => {
              const open = expandedExp === i;
              return (
                <div
                  key={i}
                  className="rounded-nm overflow-hidden"
                  style={{ boxShadow: '6px 6px 14px var(--sh-d), -4px -4px 10px var(--sh-l)' }}
                >
                  <button
                    className="w-full flex items-start sm:items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedExp(open ? null : i)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-syne font-semibold text-nm-text">{exp.role}</span>
                        <span className="text-nm-accent text-sm font-medium">· {exp.company}</span>
                      </div>
                      <p className="text-xs text-nm-muted mt-0.5">
                        {exp.period} · {exp.location}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-nm-muted">
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {open && (
                    <div
                      className="px-5 pb-5"
                      style={{ borderTop: '1px solid var(--nm-border)' }}
                    >
                      <ul className="mt-4 space-y-2">
                        {exp.bullets.map((b, j) => (
                          <li key={j} className="flex gap-2 text-sm text-nm-muted leading-relaxed">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--nm-accent)' }} />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Skills ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeading icon={Code2} label="Skills" />
          <div className="space-y-5">
            {Object.entries(SKILLS).map(([category, skills]) => (
              <div key={category}>
                <p className="text-[11px] uppercase tracking-widest text-nm-muted mb-3 ml-1">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => <SkillPill key={s} label={s} />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Projects ───────────────────────────────────────────────── */}
        <section>
          <SectionHeading icon={Layers} label="Selected Projects" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROJECTS.map((p, i) => <ProjectCard key={i} project={p} />)}
          </div>
        </section>

        {/* ── Education ──────────────────────────────────────────────── */}
        <section>
          <SectionHeading icon={GraduationCap} label="Education" />
          <div className="space-y-4">
            {EDUCATION.map((edu, i) => (
              <div
                key={i}
                className="rounded-nm p-5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6"
                style={{ boxShadow: '6px 6px 14px var(--sh-d), -4px -4px 10px var(--sh-l)' }}
              >
                <div
                  className="w-12 h-12 rounded-nm-sm flex items-center justify-center flex-shrink-0 text-sm font-syne font-bold"
                  style={{
                    background: 'var(--nm-base)',
                    boxShadow: 'inset 3px 3px 7px var(--sh-d-in), inset -2px -2px 5px var(--sh-l-in)',
                    color: 'var(--nm-accent)',
                  }}
                >
                  {edu.year}
                </div>
                <div>
                  <p className="font-syne font-semibold text-nm-text">{edu.degree}</p>
                  <p className="text-sm text-nm-accent">{edu.school}</p>
                  <p className="text-xs text-nm-muted mt-1">{edu.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Awards ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeading icon={Award} label="Awards & Recognition" />
          <div
            className="rounded-nm overflow-hidden divide-y"
            style={{
              boxShadow: '6px 6px 14px var(--sh-d), -4px -4px 10px var(--sh-l)',
              borderColor: 'var(--nm-border)',
            }}
          >
            {AWARDS.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4"
                style={{ borderColor: 'var(--nm-border)' }}
              >
                <p className="text-sm text-nm-text font-medium">{a.title}</p>
                <span
                  className="flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ml-4"
                  style={{ background: 'rgba(224,123,63,0.12)', color: 'var(--nm-accent)' }}
                >
                  {a.year}
                </span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="text-center py-8 print:hidden">
        <p className="text-xs text-nm-muted">
          Built with{' '}
          <a href="https://archscape.io" className="text-nm-accent hover:underline">ArchScape</a>
          {' '}· {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
