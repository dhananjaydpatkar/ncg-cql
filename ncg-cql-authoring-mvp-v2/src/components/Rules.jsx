import React from 'react';
import { Lead } from './ui';
import { OPS, uid, describeRule, outcomeById } from '../lib/model';

export function Rules({ g, edit }) {
  const addRule = () => {
    if (!g.findings.length) { alert('Add findings first.'); return; }
    edit((d) => {
      d.rules.push({ id: uid('rule'), label: 'New rule', conditions: [{ findingId: d.findings[0].id, op: 'is', values: [] }], outcomeId: d.outcomes[0]?.id || '' });
    });
  };
  const move = (i, dir) => edit((d) => { const [r] = d.rules.splice(i, 1); d.rules.splice(i + dir, 0, r); });

  return (
    <div className="page">
      <h2>Rules</h2>
      <Lead>Rules are checked <b>from top to bottom</b>; the first rule whose conditions all hold decides the outcome. Put the safety rules ("... is unknown → Needs review") first, then the specific cases, then the general ones.</Lead>

      {g.rules.length === 0 && <div className="empty">No rules yet.</div>}
      {g.rules.map((r, i) => {
        const o = outcomeById(g, r.outcomeId);
        const updR = (fn) => edit((d) => fn(d.rules[i]));
        return (
          <div key={r.id} className={`card rule ${o?.kind || ''}`}>
            <div className="row">
              <div className="rule-no">{i + 1}</div>
              <input type="text" className="grow" value={r.label} onChange={(e) => updR((x) => { x.label = e.target.value; })} />
              <button className="btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button className="btn sm ghost" disabled={i === g.rules.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button className="btn sm danger" onClick={() => edit((d) => { d.rules.splice(i, 1); })}>Delete</button>
            </div>
            <div className="sentence"><b>IF</b> {describeRule(g, r)} <b>THEN</b> {o ? o.label : <i>(choose an outcome)</i>}</div>

            {r.conditions.map((c, ci) => {
              const f = g.findings.find((x) => x.id === c.findingId);
              return (
                <div className="cond" key={ci}>
                  <select value={c.findingId} onChange={(e) => updR((x) => { x.conditions[ci].findingId = e.target.value; x.conditions[ci].values = []; })}>
                    {!f && <option value={c.findingId}>(missing)</option>}
                    {g.findings.map((ff) => <option key={ff.id} value={ff.id}>{ff.label}</option>)}
                  </select>
                  <select value={c.op} onChange={(e) => updR((x) => { x.conditions[ci].op = e.target.value; })}>
                    {OPS.map((op) => <option key={op.code} value={op.code}>{op.label}</option>)}
                  </select>
                  {c.op === 'unknown' ? <span className="hint">true when the value is missing, not recorded, or from an unreliable source</span> : (
                    <div className="chips">
                      {f?.values.map((v) => {
                        const on = (c.values || []).includes(v.code);
                        return <span key={v.code} className={`chip ${on ? 'on' : ''}`} onClick={() => updR((x) => {
                          const vals = x.conditions[ci].values || [];
                          x.conditions[ci].values = on ? vals.filter((y) => y !== v.code) : [...vals, v.code];
                        })}>{on ? '✓ ' : ''}{v.label}</span>;
                      })}
                    </div>
                  )}
                  <button className="btn sm ghost" title="Remove condition" onClick={() => updR((x) => { x.conditions.splice(ci, 1); })}>✕</button>
                </div>
              );
            })}
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn sm" onClick={() => updR((x) => { x.conditions.push({ findingId: g.findings[0]?.id, op: 'is', values: [] }); })}>+ AND condition</button>
              <span className="spacer" />
              <span className="lbl">Then assign</span>
              <select className="inline" value={r.outcomeId} onChange={(e) => updR((x) => { x.outcomeId = e.target.value; })}>
                <option value="">(choose outcome)</option>
                {g.outcomes.map((oo) => <option key={oo.id} value={oo.id}>{oo.label}</option>)}
              </select>
            </div>
          </div>
        );
      })}
      <button className="btn primary" onClick={addRule}>+ Add rule</button>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="row">
          <div className="grow"><b>Fallback</b><div className="hint">If no rule matches, assign this outcome. It should normally be "Needs review".</div></div>
          <select className="inline" value={g.fallbackOutcomeId} onChange={(e) => edit((d) => { d.fallbackOutcomeId = e.target.value; })}>
            {g.outcomes.map((oo) => <option key={oo.id} value={oo.id}>{oo.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
