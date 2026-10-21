import React, { useState, useMemo } from 'react';
import { Field, Lead } from './ui';
import { uniqueSlug } from '../lib/model';
import { saveItemToCustomCatalog } from '../lib/catalog';
import { CatalogModal } from './CatalogModal';

export function Findings({ g, edit, allGuidelines = [], toast = () => {} }) {
  const [sel, setSel] = useState(g.findings[0]?.id);
  const [newVal, setNewVal] = useState('');
  const [search, setSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Filter findings in current guideline
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return g.findings;
    return g.findings.filter((x) =>
      x.label.toLowerCase().includes(q) ||
      x.id.toLowerCase().includes(q) ||
      (x.help && x.help.toLowerCase().includes(q)) ||
      (x.category && x.category.toLowerCase().includes(q)) ||
      x.values.some((v) => v.label.toLowerCase().includes(q) || v.code.toLowerCase().includes(q))
    );
  }, [g.findings, search]);

  const f = g.findings.find((x) => x.id === sel) || filtered[0] || g.findings[0];

  const add = () => {
    const id = uniqueSlug('new finding', g.findings.map((x) => x.id));
    edit((d) => {
      d.findings.push({
        id,
        label: 'New finding',
        category: 'Clinical',
        help: '',
        values: [{ code: 'yes', label: 'Yes' }, { code: 'no', label: 'No' }],
      });
    });
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

  const handleSaveToCatalog = () => {
    if (!f) return;
    saveItemToCustomCatalog('findings', f);
    toast(`"${f.label}" saved to reusable clinical library`);
  };

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>Findings</h2>
          <Lead>A finding is a clinical input the guideline looks at - for example <i>Ann Arbor stage</i> or <i>Bone marrow biopsy</i> - together with its allowed values. Rules are built from these.</Lead>
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
              placeholder={`Search ${g.findings.length} findings...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty" style={{ padding: '16px', marginBottom: 10 }}>
              No findings matched "{search}".
            </div>
          ) : (
            filtered.map((x) => (
              <div
                key={x.id}
                className={`list-item ${x.id === f?.id ? 'sel' : ''}`}
                onClick={() => setSel(x.id)}
              >
                <div className="grow">
                  <b>{x.label}</b>
                  <div className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>{x.values.length} values</span>
                    {x.category && <span className="meta-tag">{x.category}</span>}
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <button className="btn primary grow" onClick={add}>+ Add finding</button>
            <button className="btn" title="Browse library" onClick={() => setCatalogOpen(true)}>📚 Library</button>
          </div>
        </div>

        {f ? (
          <div className="card">
            <div className="card-head">
              <div>
                <h3>{f.label}</h3>
                <div className="hint"><code style={{ fontSize: 11 }}>{f.id}</code></div>
              </div>
              <span className="spacer" />
              <button className="btn sm" onClick={handleSaveToCatalog} title="Save to reusable catalog so other guidelines can reuse it">
                ⭐ Save to Library
              </button>
              <button className="btn sm danger" onClick={() => remove(f.id)}>Delete</button>
            </div>

            <div className="grid2">
              <Field label="Name">
                <input
                  type="text"
                  value={f.label}
                  onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).label = e.target.value; })}
                />
              </Field>
              <Field label="Category / Tag" hint="e.g. Staging & Anatomy, Labs & Biomarkers, Safety">
                <input
                  type="text"
                  value={f.category || ''}
                  placeholder="e.g. Staging & Anatomy"
                  onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).category = e.target.value; })}
                />
              </Field>
            </div>

            <Field label="Help text for clinicians" hint="Shown when entering test patients. E.g. which report this comes from.">
              <input
                type="text"
                value={f.help || ''}
                onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).help = e.target.value; })}
              />
            </Field>

            <Field label="FHIR CodeSystem URL" hint="Identifier for standard terminology binding (defaults to NCG standard URL if empty)">
              <input
                type="text"
                value={f.codeSystemUrl || ''}
                placeholder="http://ncgindia.org/fhir/CodeSystem/ncg-..."
                onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).codeSystemUrl = e.target.value; })}
              />
            </Field>

            <div className="lbl" style={{ marginBottom: 6 }}>Possible values ({f.values.length})</div>
            {f.values.map((v, i) => (
              <div className="row" key={v.code} style={{ marginBottom: 6 }}>
                <input
                  type="text"
                  className="grow"
                  value={v.label}
                  onChange={(e) => edit((d) => { d.findings.find((x) => x.id === f.id).values[i].label = e.target.value; })}
                />
                <code className="hint">{v.code}</code>
                <button
                  className="btn sm danger"
                  disabled={f.values.length <= 1}
                  onClick={() => edit((d) => {
                    const ff = d.findings.find((x) => x.id === f.id);
                    ff.values.splice(i, 1);
                    d.rules.forEach((r) => r.conditions.forEach((c) => {
                      if (c.findingId === f.id) c.values = (c.values || []).filter((x) => x !== v.code);
                    }));
                  })}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="row">
              <input
                type="text"
                className="grow"
                placeholder="Add a value, e.g. Stage V"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addValue()}
              />
              <button className="btn" onClick={addValue}>Add value</button>
            </div>
            <div className="hint" style={{ marginTop: 10 }}>"Unknown / not recorded" is always available automatically - you do not need to add it as a value.</div>
          </div>
        ) : (
          <div className="empty">No findings yet. Click <b>Add finding</b> or <b>Browse Reusable Library</b> to start.</div>
        )}
      </div>

      {/* Catalog Modal */}
      {catalogOpen && (
        <CatalogModal
          initialType="findings"
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
