import React from 'react';
import { Lead } from './ui';
import { OPS, SCORE_OPS, uid, describeRule, outcomeById, functionById, findingById } from '../lib/model';

export function Rules({ g, edit }) {
  const addRule = () => {
    if (!g.findings.length && !(g.functions || []).length) {
      alert('Add findings or functions first.');
      return;
    }
    edit((d) => {
      const cond = d.findings.length
        ? { findingId: d.findings[0].id, op: 'is', values: [] }
        : { functionId: d.functions[0].id, op: 'band_is', values: [] };
      d.rules.push({
        id: uid('rule'),
        label: 'New rule',
        conditions: [cond],
        outcomeId: d.outcomes[0]?.id || '',
      });
    });
  };

  const move = (i, dir) => edit((d) => {
    const [r] = d.rules.splice(i, 1);
    d.rules.splice(i + dir, 0, r);
  });

  return (
    <div className="page">
      <h2>Rules</h2>
      <Lead>
        Rules are checked <b>from top to bottom</b>; the first rule whose conditions all hold decides the outcome.
        You can branch on <b>clinical findings</b> as well as <b>embedded score functions</b> (e.g. aaIPI, FLIPI, CLL-IPI risk groups or thresholds).
      </Lead>

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
            <div className="sentence">
              <b>IF</b> {describeRule(g, r)} <b>THEN</b> {o ? o.label : <i>(choose an outcome)</i>}
            </div>

            {r.conditions.map((c, ci) => {
              const isFn = !!c.functionId;
              const f = !isFn ? findingById(g, c.findingId) : null;
              const fn = isFn ? functionById(g, c.functionId) : null;
              const currentSelectVal = isFn ? `fn:${c.functionId}` : `finding:${c.findingId}`;

              return (
                <div className="cond" key={ci}>
                  {/* Entity selector: Finding vs Score Function */}
                  <select
                    value={currentSelectVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('fn:')) {
                        const targetId = val.slice(3);
                        updR((x) => {
                          delete x.conditions[ci].findingId;
                          x.conditions[ci].functionId = targetId;
                          x.conditions[ci].op = 'band_is';
                          x.conditions[ci].values = [];
                          delete x.conditions[ci].threshold;
                        });
                      } else {
                        const targetId = val.slice(8);
                        updR((x) => {
                          delete x.conditions[ci].functionId;
                          x.conditions[ci].findingId = targetId;
                          x.conditions[ci].op = 'is';
                          x.conditions[ci].values = [];
                          delete x.conditions[ci].threshold;
                        });
                      }
                    }}
                  >
                    <optgroup label="Clinical Findings">
                      {g.findings.map((ff) => (
                        <option key={ff.id} value={`finding:${ff.id}`}>Finding: {ff.label}</option>
                      ))}
                    </optgroup>
                    {(g.functions || []).length > 0 && (
                      <optgroup label="Score Functions">
                        {g.functions.map((fnItem) => (
                          <option key={fnItem.id} value={`fn:${fnItem.id}`}>Score: {fnItem.label}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* Operator selector */}
                  {isFn ? (
                    <select
                      value={c.op}
                      onChange={(e) => updR((x) => {
                        x.conditions[ci].op = e.target.value;
                        if (e.target.value === 'score_gte' || e.target.value === 'score_lte') {
                          x.conditions[ci].threshold = x.conditions[ci].threshold ?? 2;
                        }
                      })}
                    >
                      {SCORE_OPS.map((op) => (
                        <option key={op.code} value={op.code}>{op.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={c.op}
                      onChange={(e) => updR((x) => { x.conditions[ci].op = e.target.value; })}
                    >
                      {OPS.map((op) => (
                        <option key={op.code} value={op.code}>{op.label}</option>
                      ))}
                    </select>
                  )}

                  {/* Value / Threshold selector */}
                  {isFn ? (
                    c.op === 'score_unknown' ? (
                      <span className="hint">true when score cannot be computed (missing / unverified inputs or out of cohort)</span>
                    ) : c.op === 'score_gte' || c.op === 'score_lte' ? (
                      <div className="row">
                        <span className="hint">score:</span>
                        <input
                          type="number"
                          style={{ width: 80, padding: '4px 8px' }}
                          value={c.threshold ?? 2}
                          onChange={(e) => updR((x) => {
                            x.conditions[ci].threshold = Number(e.target.value);
                          })}
                        />
                        <span className="hint">pts</span>
                      </div>
                    ) : (
                      <div className="chips">
                        {(fn?.bands || []).map((b) => {
                          const on = (c.values || []).includes(b.code);
                          return (
                            <span
                              key={b.code}
                              className={`chip ${on ? 'on' : ''}`}
                              onClick={() => updR((x) => {
                                const vals = x.conditions[ci].values || [];
                                x.conditions[ci].values = on ? vals.filter((y) => y !== b.code) : [...vals, b.code];
                              })}
                            >
                              {on ? '✓ ' : ''}{b.label}
                            </span>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    c.op === 'unknown' ? (
                      <span className="hint">true when the value is missing, not recorded, or from an unreliable source</span>
                    ) : (
                      <div className="chips">
                        {f?.values.map((v) => {
                          const on = (c.values || []).includes(v.code);
                          return (
                            <span
                              key={v.code}
                              className={`chip ${on ? 'on' : ''}`}
                              onClick={() => updR((x) => {
                                const vals = x.conditions[ci].values || [];
                                x.conditions[ci].values = on ? vals.filter((y) => y !== v.code) : [...vals, v.code];
                              })}
                            >
                              {on ? '✓ ' : ''}{v.label}
                            </span>
                          );
                        })}
                      </div>
                    )
                  )}

                  <button
                    className="btn sm ghost"
                    title="Remove condition"
                    onClick={() => updR((x) => { x.conditions.splice(ci, 1); })}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <button
                className="btn sm"
                onClick={() => updR((x) => {
                  x.conditions.push({ findingId: g.findings[0]?.id, op: 'is', values: [] });
                })}
              >
                + AND Finding
              </button>
              {(g.functions || []).length > 0 && (
                <button
                  className="btn sm"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent-ink)' }}
                  onClick={() => updR((x) => {
                    x.conditions.push({ functionId: g.functions[0]?.id, op: 'band_is', values: [] });
                  })}
                >
                  + AND Score Function
                </button>
              )}
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
          <div className="grow">
            <b>Fallback</b>
            <div className="hint">If no rule matches, assign this outcome. It should normally be "Needs review".</div>
          </div>
          <select className="inline" value={g.fallbackOutcomeId} onChange={(e) => edit((d) => { d.fallbackOutcomeId = e.target.value; })}>
            {g.outcomes.map((oo) => <option key={oo.id} value={oo.id}>{oo.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
