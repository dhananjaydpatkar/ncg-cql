import React from 'react';
import { Field, Lead } from './ui';

export function Setup({ g, edit, issues, goto }) {
  return (
    <div className="page">
      <h2>Guideline details</h2>
      <Lead>Start here: name the guideline and record where it comes from. Then define the clinical inputs (Findings), the possible results (Outcomes), and the decision logic (Rules).</Lead>
      <div className="grid2">
        <div className="card">
          <Field label="Title"><input type="text" value={g.title} onChange={(e) => edit((d) => { d.title = e.target.value; })} /></Field>
          <Field label="Guideline ID" hint="Short technical name, no spaces (used in CQL and FHIR).">
            <input type="text" value={g.id} onChange={(e) => edit((d) => { d.id = e.target.value.replace(/[^A-Za-z0-9_]/g, '_'); })} />
          </Field>
          <div className="grid2">
            <Field label="Version"><input type="text" value={g.version} onChange={(e) => edit((d) => { d.version = e.target.value; })} /></Field>
            <Field label="Status">
              <select value={g.status} onChange={(e) => edit((d) => { d.status = e.target.value; })}>
                <option value="draft">Draft</option><option value="in-review">In review</option><option value="approved">Approved</option>
              </select>
            </Field>
          </div>
          <Field label="Author / panel"><input type="text" value={g.author} onChange={(e) => edit((d) => { d.author = e.target.value; })} /></Field>
        </div>
        <div className="card">
          <Field label="Organisation"><input type="text" value={g.organization} onChange={(e) => edit((d) => { d.organization = e.target.value; })} /></Field>
          <Field label="Source document"><input type="text" value={g.source} placeholder="e.g. NCG Adult Hematolymphoid Guidelines 2020, p. 14" onChange={(e) => edit((d) => { d.source = e.target.value; })} /></Field>
          <Field label="Plain-language description"><textarea value={g.description} onChange={(e) => edit((d) => { d.description = e.target.value; })} /></Field>
          <label className="row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={g.enforceProvenance} onChange={(e) => edit((d) => { d.enforceProvenance = e.target.checked; })} />
            <span><b>Safety gate:</b> ignore values that came from unparsed / missing sources</span>
          </label>
          <div className="hint" style={{ marginTop: 4 }}>Keep this on. Free-text referral data will then never drive a treatment - the patient goes to review instead.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Checks</h3><span className="hint">{issues.length ? `${issues.length} item(s) to look at` : 'All checks passed'}</span></div>
        {issues.length === 0 && <div className="issue info">Everything looks consistent. Review the tests and export from the last tab.</div>}
        {issues.map((it, i) => (
          <div key={i} className={`issue ${it.level}`}>
            <b>{{ error: 'Fix', warn: 'Check', info: 'Tip' }[it.level]}</b><span>{it.text}</span>
            <button className="btn sm" onClick={() => goto(it.tab)}>Go</button>
          </div>
        ))}
      </div>
    </div>
  );
}
