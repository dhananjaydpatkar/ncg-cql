import React, { useState } from 'react';
import { Lead, download } from './ui';
import { generateCql, generateMermaid } from '../lib/cql';
import { fhirLibrary, fhirPlanDefinition, fhirCodeSystems, fhirValueSets } from '../lib/fhir';
import { describeRule, outcomeById } from '../lib/model';

export function Publish({ g, issues, toast }) {
  const [view, setView] = useState('pathway');
  const cql = generateCql(g);
  const errors = issues.filter((i) => i.level === 'error').length;
  const J = (o) => JSON.stringify(o, null, 2);
  const act = (name, text, type) => { download(name, text, type); toast(`Downloaded ${name}`); };
  const fb = outcomeById(g, g.fallbackOutcomeId);

  return (
    <div className="page">
      <h2>Review &amp; export</h2>
      <Lead>Check the pathway as a picture, then export. The CQL and FHIR files are generated for you from this guideline - nobody needs to write them by hand.</Lead>
      {errors > 0 && <div className="issue error">{errors} problem(s) must be fixed before this guideline should be published. See the Details tab.</div>}

      <div className="card">
        <div className="card-head">
          <h3>Export &amp; Live Clinical Decision Support</h3>
          <span className="spacer" />
          <a
            className="btn sm primary"
            href={`https://production.d363iqgbc372rx.amplifyapp.com/?guideline=${encodeURIComponent(g.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this guideline in the Point-of-Care Clinical Decision Support Workstation"
          >
            🩺 Open in Point-of-Care CDSS ↗
          </a>
        </div>
        <div className="chips">
          <button className="btn primary" onClick={() => act(`${g.id}.guideline.json`, J(g))}>Guideline (JSON, shareable)</button>
          <button className="btn" onClick={() => act(`${g.id}.cql`, cql, 'text/plain')}>CQL library</button>
          <button className="btn" onClick={() => act(`Library-${g.id}.json`, J(fhirLibrary(g)))}>FHIR Library</button>
          <button className="btn" onClick={() => act(`PlanDefinition-${g.id}.json`, J(fhirPlanDefinition(g)))}>FHIR PlanDefinition</button>
          <button className="btn" onClick={() => act(`CodeSystems-${g.id}.json`, J(fhirCodeSystems(g)))}>FHIR CodeSystems</button>
          <button className="btn" onClick={() => act(`ValueSets-${g.id}.json`, J(fhirValueSets(g)))}>FHIR ValueSets</button>
          <button className="btn" onClick={() => act(`${g.id}.mmd`, generateMermaid(g), 'text/plain')}>Flowchart (Mermaid)</button>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <button className={`btn ${view === 'pathway' ? 'primary' : ''}`} onClick={() => setView('pathway')}>Pathway picture</button>
        <button className={`btn ${view === 'cql' ? 'primary' : ''}`} onClick={() => setView('cql')}>Generated CQL</button>
        {view === 'cql' && <button className="btn" onClick={() => { navigator.clipboard?.writeText(cql); toast('CQL copied'); }}>Copy</button>}
      </div>

      {view === 'cql' ? <pre className="code">{cql}</pre> : (
        <div className="card">
          <div className="ladder">
            <div className="ladder-q" style={{ background: '#1f2937', color: '#fff', borderColor: '#111', textAlign: 'center' }}>Patient data (checked against the safety gate)</div>
            {g.rules.map((r, i) => {
              const o = outcomeById(g, r.outcomeId);
              return (
                <React.Fragment key={r.id}>
                  <div className="ladder-down">▼ {i === 0 ? '' : 'otherwise'}</div>
                  <div className="ladder-step">
                    <div className="ladder-q"><b>{i + 1}. {r.label}</b><div className="hint">{describeRule(g, r)}</div></div>
                    <div className="ladder-arrow">yes →</div>
                    <div className={`ladder-out ${o?.kind || 'review'}`}><b>{o?.label || '(no outcome)'}</b><div className="hint">{o?.regimens.slice(0, 2).map((x) => x.name).join(' · ')}</div></div>
                  </div>
                </React.Fragment>
              );
            })}
            <div className="ladder-down">▼ otherwise</div>
            <div className={`ladder-out ${fb?.kind || 'review'}`}><b>{fb?.label}</b><div className="hint">Fallback</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
