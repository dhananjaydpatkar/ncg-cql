import React, { useState } from 'react';
import { Field, Lead } from './ui';
import { uniqueSlug } from '../lib/model';

export function Findings({ g, edit }) {
  const [sel, setSel] = useState(g.findings[0]?.id);
  const [newVal, setNewVal] = useState('');
  const f = g.findings.find((x) => x.id === sel) || g.findings[0];

  const add = () => {
    const id = uniqueSlug('new finding', g.findings.map((x) => x.id));
    edit((d) => { d.findings.push({ id, label: 'New finding', help: '', values: [{ code: 'yes', label: 'Yes' }, { code: 'no', label: 'No' }] }); });
    setSel(id);
  };
  const remove = (id) => {
    if (!confirm('Delete this finding? Conditions using it will be removed from rules.')) return;
    edit((d) => {
      d.findings = d.findings.filter((x) => x.id !== id);
      d.rules.forEach((r) => { r.conditions = r.conditions.filter((c) => c.findingId !== id); });
      d.testCases.forEach((t) => { delete t.inputs[id]; });
    });
    setSel(undefined);
  };
  const addValue = () => {
    if (!newVal.trim() || !f) return;
    edit((d) => {
      const ff = d.findings.find((x) => x.id === f.id);
      ff.values.push({ code: uniqueSlug(newVal, ff.values.map((v) => v.code)), label: newVal.trim() });
    });
    setNewVal('');
  };

  return (
    <div className="page">
      <h2>Findings</h2>
      <Lead>A finding is a clinical input the guideline looks at - for example <i>Ann Arbor stage</i> or <i>Bone marrow biopsy</i> - together with its allowed values. Rules are built from these.</Lead>
      <div className="split">
        <div>
          {g.findings.map((x) => (
            <div key={x.id} className={`list-item ${x.id === f?.id ? 'sel' : ''}`} onClick={() => setSel(x.id)}>
              <div className="grow"><b>{x.label}</b><div className="hint">{x.values.length} values</div></div>
            </div>
          ))}
          <button className="btn primary" onClick={add}>+ Add finding</button>
        </div>
        {f ? (
          <div className="card">
            <div className="card-head"><h3>Edit finding</h3><span className="spacer" /><button className="btn sm danger" onClick={() => remove(f.id)}>Delete</button></div>
            <Field label="Name"><input type="text" value={f.label} onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).label = e.target.value; })} /></Field>
            <Field label="Help text for clinicians" hint="Shown when entering test patients. E.g. which report this comes from.">
              <input type="text" value={f.help || ''} onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).help = e.target.value; })} />
            </Field>
            <div className="lbl" style={{ marginBottom: 6 }}>Possible values</div>
            {f.values.map((v, i) => (
              <div className="row" key={v.code} style={{ marginBottom: 6 }}>
                <input type="text" className="grow" value={v.label} onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).values[i].label = e.target.value; })} />
                <code className="hint">{v.code}</code>
                <button className="btn sm danger" disabled={f.values.length <= 1} onClick={() => edit((d) => {
                  const ff = d.findings.find((x) => x.id === f.id);
                  ff.values.splice(i, 1);
                  d.rules.forEach((r) => r.conditions.forEach((c) => { if (c.findingId === f.id) c.values = (c.values || []).filter((x) => x !== v.code); }));
                })}>Remove</button>
              </div>
            ))}
            <div className="row">
              <input type="text" className="grow" placeholder="Add a value, e.g. Stage V" value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addValue()} />
              <button className="btn" onClick={addValue}>Add value</button>
            </div>
            <div className="hint" style={{ marginTop: 10 }}>"Unknown / not recorded" is always available automatically - you do not need to add it as a value.</div>
          </div>
        ) : <div className="empty">No findings yet. Click <b>Add finding</b> to start.</div>}
      </div>
    </div>
  );
}
