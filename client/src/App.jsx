import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Users, LogOut, Plus, Trash2, X, Star, ExternalLink, Search,
  FileText, MessageSquare, ClipboardCheck, Copy, Check, Mail, ChevronRight
} from 'lucide-react';
import { api, timeAgo } from './api.js';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
const STAGE_COLORS = {
  applied: 'text-zinc-300', screening: 'text-sky-400', interview: 'text-violet-400',
  offer: 'text-amber-400', hired: 'text-emerald-400', rejected: 'text-red-400'
};
const card = 'bg-zinc-900/70 border border-zinc-800 rounded-2xl';
const input = 'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-500';
const btn = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors';
const btnPrimary = `${btn} bg-sky-600 hover:bg-sky-500 text-white`;

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange && onChange(n === value ? 0 : n)} className="p-0.5">
          <Star size={14} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />
        </button>
      ))}
    </div>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="text-zinc-400 hover:text-sky-400 p-1" title="Copy"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); })}>
      {ok ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function Login({ onDone }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`${card} p-8 w-full max-w-sm`}
        onSubmit={async (e) => {
          e.preventDefault();
          try { await api.login(pw); onDone(); } catch { setErr('Wrong password'); }
        }}>
        <div className="flex items-center gap-2 mb-1 text-sky-400"><Briefcase /><span className="text-xl font-black text-white">Hirestack</span></div>
        <p className="text-zinc-500 text-sm mb-6">Your hiring pipeline, on your server. Sign in.</p>
        <input className={input} type="password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
        <button className={`${btnPrimary} w-full justify-center mt-4`}>Sign in</button>
      </motion.form>
    </div>
  );
}

