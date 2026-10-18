import React, { useState } from 'react';
import { Lead, KindPill } from './ui';
import { PROVENANCE, uid } from '../lib/model';
import { evaluate, runAllTests } from '../lib/evaluate';

export function Tests({ g, edit }) {
  const [sel, setSel] = useState(g.testCases[0]?.id);
  const tc = g.testCases.find((t) => t.id === sel) || g.testCases[0];
  const results = runAllTests(g);
  const passed = results.filter((r) => r.passed).length;
  const res = tc ? evaluate(g, tc) : null;
  const upd = (fn) => edit((d) => fn(d.testCases.find((t) => t.id === tc.id)));

  const add = () => {
    const id = uid('t');
    edit((d) => { d.testCases.push({ id, name: 'New test patient', description: '', expectedOutcomeId: d.fallbackOutcomeId || d.outcomes[0]?.id, inputs: {} }); });
    setSel(id);
  };
  const dup = () => {
    const id = uid('t');
    edit((d) => { const c = structuredClone(d.testCases.find((t) => t.id === tc.id)); c.id = id; c.name += ' (copy)'; d.testCases.push(c); });
    setSel(id);
  };
  const firedIdx = res ? res.trace.findIndex((t) => t.matched) : -1;

  return (
    <div className="page">
      <h2>Test cases</h2>
      <Lead>Describe example patients and the outcome you expect. Every change you make to findings, rules or outcomes re-runs all tests instantly - so you can see the effect of a guideline change on real-looking patients before publishing.</Lead>
      <div className="split">
        <div>
          <div className="card" style={{ padding: 10 }}><b>{passed}/{results.length}</b> passing</div>
          {g.testCases.map((t) => {
            const r = results.find((x) => x.id === t.id);
            return (
              <div key={t.id} className={`list-item ${t.id === tc?.id ? 'sel' : ''}`} onClick={() => setSel(t.id)}>
                <span className={`dot ${r?.passed ? 'pass' : 'fail'}`} /><div className="grow"><b>{t.name}</b><div className="hint">→ {r?.res.outcome?.label}</div></div>
              </div>
            );
          })}
          <button className="btn primary" onClick={add}>+ Add test patient</button>
        </div>

        {tc ? (
          <div>
            <div className="card">
              <div className="card-head"><h3>Patient</h3><span className="spacer" /><button className="btn sm" onClick={dup}>Duplicate</button>
                <button className="btn sm danger" onClick={() => { edit((d) => { d.testCases = d.testCases.filter((t) => t.id !== tc.id); }); setSel(undefined); }}>Delete</button></div>
              <div className="field"><label>Name</label><input type="text" value={tc.name} onChange={(e) => upd((x) => { x.name = e.target.value; })} /></div>
              <div className="field"><label>Description</label><input type="text" value={tc.description} onChange={(e) => upd((x) => { x.description = e.target.value; })} /></div>
              {g.findings.map((f) => {
                const inp = tc.inputs[f.id] || { value: '', provenance: 'source-coded' };
                return (
                  <div className="row top" key={f.id} style={{ marginBottom: 8 }}>
                    <div style={{ width: 200 }}><b>{f.label}</b>{f.help && <div className="hint">{f.help}</div>}</div>
                    <select className="grow" value={inp.value} onChange={(e) => upd((x) => { x.inputs[f.id] = { provenance: inp.provenance, value: e.target.value }; })}>
                      <option value="">— not recorded —</option>
                      {f.values.map((v) => <option key={v.code} value={v.code}>{v.label}</option>)}
                    </select>
                    <select style={{ width: 230 }} value={inp.provenance} onChange={(e) => upd((x) => { x.inputs[f.id] = { value: inp.value, provenance: e.target.value }; })}>
                      {PROVENANCE.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                    </select>
                  </div>
                );
              })}
              <div className="row" style={{ marginTop: 10 }}>
                <span className="lbl">Expected outcome</span>
                <select className="inline" value={tc.expectedOutcomeId} onChange={(e) => upd((x) => { x.expectedOutcomeId = e.target.value; })}>
                  {g.outcomes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                {res && res.outcomeId !== tc.expectedOutcomeId && <button className="btn sm" onClick={() => upd((x) => { x.expectedOutcomeId = res.outcomeId; })}>Accept actual result</button>}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Result</h3>{res.outcomeId === tc.expectedOutcomeId ? <span className="pill pass">Passes</span> : <span className="pill fail">Does not match expected</span>}</div>
              <div className="row" style={{ marginBottom: 8 }}><b style={{ fontSize: 16 }}>{res.outcome?.label}</b>{res.outcome && <KindPill kind={res.outcome.kind} />}</div>
              {res.outcome?.rationale && <div className="hint" style={{ marginBottom: 8 }}>{res.outcome.rationale}</div>}
              {res.outcome?.regimens.map((r) => <div key={r.id} className="regimen"><span>•</span><span>{r.name}</span><span className="hint">{r.category}</span></div>)}
              {res.warnings.map((w, i) => <div key={i} className="issue warn" style={{ marginTop: 8 }}>{w}</div>)}
              <div className="lbl" style={{ margin: '14px 0 6px' }}>Why - rules checked in order</div>
              {res.trace.map((t, i) => (
                <div key={t.ruleId} className={`trace ${t.matched ? 'hit' : ''}`}>
                  <b>{i + 1}. {t.label}</b> {t.matched && <span className="pill pass" style={{ marginLeft: 6 }}>matched - decides outcome</span>}
                  {t.conds.map((c, ci) => <div key={ci} className="hint"><span className={c.pass ? 'tick' : 'cross'}>{c.pass ? '✓' : '✗'}</span> {c.text}</div>)}
                </div>
              ))}
              {firedIdx === -1 && <div className="hint">No rule matched; the fallback outcome was used.</div>}
            </div>
          </div>
        ) : <div className="empty">No test cases yet.</div>}
      </div>
    </div>
  );
}
