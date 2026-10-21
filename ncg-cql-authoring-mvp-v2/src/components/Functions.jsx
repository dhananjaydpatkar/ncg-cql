import React, { useState, useMemo } from 'react';
import { Field, Lead } from './ui';
import { blankFunction, cqlIdent, scoreRange, OPS } from '../lib/model';
import { saveItemToCustomCatalog } from '../lib/catalog';
import { CatalogModal } from './CatalogModal';

export function Functions({ g, edit, allGuidelines = [], toast = () => {} }) {
  const fns = g.functions || [];
  const [sel, setSel] = useState(fns[0]?.id);
  const [search, setSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Filter functions in current guideline
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fns;
    return fns.filter((x) =>
      x.label.toLowerCase().includes(q) ||
      x.name.toLowerCase().includes(q) ||
      x.id.toLowerCase().includes(q) ||
      (x.description && x.description.toLowerCase().includes(q)) ||
      (x.category && x.category.toLowerCase().includes(q))
    );
  }, [fns, search]);

  const fn = fns.find((x) => x.id === sel) || filtered[0] || fns[0];

  const add = () => {
    const fresh = blankFunction(fns.map((x) => x.id));
    // Pre-populate with first finding if available
    if (g.findings.length) {
      const f0 = g.findings[0];
      const pts = {};
      f0.values.forEach((v, idx) => { pts[v.code] = idx; });
      fresh.factors.push({ findingId: f0.id, points: pts });
    }
    edit((d) => {
      d.functions = d.functions || [];
      d.functions.push(fresh);
    });
    setSel(fresh.id);
  };

  const remove = (id) => {
    if (!confirm('Delete this score function? Any rules or conditions embedding it will need review.')) return;
    edit((d) => {
      d.functions = (d.functions || []).filter((x) => x.id !== id);
      // Clean up rule conditions referencing this function
      (d.rules || []).forEach((r) => {
        r.conditions = r.conditions.filter((c) => c.functionId !== id);
      });
    });
    setSel(undefined);
  };

  const upd = (mutator) => edit((d) => {
    d.functions = d.functions || [];
    const target = d.functions.find((x) => x.id === fn.id);
    if (target) mutator(target);
  });

  const handleSaveToCatalog = () => {
    if (!fn) return;
    saveItemToCustomCatalog('functions', fn);
    toast(`"${fn.label}" saved to reusable clinical library`);
  };

  const range = fn ? scoreRange(fn) : { min: 0, max: 0 };
  const usedFindingIds = new Set((fn?.factors || []).map((x) => x.findingId));
  const availableFindings = (g.findings || []).filter((f) => !usedFindingIds.has(f.id));

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>Clinical Score Functions</h2>
          <Lead>
            Define points-based prognostic scores (e.g. <b>aaIPI</b>, <b>FLIPI</b>, <b>CLL-IPI</b>).
            Each function compiles into standard CQL calculation and classification functions (with data-provenance gates),
            and can be <b>embedded directly into your clinical rules</b>.
          </Lead>
        </div>
        <button className="btn primary" onClick={() => setCatalogOpen(true)}>
          📚 Browse Reusable Library
        </button>
      </div>

      <div className="split">
        <div>
          {/* Instant Search Bar */}
          <div className="list-search">
            <span className="icon">🔍</span>
            <input
              type="text"
              placeholder={`Search ${fns.length} functions...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty" style={{ padding: '16px', marginBottom: 10 }}>
              No score functions matched "{search}".
            </div>
          ) : (
            filtered.map((x) => (
              <div key={x.id} className={`list-item ${x.id === fn?.id ? 'sel' : ''}`} onClick={() => setSel(x.id)}>
                <div className="grow">
                  <b>{x.label}</b>
                  <div className="hint">
                    <code style={{ fontSize: 11 }}>{x.name}</code> · {(x.factors || []).length} factors · {(x.bands || []).length} bands
                    {x.category && <span className="meta-tag" style={{ marginLeft: 6 }}>{x.category}</span>}
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <button className="btn primary grow" onClick={add}>+ Add score function</button>
            <button className="btn" title="Browse library" onClick={() => setCatalogOpen(true)}>📚 Library</button>
          </div>
        </div>

        {fn ? (
          <div>
            <div className="card">
              <div className="card-head">
                <h3>{fn.label || 'Edit Function'}</h3>
                <span className="spacer" />
                <span className="pill pass" style={{ fontSize: 11 }}>Achievable score: {range.min} to {range.max} pts</span>
                <button className="btn sm" onClick={handleSaveToCatalog} title="Save to reusable library">
                  ⭐ Save to Library
                </button>
                <button className="btn sm danger" onClick={() => remove(fn.id)}>Delete</button>
              </div>

              <div className="grid2">
                <Field label="Human-readable Label" hint="e.g. Age-adjusted IPI (aaIPI)">
                  <input type="text" value={fn.label} onChange={(e) => upd((x) => { x.label = e.target.value; })} />
                </Field>
                <Field label="CQL Identifier Name" hint="Used in CQL function signatures (e.g. aaIPI, FLIPI)">
                  <input
                    type="text"
                    value={fn.name}
                    onChange={(e) => upd((x) => { x.name = cqlIdent(e.target.value); })}
                  />
                </Field>
              </div>

              <div className="grid2">
                <Field label="Disease Category / Tag" hint="e.g. DLBCL, Follicular, CLL, Staging">
                  <input
                    type="text"
                    value={fn.category || ''}
                    placeholder="e.g. DLBCL & Aggressive Lymphoma"
                    onChange={(e) => upd((x) => { x.category = e.target.value; })}
                  />
                </Field>
                <Field label="Clinical Description / Citations" hint="Prognostic meaning, publication, and target population.">
                  <input
                    type="text"
                    value={fn.description || ''}
                    onChange={(e) => upd((x) => { x.description = e.target.value; })}
                  />
                </Field>
              </div>

              {/* Applicability Filter (Applies When) */}
              <div style={{ marginTop: 14 }}>
                <div className="card-head">
                  <b className="lbl">Applies When (Optional Population Filter)</b>
                  <span className="spacer" />
                  <button
                    className="btn sm"
                    onClick={() => upd((x) => {
                      x.appliesWhen = x.appliesWhen || [];
                      x.appliesWhen.push({ findingId: g.findings[0]?.id || '', op: 'is', values: [] });
                    })}
                  >
                    + Add Filter
                  </button>
                </div>
                {!(fn.appliesWhen || []).length ? (
                  <div className="hint" style={{ marginBottom: 12 }}>
                    Applies universally to any patient who has the factor findings recorded.
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    {fn.appliesWhen.map((c, ci) => {
                      const f = g.findings.find((x) => x.id === c.findingId);
                      return (
                        <div className="cond" key={ci} style={{ marginBottom: 6 }}>
                          <select
                            value={c.findingId}
                            onChange={(e) => upd((x) => {
                              x.appliesWhen[ci].findingId = e.target.value;
                              x.appliesWhen[ci].values = [];
                            })}
                          >
                            {g.findings.map((ff) => <option key={ff.id} value={ff.id}>{ff.label}</option>)}
                          </select>
                          <select
                            value={c.op}
                            onChange={(e) => upd((x) => { x.appliesWhen[ci].op = e.target.value; })}
                          >
                            {OPS.map((op) => <option key={op.code} value={op.code}>{op.label}</option>)}
                          </select>
                          <div className="chips">
                            {f?.values.map((v) => {
                              const on = (c.values || []).includes(v.code);
                              return (
                                <span
                                  key={v.code}
                                  className={`chip ${on ? 'on' : ''}`}
                                  onClick={() => upd((x) => {
                                    const vals = x.appliesWhen[ci].values || [];
                                    x.appliesWhen[ci].values = on ? vals.filter((y) => y !== v.code) : [...vals, v.code];
                                  })}
                                >
                                  {on ? '✓ ' : ''}{v.label}
                                </span>
                              );
                            })}
                          </div>
                          <button
                            className="btn sm ghost"
                            title="Remove filter"
                            onClick={() => upd((x) => { x.appliesWhen.splice(ci, 1); })}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Scoring Factors */}
            <div className="card">
              <div className="card-head">
                <h3>Scoring Factors (Inputs &amp; Points)</h3>
                <span className="spacer" />
                {availableFindings.length > 0 && (
                  <select
                    className="inline"
                    value=""
                    onChange={(e) => {
                      const fid = e.target.value;
                      if (!fid) return;
                      const f = g.findings.find((x) => x.id === fid);
                      const pts = {};
                      f.values.forEach((v, idx) => { pts[v.code] = idx === 0 ? 0 : 1; });
                      upd((x) => { x.factors.push({ findingId: fid, points: pts }); });
                    }}
                  >
                    <option value="">+ Add finding factor...</option>
                    {availableFindings.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                )}
              </div>

              {!(fn.factors || []).length ? (
                <div className="empty" style={{ padding: 16 }}>No scoring factors added. Pick a finding above to assign points.</div>
              ) : (
                fn.factors.map((fa, fai) => {
                  const f = g.findings.find((x) => x.id === fa.findingId);
                  return (
                    <div key={fa.findingId || fai} style={{ background: 'var(--sunk)', padding: 12, borderRadius: 6, marginBottom: 10 }}>
                      <div className="row" style={{ marginBottom: 8 }}>
                        <b>{f ? f.label : '(unknown finding)'}</b>
                        <code className="hint">{fa.findingId}</code>
                        <span className="spacer" />
                        <button
                          className="btn sm danger"
                          onClick={() => upd((x) => { x.factors.splice(fai, 1); })}
                        >
                          Remove factor
                        </button>
                      </div>
                      <div className="grid2">
                        {f?.values.map((v) => {
                          const pts = fa.points?.[v.code] ?? 0;
                          return (
                            <div key={v.code} className="row" style={{ background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--line)' }}>
                              <span className="grow" style={{ fontSize: 13 }}>{v.label}</span>
                              <span className="hint" style={{ fontSize: 11 }}>pts:</span>
                              <input
                                type="number"
                                style={{ width: 65, padding: '3px 6px', textAlign: 'right' }}
                                value={pts}
                                onChange={(e) => upd((x) => {
                                  x.factors[fai].points = x.factors[fai].points || {};
                                  x.factors[fai].points[v.code] = Number(e.target.value);
                                })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Risk Groups / Bands */}
            <div className="card">
              <div className="card-head">
                <h3>Risk Groups / Score Bands</h3>
                <span className="spacer" />
                <button
                  className="btn sm"
                  onClick={() => upd((x) => {
                    const maxCurrent = Math.max(0, ...(x.bands || []).map((b) => Number(b.max)));
                    x.bands.push({
                      code: `group-${x.bands.length + 1}`,
                      label: 'New Risk Group',
                      min: maxCurrent + 1,
                      max: maxCurrent + 2,
                      note: '',
                    });
                  })}
                >
                  + Add Risk Group
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(fn.bands || []).map((b, bi) => (
                  <div key={bi} className="row" style={{ background: 'var(--sunk)', padding: '8px 10px', borderRadius: 6 }}>
                    <div style={{ width: 130 }}>
                      <span className="hint" style={{ fontSize: 10 }}>CODE</span>
                      <input
                        type="text"
                        style={{ padding: '3px 6px', fontSize: 12 }}
                        value={b.code}
                        onChange={(e) => upd((x) => { x.bands[bi].code = cqlIdent(e.target.value); })}
                      />
                    </div>
                    <div className="grow">
                      <span className="hint" style={{ fontSize: 10 }}>LABEL</span>
                      <input
                        type="text"
                        style={{ padding: '3px 6px' }}
                        value={b.label}
                        onChange={(e) => upd((x) => { x.bands[bi].label = e.target.value; })}
                      />
                    </div>
                    <div style={{ width: 80 }}>
                      <span className="hint" style={{ fontSize: 10 }}>MIN PTS</span>
                      <input
                        type="number"
                        style={{ padding: '3px 6px', textAlign: 'center' }}
                        value={b.min}
                        onChange={(e) => upd((x) => { x.bands[bi].min = Number(e.target.value); })}
                      />
                    </div>
                    <div style={{ width: 80 }}>
                      <span className="hint" style={{ fontSize: 10 }}>MAX PTS</span>
                      <input
                        type="number"
                        style={{ padding: '3px 6px', textAlign: 'center' }}
                        value={b.max}
                        onChange={(e) => upd((x) => { x.bands[bi].max = Number(e.target.value); })}
                      />
                    </div>
                    <div style={{ width: 160 }}>
                      <span className="hint" style={{ fontSize: 10 }}>PROGNOSIS NOTE</span>
                      <input
                        type="text"
                        placeholder="e.g. ~75% 5-yr OS"
                        style={{ padding: '3px 6px', fontSize: 12 }}
                        value={b.note || ''}
                        onChange={(e) => upd((x) => { x.bands[bi].note = e.target.value; })}
                      />
                    </div>
                    <button
                      className="btn sm danger"
                      disabled={fn.bands.length <= 1}
                      title="Remove risk group"
                      onClick={() => upd((x) => { x.bands.splice(bi, 1); })}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty">No functions defined yet. Click <b>+ Add score function</b> or <b>Browse Reusable Library</b> to create one.</div>
        )}
      </div>

      {/* Catalog Modal */}
      {catalogOpen && (
        <CatalogModal
          initialType="functions"
          g={g}
          allGuidelines={allGuidelines}
          edit={edit}
          toast={toast}
          onClose={() => setCatalogOpen(false)}
          onSelectImported={(_, id) => setSel(id)}
        />
      )}
    </div>
  );
}