function JobModal({ onClose, onSaved }) {
  const [f, setF] = useState({ title: '', location: '', employment_type: 'full-time', description: '' });
  const [err, setErr] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className={`${card} p-6 w-full max-w-lg max-h-[90vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">New job posting</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input className={input} placeholder="Job title (e.g. Senior Frontend Engineer)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="flex gap-2">
            <input className={input} placeholder="Location (Remote, Austin TX…)" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
            <select className={input} value={f.employment_type} onChange={(e) => setF({ ...f, employment_type: e.target.value })}>
              <option>full-time</option><option>part-time</option><option>contract</option><option>internship</option>
            </select>
          </div>
          <textarea className={`${input} h-40`} placeholder="Job description (shown on the public careers page)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
        <button className={`${btnPrimary} w-full justify-center mt-5`} onClick={async () => {
          try { onSaved(await api.createJob(f)); } catch (e) { setErr(e.message); }
        }}>Publish (opens on careers page)</button>
      </motion.div>
    </div>
  );
}

function CandidateDrawer({ id, onClose, onChanged }) {
  const [c, setC] = useState(null);
  const [note, setNote] = useState({ author: '', body: '', kind: 'note' });
  const [sc, setSc] = useState({ interviewer: '', criteria: [{ criterion: 'Technical skills', rating: 3, comment: '' }] });
  const [tags, setTags] = useState('');
  const load = () => api.candidate(id).then((d) => { setC(d); setTags(d.tags.join(', ')); }).catch(() => {});
  useEffect(() => { load(); }, [id]);
  if (!c) return null;
  const patch = async (body) => { await api.updateCandidate(c.id, body); load(); onChanged(); };
  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex justify-end" onClick={onClose}>
      <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="w-full max-w-xl h-full overflow-y-auto bg-zinc-950 border-l border-zinc-800 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="font-bold text-lg">{c.name}</h3>
            <p className="text-zinc-500 text-sm">{c.email}{c.phone ? ` · ${c.phone}` : ''} · applied {timeAgo(c.created_at)}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{c.job_title} · via {c.source}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <select className={`${input} w-40`} value={c.stage} onChange={(e) => patch({ stage: e.target.value })}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Stars value={c.rating} onChange={(r) => patch({ rating: r })} />
          {c.resume_path && (
            <a className="text-sky-400 text-sm flex items-center gap-1 hover:underline" href={`/api/candidates/${c.id}/resume`}>
              <FileText size={14} />{c.resume_name || 'resume'}
            </a>
          )}
        </div>
        <div className="mt-3 flex gap-2 items-center">
          <input className={input} placeholder="tags, comma-separated (e.g. senior, referral)" value={tags} onChange={(e) => setTags(e.target.value)}
            onBlur={() => patch({ tags })} />
        </div>
        {c.cover_letter && (
          <div className={`${card} p-4 mt-4 text-sm whitespace-pre-wrap text-zinc-300`}>
            <div className="text-xs font-bold text-zinc-500 mb-2">COVER LETTER</div>{c.cover_letter}
          </div>
        )}

        <div className="mt-6">
          <div className="text-xs font-bold text-zinc-500 mb-2 flex items-center gap-1"><ClipboardCheck size={13} />SCORECARDS ({c.scorecards.length})</div>
          {c.scorecards.map((s) => (
            <div key={s.id} className={`${card} p-3 mb-2 text-sm`}>
              <div className="text-xs text-zinc-500 mb-1">{s.interviewer || 'anonymous'} · {timeAgo(s.at)}</div>
              {s.criteria.map((cr, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span>{cr.criterion}{cr.comment && <span className="text-zinc-500"> — {cr.comment}</span>}</span>
                  <Stars value={cr.rating} />
                </div>
              ))}
            </div>
          ))}
          <div className={`${card} p-3 mt-2`}>
            <input className={`${input} mb-2`} placeholder="Interviewer name" value={sc.interviewer} onChange={(e) => setSc({ ...sc, interviewer: e.target.value })} />
            {sc.criteria.map((cr, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input className={input} placeholder="Criterion" value={cr.criterion}
                  onChange={(e) => setSc({ ...sc, criteria: sc.criteria.map((x, j) => j === i ? { ...x, criterion: e.target.value } : x) })} />
                <Stars value={cr.rating} onChange={(r) => setSc({ ...sc, criteria: sc.criteria.map((x, j) => j === i ? { ...x, rating: r || 1 } : x) })} />
              </div>
            ))}
            <div className="flex justify-between">
              <button className="text-xs text-sky-400 hover:underline" onClick={() => setSc({ ...sc, criteria: [...sc.criteria, { criterion: '', rating: 3, comment: '' }] })}>+ criterion</button>
              <button className={`${btn} bg-zinc-800 hover:bg-zinc-700 text-xs`} onClick={async () => {
                await api.addScorecard(c.id, sc); setSc({ interviewer: '', criteria: [{ criterion: 'Technical skills', rating: 3, comment: '' }] }); load();
              }}>Save scorecard</button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-bold text-zinc-500 mb-2 flex items-center gap-1"><MessageSquare size={13} />NOTES & EMAIL LOG ({c.notes.length})</div>
          {c.notes.map((n) => (
            <div key={n.id} className={`${card} p-3 mb-2 text-sm`}>
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                {n.kind === 'email' && <Mail size={11} className="text-amber-400" />}
                {n.author || 'anonymous'} · {timeAgo(n.at)}
              </div>
              <div className="whitespace-pre-wrap text-zinc-300">{n.body}</div>
            </div>
          ))}
          <div className={`${card} p-3 mt-2`}>
            <div className="flex gap-2 mb-2">
              <input className={input} placeholder="Your name" value={note.author} onChange={(e) => setNote({ ...note, author: e.target.value })} />
              <select className={`${input} w-32`} value={note.kind} onChange={(e) => setNote({ ...note, kind: e.target.value })}>
                <option value="note">note</option><option value="email">email log</option>
              </select>
            </div>
            <textarea className={`${input} h-20`} placeholder={note.kind === 'email' ? 'Paste the email thread here…' : 'Interview notes, impressions…'}
              value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} />
            <button className={`${btn} bg-zinc-800 hover:bg-zinc-700 text-xs mt-2`} onClick={async () => {
              if (!note.body.trim()) return;
              await api.addNote(c.id, note); setNote({ ...note, body: '' }); load();
            }}>Add</button>
          </div>
        </div>

        <button className="text-red-400/70 hover:text-red-400 text-xs mt-8" onClick={async () => {
          if (confirm(`Delete ${c.name} and all their data?`)) { await api.deleteCandidate(c.id); onChanged(); onClose(); }
        }}>Delete candidate</button>
      </motion.div>
    </div>
  );
}

function Pipeline({ job, onBack }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [dragId, setDragId] = useState(null);
  const load = () => api.candidates({ job_id: job.id }).then(setRows).catch(() => {});
  useEffect(() => { load(); }, [job.id]);
  const move = async (id, stage) => { await api.updateCandidate(id, { stage }); load(); };
  const publicUrl = `${window.location.origin}/careers/${job.public_slug}`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button className="text-zinc-500 hover:text-white text-sm" onClick={onBack}>← Jobs</button>
        <h2 className="font-bold text-lg flex-1">{job.title}</h2>
        <span className="text-xs text-zinc-500 font-mono flex items-center">{publicUrl}<CopyBtn text={publicUrl} /></span>
        <a className="text-sky-400 text-xs flex items-center gap-1 hover:underline" href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} />open</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((stage) => (
          <div key={stage} className="min-h-40 rounded-xl bg-zinc-900/40 border border-zinc-800/60 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && move(dragId, stage)}>
            <div className={`text-[11px] font-bold uppercase mb-2 px-1 ${STAGE_COLORS[stage]}`}>
              {stage} <span className="text-zinc-600">{rows.filter((r) => r.stage === stage).length}</span>
            </div>
            {rows.filter((r) => r.stage === stage).map((r) => (
              <div key={r.id} draggable onDragStart={() => setDragId(r.id)} onDragEnd={() => setDragId(null)}
                onClick={() => setOpen(r.id)}
                className={`${card} p-2.5 mb-2 cursor-pointer hover:border-sky-500/50 text-sm`}>
                <div className="font-semibold truncate">{r.name}</div>
                <div className="text-[11px] text-zinc-500 truncate">{r.email}</div>
                <div className="flex items-center justify-between mt-1">
                  <Stars value={r.rating} />
                  {r.resume_path && <FileText size={12} className="text-zinc-600" />}
                </div>
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.tags.map((t) => <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1">{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-600 mt-3">Drag cards between stages, or click a card for notes, scorecards and the resume.</p>
      {open && <CandidateDrawer id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

function Jobs({ onOpen }) {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const load = () => api.jobs().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">Job postings</h2>
        <div className="flex items-center gap-3">
          <a className="text-sky-400 text-xs flex items-center gap-1 hover:underline" href="/careers" target="_blank" rel="noreferrer">
            <ExternalLink size={12} />public careers page
          </a>
          <button className={btnPrimary} onClick={() => setModal(true)}><Plus size={16} />New job</button>
        </div>
      </div>
      <div className="grid gap-3">
        {rows?.length === 0 && <div className={`${card} p-8 text-center text-zinc-500`}>No jobs yet. Post one — it appears on your public careers page instantly.</div>}
        {rows?.map((j) => (
          <motion.div layout key={j.id} className={`${card} p-4 flex flex-wrap items-center gap-3`}>
            <div className="flex-1 min-w-44 cursor-pointer" onClick={() => onOpen(j)}>
              <div className="font-semibold flex items-center gap-2">
                {j.title}
                <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${j.status === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/40 text-zinc-400'}`}>
                  {j.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-zinc-500">{j.location || 'anywhere'} · {j.employment_type} · /careers/{j.public_slug}</div>
            </div>
            <div className="flex gap-3 text-center text-xs">
              {STAGES.slice(0, 4).map((s) => (
                <div key={s}><div className="font-bold text-sm">{j.by_stage[s]}</div><div className="text-zinc-600">{s}</div></div>
              ))}
              <div><div className="font-bold text-sm text-emerald-400">{j.by_stage.hired}</div><div className="text-zinc-600">hired</div></div>
            </div>
            <div className="flex gap-1 items-center">
              <button className={`${btn} text-xs px-3 py-1.5 ${j.status === 'open' ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-500/15 text-emerald-400'}`}
                onClick={async () => { await api.updateJob(j.id, { status: j.status === 'open' ? 'closed' : 'open' }); load(); }}>
                {j.status === 'open' ? 'Close' : 'Reopen'}
              </button>
              <button className="p-2 text-zinc-400 hover:text-red-400" title="Delete" onClick={async () => {
                if (confirm(`Delete "${j.title}" and its ${j.candidates} candidates?`)) { await api.deleteJob(j.id); load(); }
              }}><Trash2 size={15} /></button>
              <button className="p-2 text-zinc-400 hover:text-sky-400" onClick={() => onOpen(j)}><ChevronRight size={16} /></button>
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {modal && <JobModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function AllCandidates() {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ q: '', stage: '', tag: '', min_rating: '' });
  const [open, setOpen] = useState(null);
  const load = () => api.candidates(f).then(setRows).catch(() => {});
  useEffect(() => { load(); }, [JSON.stringify(f)]);
  return (
    <div>
      <h2 className="font-bold text-lg mb-4">All candidates</h2>
      <div className={`${card} p-3 mb-4 flex flex-wrap gap-2 items-center`}>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <input className={`${input} pl-8`} placeholder="Search name, email, cover letter…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <select className={`${input} w-36`} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>
          <option value="">any stage</option>{STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input className={`${input} w-32`} placeholder="tag" value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} />
        <select className={`${input} w-36`} value={f.min_rating} onChange={(e) => setF({ ...f, min_rating: e.target.value })}>
          <option value="">any rating</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}★ and up</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        {rows.length === 0 && <div className={`${card} p-8 text-center text-zinc-500`}>No candidates match.</div>}
        {rows.map((r) => (
          <div key={r.id} className={`${card} p-3 flex flex-wrap items-center gap-3 cursor-pointer hover:border-sky-500/40`} onClick={() => setOpen(r.id)}>
            <div className="flex-1 min-w-40">
              <div className="font-semibold text-sm">{r.name}</div>
              <div className="text-xs text-zinc-500">{r.email} · {r.job_title}</div>
            </div>
            {r.tags.map((t) => <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">{t}</span>)}
            <Stars value={r.rating} />
            <span className={`text-xs font-bold uppercase ${STAGE_COLORS[r.stage]}`}>{r.stage}</span>
            <span className="text-[11px] text-zinc-600">{timeAgo(r.created_at)}</span>
          </div>
        ))}
      </div>
      {open && <CandidateDrawer id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [tab, setTab] = useState('jobs');
  const [job, setJob] = useState(null);
  useEffect(() => { api.me().then((r) => setAuthed(r.authed)).catch(() => setAuthed(false)); }, []);
  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  const tabs = [['jobs', 'Jobs', Briefcase], ['candidates', 'Candidates', Users]];
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/70 sticky top-0 bg-zinc-950/80 backdrop-blur z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2 text-sky-400"><Briefcase size={20} /><span className="font-black text-white">Hirestack</span></div>
          <nav className="flex gap-1 flex-1">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => { setTab(id); setJob(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${tab === id && !job ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </nav>
          <button className="text-zinc-500 hover:text-white" title="Sign out" onClick={async () => { await api.logout(); setAuthed(false); }}><LogOut size={16} /></button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'jobs' && !job && <Jobs onOpen={setJob} />}
        {tab === 'jobs' && job && <Pipeline job={job} onBack={() => setJob(null)} />}
        {tab === 'candidates' && <AllCandidates />}
      </main>
    </div>
  );
}
