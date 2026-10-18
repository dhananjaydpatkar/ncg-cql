import React, { useState } from 'react';
import { Field, Lead, KindPill } from './ui';
import { OUTCOME_KINDS, uid, uniqueSlug } from '../lib/model';

export function Outcomes({ g, edit }) {
  const [sel, setSel] = useState(g.outcomes[0]?.id);
  const [reg, setReg] = useState('');
  const [cat, setCat] = useState('');
  const o = g.outcomes.find((x) => x.id === sel) || g.outcomes[0];

  const add = () => {
    const id = uniqueSlug('new outcome', g.outcomes.map((x) => x.id));
    edit((d) => { d.outcomes.push({ id, label: 'New outcome', kind: 'treatment', rationale: '', regimens: [] }); });
    setSel(id);
  };
  const remove = (id) => {
    if (id === g.fallbackOutcomeId) { alert('This outcome is the fallback. Choose a different fallback in Rules first.'); return; }
    if (!confirm('Delete this outcome? Rules pointing to it will need a new outcome.')) return;
    edit((d) => {
      d.outcomes = d.outcomes.filter((x) => x.id !== id);
      d.rules.forEach((r) => { if (r.outcomeId === id) r.outcomeId = ''; });
    });
    setSel(undefined);
  };
  const upd = (fn) => edit((d) => fn(d.outcomes.find((x) => x.id === o.id)));

  return (
    <div className="page">
      <h2>Outcomes</h2>
      <Lead>An outcome is a treatment group the guideline can assign - with the regimens to suggest and the clinical reasoning. Include one <b>Needs review</b> outcome for patients whose data is missing or unreliable.</Lead>
      <div className="split">
        <div>
          {g.outcomes.map((x) => (
            <div key={x.id} className={`list-item ${x.id === o?.id ? 'sel' : ''}`} onClick={() => setSel(x.id)}>
              <div className="grow"><b>{x.label}</b><div className="hint">{x.regimens.length} regimens</div></div><KindPill kind={x.kind} />
            </div>
          ))}
          <button className="btn primary" onClick={add}>+ Add outcome</button>
        </div>
        {o ? (
          <div className="card">
            <div className="card-head"><h3>Edit outcome</h3><span className="spacer" /><button className="btn sm danger" onClick={() => remove(o.id)}>Delete</button></div>
            <Field label="Name"><input type="text" value={o.label} onChange={(e) => upd((x) => { x.label = e.target.value; })} /></Field>
            <Field label="Type">
              <select value={o.kind} onChange={(e) => upd((x) => { x.kind = e.target.value; })}>{OUTCOME_KINDS.map((k) => <option key={k.code} value={k.code}>{k.label}</option>)}</select>
            </Field>
            <Field label="Clinical rationale" hint="Shown to the clinician together with the recommendation."><textarea value={o.rationale} onChange={(e) => upd((x) => { x.rationale = e.target.value; })} /></Field>
            <div className="lbl" style={{ marginBottom: 6 }}>Regimens / options</div>
            {o.regimens.length === 0 && <div className="hint" style={{ marginBottom: 8 }}>{o.kind === 'review' ? 'A review outcome intentionally lists no regimens.' : 'No regimens yet.'}</div>}
            {o.regimens.map((r, i) => (
              <div className="regimen" key={r.id}>
                <input type="text" className="grow" value={r.name} onChange={(e) => upd((x) => { x.regimens[i].name = e.target.value; })} />
                <input type="text" style={{ width: 190 }} value={r.category || ''} placeholder="Category" onChange={(e) => upd((x) => { x.regimens[i].category = e.target.value; })} />
                <button className="btn sm ghost" disabled={i === 0} onClick={() => upd((x) => { x.regimens.splice(i - 1, 0, x.regimens.splice(i, 1)[0]); })}>↑</button>
                <button className="btn sm danger" onClick={() => upd((x) => { x.regimens.splice(i, 1); })}>Remove</button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <input type="text" className="grow" placeholder="Add regimen, e.g. Obinutuzumab + bendamustine" value={reg} onChange={(e) => setReg(e.target.value)} />
              <input type="text" style={{ width: 190 }} placeholder="Category (optional)" value={cat} onChange={(e) => setCat(e.target.value)} />
              <button className="btn" onClick={() => { if (!reg.trim()) return; upd((x) => { x.regimens.push({ id: uid('r'), name: reg.trim(), category: cat.trim() }); }); setReg(''); setCat(''); }}>Add</button>
            </div>
          </div>
        ) : <div className="empty">No outcomes.</div>}
      </div>
    </div>
  );
}
