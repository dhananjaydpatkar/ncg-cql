import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadStore, saveStore } from './lib/store';
import { blankGuideline } from './lib/model';
import { validate } from './lib/validate';
import { runAllTests } from './lib/evaluate';
import { Setup } from './components/Setup';
import { Findings } from './components/Findings';
import { Outcomes } from './components/Outcomes';
import { Rules } from './components/Rules';
import { Tests } from './components/Tests';
import { Publish } from './components/Publish';

const TABS = [
  ['setup', '1 · Details'], ['findings', '2 · Findings'], ['outcomes', '3 · Outcomes'],
  ['rules', '4 · Rules'], ['tests', '5 · Test cases'], ['publish', '6 · Review & export'],
];

export default function App() {
  const [store, setStore] = useState(loadStore);
  const [tab, setTabState] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('tab');
    return ['setup', 'findings', 'outcomes', 'rules', 'tests', 'publish'].includes(p) ? p : 'setup';
  });
  const setTab = (t) => {
    setTabState(t);
    const url = new URL(window.location);
    url.searchParams.set('tab', t);
    window.history.replaceState({}, '', url);
  };
  const [msg, setMsg] = useState(null);
  const fileRef = useRef();

  useEffect(() => saveStore(store), [store]);
  const g = store.guidelines.find((x) => x.id === store.activeId) || store.guidelines[0];

  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2200); };
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

  const shared = { g, edit };
  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand"><div className="brand-mark">N</div><div>NCG Guideline Studio<small>Write guidelines as rules - CQL &amp; FHIR are generated</small></div></div>
          <span className="spacer" />
          <select className="inline" value={g.id} onChange={(e) => setStore((s) => ({ ...s, activeId: e.target.value }))} aria-label="Active guideline">
            {store.guidelines.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
          <span className={`pill ${g.status === 'approved' ? 'approved' : 'draft'}`}>{g.status}</span>
          <span className={`pill ${results.every((r) => r.passed) ? 'pass' : 'fail'}`}>{results.filter((r) => r.passed).length}/{results.length} tests</span>
          <button className="btn sm primary" onClick={newGuideline}>+ New</button>
          <button className="btn sm" onClick={duplicate}>Duplicate</button>
          <button className="btn sm" onClick={() => fileRef.current.click()}>Import</button>
          <button className="btn sm danger" onClick={remove}>Delete</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
        </div>
        <nav className="tabs">
          {TABS.map(([k, label]) => (
            <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {label}
              {k === 'setup' && issues.length > 0 && <span className={`n ${errors ? 'bad' : ''}`}>{issues.length}</span>}
            </button>
          ))}
        </nav>
      </header>
      <main key={g.id}>
        {tab === 'setup' && <Setup {...shared} issues={issues} goto={setTab} />}
        {tab === 'findings' && <Findings {...shared} />}
        {tab === 'outcomes' && <Outcomes {...shared} />}
        {tab === 'rules' && <Rules {...shared} />}
        {tab === 'tests' && <Tests {...shared} />}
        {tab === 'publish' && <Publish g={g} issues={issues} toast={toast} />}
      </main>
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
