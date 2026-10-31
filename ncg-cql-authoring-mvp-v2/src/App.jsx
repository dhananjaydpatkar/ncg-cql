import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadStore, saveStore, resetStore, resetGuidelineToSeed } from './lib/store';
import { blankGuideline } from './lib/model';
import { validate } from './lib/validate';
import { runAllTests } from './lib/evaluate';
import { Setup } from './components/Setup';
import { Findings } from './components/Findings';
import { Functions } from './components/Functions';
import { Outcomes } from './components/Outcomes';
import { Rules } from './components/Rules';
import { Tests } from './components/Tests';
import { Publish } from './components/Publish';
import { CatalogModal } from './components/CatalogModal';
import { GuidedTour } from './components/GuidedTour';
import { Compass, Sparkles } from 'lucide-react';

const CDSS_URL = 'https://production.d363iqgbc372rx.amplifyapp.com/';

const TABS = [
  ['setup', '1 · Details'],
  ['findings', '2 · Findings'],
  ['functions', '3 · Functions'],
  ['outcomes', '4 · Outcomes'],
  ['rules', '5 · Rules'],
  ['tests', '6 · Test cases'],
  ['publish', '7 · Review & export'],
];

export default function App() {
  const [store, setStore] = useState(() => {
    const s = loadStore();
    const gParam = new URLSearchParams(window.location.search).get('guideline');
    if (gParam && s.guidelines.some((x) => x.id === gParam)) {
      return { ...s, activeId: gParam };
    }
    return s;
  });
  const [tab, setTabState] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('tab');
    return ['setup', 'findings', 'functions', 'outcomes', 'rules', 'tests', 'publish'].includes(p) ? p : 'setup';
  });
  const setTab = (t) => {
    setTabState(t);
    const url = new URL(window.location);
    url.searchParams.set('tab', t);
    window.history.replaceState({}, '', url);
  };
  const [msg, setMsg] = useState(null);
  const [globalCatalogOpen, setGlobalCatalogOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [hasSeenTourPrompt, setHasSeenTourPrompt] = useState(() => {
    try {
      return !!localStorage.getItem('clinical-tour-completed');
    } catch {
      return false;
    }
  });
  const fileRef = useRef();

  const startTour = (step = 0) => {
    setTourStep(step);
    setTourOpen(true);
  };

  const closeTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem('clinical-tour-completed', 'true');
    } catch {
      // ignore storage failure
    }
    setHasSeenTourPrompt(true);
  };

  useEffect(() => saveStore(store), [store]);
  const g = store.guidelines.find((x) => x.id === store.activeId) || store.guidelines[0];

  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2400); };
  const edit = (fn) => setStore((s) => {
    const guidelines = s.guidelines.map((x) => {
      if (x.id !== s.activeId) return x;
      const c = structuredClone(x); fn(c); return c;
    });
    // If the author renamed the guideline ID, keep it active.
    const active = guidelines.find((_, i) => s.guidelines[i].id === s.activeId);
    return { guidelines, activeId: active ? active.id : s.activeId };
  });

  const issues = useMemo(() => validate(g), [g]);
  const results = useMemo(() => runAllTests(g), [g]);
  const errors = issues.filter((i) => i.level === 'error').length;

  const newGuideline = () => {
    const b = blankGuideline();
    let id = b.id, n = 2;
    while (store.guidelines.some((x) => x.id === id)) id = b.id + '_' + n++;
    b.id = id;
    setStore((s) => ({ guidelines: [...s.guidelines, b], activeId: id })); setTab('setup'); toast('New guideline created');
  };
  const duplicate = () => {
    const c = structuredClone(g); let id = g.id + '_COPY', n = 2;
    while (store.guidelines.some((x) => x.id === id)) id = g.id + '_COPY' + n++;
    c.id = id; c.title += ' (copy)'; c.status = 'draft';
    setStore((s) => ({ guidelines: [...s.guidelines, c], activeId: id })); toast('Duplicated');
  };
  const remove = () => {
    if (!confirm(`Delete "${g.title}"? Export it first if you want a backup.`)) return;
    setStore((s) => {
      const rest = s.guidelines.filter((x) => x.id !== s.activeId);
      const list = rest.length ? rest : [blankGuideline()];
      return { guidelines: list, activeId: list[0].id };
    });
  };
  const importFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then((t) => {
      try {
        const o = JSON.parse(t);
        if (!o.findings || !o.rules || !o.outcomes) throw new Error('Not a guideline file');
        let id = o.id, n = 2;
        while (store.guidelines.some((x) => x.id === id)) id = o.id + '_' + n++;
        o.id = id;
        setStore((s) => ({ guidelines: [...s.guidelines, o], activeId: id })); toast('Guideline imported');
      } catch (err) { alert('Could not import: ' + err.message); }
    });
    e.target.value = '';
  };

  const resetDefaults = () => {
    if (!confirm(`Reset "${g.title}" to default seed definition? Any local unsaved edits will be refreshed from official seed definitions.`)) return;
    const fresh = resetGuidelineToSeed(g.id);
    if (fresh) {
      setStore((s) => ({
        ...s,
        guidelines: s.guidelines.map((x) => (x.id === g.id ? fresh : x)),
      }));
      toast(`Reset "${g.title}" to seed definitions`);
    } else {
      const allFresh = resetStore();
      setStore(allFresh);
      toast('Reset all guidelines to seed defaults');
    }
  };

  const shared = { g, edit, allGuidelines: store.guidelines, toast };
  const catalogDefaultType = ['functions', 'outcomes'].includes(tab) ? tab : 'findings';

  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand" data-tour="brand">
            <span className="brand-mark" aria-hidden="true">Rx</span>
            <div>Clinical Guideline Studio<small>Write guidelines as rules - CQL &amp; FHIR are generated</small></div>
          </div>
          <span className="spacer" />
          <select className="inline" data-tour="guideline-select" value={g.id} onChange={(e) => {
            const nextId = e.target.value;
            setStore((s) => ({ ...s, activeId: nextId }));
            const url = new URL(window.location);
            url.searchParams.set('guideline', nextId);
            window.history.replaceState({}, '', url);
          }} aria-label="Active guideline">
            {store.guidelines.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
          <span className={`pill ${g.status === 'approved' ? 'approved' : 'draft'}`}>{g.status}</span>
          <span className={`pill ${results.every((r) => r.passed) ? 'pass' : 'fail'}`}>{results.filter((r) => r.passed).length}/{results.length} tests</span>
          <button className="btn sm primary" onClick={newGuideline}>+ New</button>
          <button className="btn sm" onClick={duplicate}>Duplicate</button>
          <button className="btn sm" onClick={() => fileRef.current.click()}>Import</button>
          <button className="btn sm" title="Browse standardized clinical findings, score functions, and outcomes" onClick={() => setGlobalCatalogOpen(true)} data-tour="reusable-library">
            📚 Reusable Library
          </button>
          <button className="btn sm" title="Reset active guideline to original seed definition" onClick={resetDefaults}>↺ Reset to Seed</button>
          <button className="btn sm danger" onClick={remove}>Delete</button>
          <button
            className="btn sm tour-trigger-btn"
            title="Interactive Guided Tour — Explore features step-by-step (Replayable anytime)"
            onClick={() => startTour(0)}
            data-tour="tour-btn"
          >
            <Compass size={14} className="tour-trigger-icon" />
            <span>Guided Tour</span>
          </button>
          <a
            className="btn sm primary"
            href={`${CDSS_URL}?guideline=${encodeURIComponent(g.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Launch Point-of-Care Clinical Decision Support (CDSS) Workstation for this guideline"
          >
            🩺 Point-of-Care CDSS ↗
          </a>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
        </div>
        <nav className="tabs" data-tour="tabs-nav">
          {TABS.map(([k, label]) => (
            <button key={k} data-tour={`tab-${k}`} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {label}
              {k === 'setup' && issues.length > 0 && <span className={`n ${errors ? 'bad' : ''}`}>{issues.length}</span>}
            </button>
          ))}
        </nav>
      </header>

      {!hasSeenTourPrompt && !tourOpen && (
        <div className="tour-welcome-banner">
          <div className="tour-banner-content">
            <Sparkles size={16} className="tour-banner-sparkle" />
            <span>
              <b>New to Clinical Guideline Studio?</b> Take an interactive 2-minute tour to explore findings, score functions, decision rules, test cases, and CQL export.
            </span>
          </div>
          <div className="tour-banner-actions">
            <button className="btn sm primary" onClick={() => startTour(0)}>
              Start Tour
            </button>
            <button
              className="btn sm ghost"
              onClick={() => {
                try {
                  localStorage.setItem('clinical-tour-completed', 'true');
                } catch {
                  // ignore
                }
                setHasSeenTourPrompt(true);
              }}
              title="Dismiss banner (you can still replay the tour anytime from the Guided Tour button)"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main key={g.id}>
        {tab === 'setup' && <Setup {...shared} issues={issues} goto={setTab} />}
        {tab === 'findings' && <Findings {...shared} />}
        {tab === 'functions' && <Functions {...shared} />}
        {tab === 'outcomes' && <Outcomes {...shared} />}
        {tab === 'rules' && <Rules {...shared} />}
        {tab === 'tests' && <Tests {...shared} />}
        {tab === 'publish' && <Publish g={g} issues={issues} toast={toast} />}
      </main>

      <GuidedTour
        isOpen={tourOpen}
        initialStep={tourStep}
        onClose={closeTour}
        setTab={setTab}
        currentTab={tab}
      />

      {globalCatalogOpen && (
        <CatalogModal
          initialType={catalogDefaultType}
          g={g}
          allGuidelines={store.guidelines}
          edit={edit}
          toast={toast}
          onClose={() => setGlobalCatalogOpen(false)}
          onSelectImported={(itemType) => {
            setTab(itemType);
          }}
        />
      )}
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
