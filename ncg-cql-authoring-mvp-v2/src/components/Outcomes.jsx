import React, { useState, useMemo } from 'react';
import { Field, Lead, KindPill } from './ui';
import { OUTCOME_KINDS, uid, uniqueSlug } from '../lib/model';
import { saveItemToCustomCatalog } from '../lib/catalog';
import { CatalogModal } from './CatalogModal';

export function Outcomes({ g, edit, allGuidelines = [], toast = () => {} }) {
  const [sel, setSel] = useState(g.outcomes[0]?.id);
  const [reg, setReg] = useState('');
  const [cat, setCat] = useState('');
  const [search, setSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Filter outcomes in current guideline
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return g.outcomes;
    return g.outcomes.filter((x) =>
      x.label.toLowerCase().includes(q) ||
      x.id.toLowerCase().includes(q) ||
      (x.rationale && x.rationale.toLowerCase().includes(q)) ||
      (x.category && x.category.toLowerCase().includes(q)) ||
      x.regimens.some((r) => r.name.toLowerCase().includes(q) || (r.category && r.category.toLowerCase().includes(q)))
    );
  }, [g.outcomes, search]);

  const o = g.outcomes.find((x) => x.id === sel) || filtered[0] || g.outcomes[0];

  const add = () => {
    const id = uniqueSlug('new outcome', g.outcomes.map((x) => x.id));
    edit((d) => {
      d.outcomes.push({
        id,
        label: 'New outcome',
        kind: 'treatment',
        category: 'Treatment',
        rationale: '',
        regimens: [],
      });
    });
    setSel(id);
  };

  const remove = (id) => {
    if (id === g.fallbackOutcomeId) {
      alert('This outcome is the fallback. Choose a different fallback in Rules first.');
      return;
    }
    if (!confirm('Delete this outcome? Rules pointing to it will need a new outcome.')) return;
    edit((d) => {
      d.outcomes = d.outcomes.filter((x) => x.id !== id);
      d.rules.forEach((r) => { if (r.outcomeId === id) r.outcomeId = ''; });
    });
    setSel(undefined);
  };

  const upd = (fn) => edit((d) => fn(d.outcomes.find((x) => x.id === o.id)));

  const handleSaveToCatalog = () => {
    if (!o) return;
    saveItemToCustomCatalog('outcomes', o);
    toast(`"${o.label}" saved to reusable clinical library`);
  };

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>Outcomes</h2>
          <Lead>An outcome is a treatment group the guideline can assign - with the regimens to suggest and the clinical reasoning. Include one <b>Needs review</b> outcome for patients whose data is missing or unreliable.</Lead>
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
              placeholder={`Search ${g.outcomes.length} outcomes...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty" style={{ padding: '16px', marginBottom: 10 }}>
              No outcomes matched "{search}".
            </div>
          ) : (
            filtered.map((x) => (
              <div
                key={x.id}
                className={`list-item ${x.id === o?.id ? 'sel' : ''}`}
                onClick={() => setSel(x.id)}
              >
                <div className="grow">
                  <b>{x.label}</b>
                  <div className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>{x.regimens.length} regimens</span>
                    {x.category && <span className="meta-tag">{x.category}</span>}
                  </div>
                </div>
                <KindPill kind={x.kind} />
              </div>
            ))
          )}

          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <button className="btn primary grow" onClick={add}>+ Add outcome</button>
            <button className="btn" title="Browse library" onClick={() => setCatalogOpen(true)}>📚 Library</button>
          </div>
        </div>

        {o ? (
          <div className="card">
            <div className="card-head">
              <div>
                <h3>{o.label}</h3>
                <div className="hint"><code style={{ fontSize: 11 }}>{o.id}</code></div>
              </div>
              <span className="spacer" />
              <button className="btn sm" onClick={handleSaveToCatalog} title="Save to reusable library">
                ⭐ Save to Library
              </button>
              <button className="btn sm danger" onClick={() => remove(o.id)}>Delete</button>
            </div>

            <div className="grid2">
              <Field label="Name">
                <input
                  type="text"
                  value={o.label}
                  onChange={(e) => upd((x) => { x.label = e.target.value; })}
                />
              </Field>
              <Field label="Category / Tag" hint="e.g. Staging & Workup, Systemic Therapy, Safety">
                <input
                  type="text"
                  value={o.category || ''}
                  placeholder="e.g. Systemic Therapy"
                  onChange={(e) => upd((x) => { x.category = e.target.value; })}
                />
              </Field>
            </div>

            <Field label="Type">
              <select
                value={o.kind}
                onChange={(e) => upd((x) => { x.kind = e.target.value; })}
              >
                {OUTCOME_KINDS.map((k) => (
                  <option key={k.code} value={k.code}>{k.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Clinical rationale" hint="Shown to the clinician together with the recommendation.">
              <textarea
                value={o.rationale}
                onChange={(e) => upd((x) => { x.rationale = e.target.value; })}
              />
            </Field>

            <div className="lbl" style={{ marginBottom: 6 }}>Regimens / Clinical Directives ({o.regimens.length})</div>
            {o.regimens.length === 0 && (
              <div className="hint" style={{ marginBottom: 8 }}>
                {o.kind === 'review' ? 'A review outcome intentionally lists no regimens.' : 'No regimens yet.'}
              </div>
            )}
            {o.regimens.map((r, i) => (
              <div className="regimen" key={r.id}>
                <input
                  type="text"
                  className="grow"
                  value={r.name}
                  onChange={(e) => upd((x) => { x.regimens[i].name = e.target.value; })}
                />
                <input
                  type="text"
                  style={{ width: 190 }}
                  value={r.category || ''}
                  placeholder="Category"
                  onChange={(e) => upd((x) => { x.regimens[i].category = e.target.value; })}
                />
                <button
                  className="btn sm ghost"
                  disabled={i === 0}
                  onClick={() => upd((x) => { x.regimens.splice(i - 1, 0, x.regimens.splice(i, 1)[0]); })}
                >
                  ↑
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => upd((x) => { x.regimens.splice(i, 1); })}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <input
                type="text"
                className="grow"
                placeholder="Add regimen, e.g. Obinutuzumab + bendamustine"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
              />
              <input
                type="text"
                style={{ width: 190 }}
                placeholder="Category (optional)"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
              />
              <button
                className="btn"
                onClick={() => {
                  if (!reg.trim()) return;
                  upd((x) => {
                    x.regimens.push({ id: uid('r'), name: reg.trim(), category: cat.trim() });
                  });
                  setReg('');
                  setCat('');
                }}
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">No outcomes yet. Click <b>Add outcome</b> or <b>Browse Reusable Library</b> to start.</div>
        )}
      </div>

      {/* Catalog Modal */}
      {catalogOpen && (
        <CatalogModal
          initialType="outcomes"
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
