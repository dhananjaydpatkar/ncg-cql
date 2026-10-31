import React, { useState, useMemo } from 'react';
import {
  searchCatalog,
  importFindingIntoGuideline,
  importOutcomeIntoGuideline,
  importFunctionIntoGuideline,
  getAllCatalogItems,
} from '../lib/catalog';
import { KindPill } from './ui';
import { Folder, Tag } from 'lucide-react';

export function CatalogModal({
  initialType = 'findings', // 'findings' | 'functions' | 'outcomes'
  g, // active guideline
  allGuidelines = [],
  edit, // edit mutator
  onClose,
  toast = () => {},
  onSelectImported, // callback with (type, id)
}) {
  const [type, setType] = useState(initialType);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [source, setSource] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [multiSel, setMultiSel] = useState(new Set());
  const [autoImportMissing, setAutoImportMissing] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  // Get all catalog items to extract category lists and all findings for dependency auto-import
  const allCatalog = useMemo(() => getAllCatalogItems(allGuidelines, g.id), [allGuidelines, g.id]);

  // Search results
  const results = useMemo(() => {
    return searchCatalog({
      type,
      query,
      category,
      source,
      currentGuideline: g,
      allGuidelines,
    });
  }, [type, query, category, source, g, allGuidelines]);

  // All categories for active type
  const categories = useMemo(() => {
    const set = new Set();
    (allCatalog[type] || []).forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort();
  }, [allCatalog, type]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    (allCatalog[type] || []).forEach((it) => {
      const c = it.category || 'General';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [allCatalog, type]);

  // Grouped results for categorized view
  const groupedResults = useMemo(() => {
    const groups = {};
    results.forEach((item) => {
      const cat = item.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [results]);

  const toggleCollapse = (catName) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  // Active item in preview
  const activeItem = useMemo(() => {
    if (selectedId) {
      const match = results.find((x) => x.id === selectedId);
      if (match) return match;
    }
    return results[0] || null;
  }, [results, selectedId]);

  // Other guidelines available as sources
  const otherGuidelines = useMemo(() => {
    return allGuidelines.filter((x) => x.id !== g.id);
  }, [allGuidelines, g.id]);

  // Single import handler
  const handleImportSingle = (item) => {
    if (item.alreadyInGuideline) {
      toast(`"${item.label}" is already in this guideline`);
      return;
    }

    let res;
    if (type === 'findings') {
      edit((d) => { res = importFindingIntoGuideline(d, item); });
    } else if (type === 'outcomes') {
      edit((d) => { res = importOutcomeIntoGuideline(d, item); });
    } else if (type === 'functions') {
      edit((d) => {
        res = importFunctionIntoGuideline(d, item, {
          importMissingFindings: autoImportMissing,
          allCatalogFindings: allCatalog.findings,
        });
      });
    }

    if (res?.success) {
      let msg = `Imported "${item.label}"`;
      if (res.importedFindings?.length) {
        msg += ` (+ ${res.importedFindings.length} missing findings: ${res.importedFindings.join(', ')})`;
      }
      toast(msg);
      if (onSelectImported) onSelectImported(type, item.id);
    }
  };

  // Bulk import handler
  const handleBulkImport = () => {
    if (!multiSel.size) return;
    const toImport = results.filter((x) => multiSel.has(x.id) && !x.alreadyInGuideline);
    if (!toImport.length) return;

    let count = 0;
    let extraFindingsCount = 0;

    edit((d) => {
      toImport.forEach((item) => {
        if (type === 'findings') {
          const r = importFindingIntoGuideline(d, item);
          if (r.success) count++;
        } else if (type === 'outcomes') {
          const r = importOutcomeIntoGuideline(d, item);
          if (r.success) count++;
        } else if (type === 'functions') {
          const r = importFunctionIntoGuideline(d, item, {
            importMissingFindings: autoImportMissing,
            allCatalogFindings: allCatalog.findings,
          });
          if (r.success) {
            count++;
            extraFindingsCount += (r.importedFindings || []).length;
          }
        }
      });
    });

    setMultiSel(new Set());
    let msg = `Successfully imported ${count} ${type}`;
    if (extraFindingsCount) msg += ` (and ${extraFindingsCount} required findings)`;
    toast(msg);
  };

  const toggleMulti = (id) => {
    setMultiSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItemCard = (item) => {
    const isSel = item.id === activeItem?.id;
    const isChecked = multiSel.has(item.id);
    return (
      <div
        key={item.id}
        className={`catalog-item-card ${isSel ? 'sel' : ''} ${item.alreadyInGuideline ? 'in-use' : ''}`}
        onClick={() => setSelectedId(item.id)}
      >
        <input
          type="checkbox"
          checked={isChecked}
          disabled={item.alreadyInGuideline}
          onChange={(e) => {
            e.stopPropagation();
            toggleMulti(item.id);
          }}
          style={{ marginTop: 3 }}
        />
        <div className="grow">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{item.label}</b>
            {item.alreadyInGuideline ? (
              <span className="pill pass" style={{ fontSize: 10 }}>In Guideline</span>
            ) : (
              <span className="pill draft" style={{ fontSize: 10 }}>Available</span>
            )}
          </div>
          <div className="catalog-item-meta">
            {item.category && (
              <button
                type="button"
                className="meta-tag"
                title={`Filter by ${item.category}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCategory(item.category);
                }}
              >
                {item.category}
              </button>
            )}
            {type === 'findings' && <span className="meta-val">{(item.values || []).length} values</span>}
            {type === 'functions' && (
              <span className="meta-val">
                {(item.factors || []).length} factors · {(item.bands || []).length} bands
              </span>
            )}
            {type === 'outcomes' && (
              <span className="meta-val">{(item.regimens || []).length} regimens</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="catalog-modal-backdrop" onClick={onClose}>
      <div className="catalog-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="catalog-modal-head">
          <div className="catalog-modal-title">
            <div className="catalog-icon">📚</div>
            <div>
              <h3>Reusable Clinical Library</h3>
              <div className="hint">
                Search and reuse standardized findings, prognostic score functions, and clinical outcomes across guidelines.
              </div>
            </div>
          </div>
          <button className="btn sm ghost" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* Type Tabs */}
        <div className="catalog-type-tabs">
          <button
            className={`catalog-type-tab ${type === 'findings' ? 'active' : ''}`}
            onClick={() => { setType('findings'); setSelectedId(null); setCategory('all'); setMultiSel(new Set()); }}
          >
            Findings <span className="pill-count">{allCatalog.findings.length}</span>
          </button>
          <button
            className={`catalog-type-tab ${type === 'functions' ? 'active' : ''}`}
            onClick={() => { setType('functions'); setSelectedId(null); setCategory('all'); setMultiSel(new Set()); }}
          >
            Score Functions <span className="pill-count">{allCatalog.functions.length}</span>
          </button>
          <button
            className={`catalog-type-tab ${type === 'outcomes' ? 'active' : ''}`}
            onClick={() => { setType('outcomes'); setSelectedId(null); setCategory('all'); setMultiSel(new Set()); }}
          >
            Outcomes <span className="pill-count">{allCatalog.outcomes.length}</span>
          </button>
        </div>

        {/* Controls: Search, Category, Source, Grouping */}
        <div className="catalog-toolbar">
          <div className="catalog-search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="catalog-search-input"
              placeholder={`Search ${type} by name, keyword, clinical codes, tags...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery('')}>✕</button>
            )}
          </div>

          <div className="catalog-filter-wrap">
            <label className="lbl-mini">Category:</label>
            <select
              className="catalog-source-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All Categories ({allCatalog[type].length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c} ({categoryCounts[c] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="catalog-source-wrap">
            <label className="lbl-mini">Source:</label>
            <select
              className="catalog-source-select"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="standard">Standard Clinical Catalog</option>
              <option value="custom">Custom Saved Library</option>
              {otherGuidelines.length > 0 && (
                <optgroup label="Other Guidelines">
                  {otherGuidelines.map((og) => (
                    <option key={og.id} value={`g:${og.id}`}>
                      {og.title || og.id}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <button
            type="button"
            className={`btn sm ${groupByCategory ? 'primary' : ''}`}
            onClick={() => setGroupByCategory(!groupByCategory)}
            title="Toggle between categorized sections and a flat list"
          >
            <Folder size={12} /> {groupByCategory ? 'Grouped' : 'Flat'}
          </button>
        </div>

        {/* Category Quick Filter Pills Bar (Wrapped, No Horizontal Scroll) */}
        <div className="catalog-categories-bar">
          <div className="catalog-categories-head">
            <div className="row" style={{ gap: 6 }}>
              <Tag size={12} style={{ color: 'var(--soft)' }} />
              <span>Quick Category Filters:</span>
            </div>
            {category !== 'all' && (
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setCategory('all')}
                style={{ fontSize: 11, padding: '1px 6px', color: 'var(--bad)' }}
              >
                ✕ Clear Filter (Show All)
              </button>
            )}
          </div>
          <div className="catalog-categories">
            <button
              type="button"
              className={`cat-pill ${category === 'all' ? 'on' : ''}`}
              onClick={() => setCategory('all')}
            >
              All Categories <span className="cat-pill-count">{allCatalog[type].length}</span>
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                className={`cat-pill ${category === c ? 'on' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c} <span className="cat-pill-count">{categoryCounts[c] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Split View: Results List + Detail Preview */}
        <div className="catalog-split-view">
          {/* Results List */}
          <div className="catalog-list-col">
            <div className="catalog-list-head">
              <span className="hint">
                Found <b>{results.length}</b> {type}
                {category !== 'all' && <span> in <b>{category}</b></span>}
              </span>
              {multiSel.size > 0 && (
                <button className="btn sm primary" onClick={handleBulkImport}>
                  Import Selected ({multiSel.size})
                </button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="empty" style={{ margin: '20px 0' }}>
                No {type} matched your query.
              </div>
            ) : (
              <div className="catalog-items-scroll">
                {groupByCategory && category === 'all' ? (
                  groupedResults.map(([catName, items]) => {
                    const isCollapsed = collapsedCategories.has(catName);
                    const inGuidelineCount = items.filter((x) => x.alreadyInGuideline).length;
                    return (
                      <div key={catName} className="catalog-category-group">
                        <div
                          className="catalog-category-header"
                          onClick={() => toggleCollapse(catName)}
                          title={isCollapsed ? `Expand ${catName}` : `Collapse ${catName}`}
                        >
                          <div className="row" style={{ gap: 6 }}>
                            <span className="cat-chevron">{isCollapsed ? '▸' : '▾'}</span>
                            <Folder size={13} className="cat-folder-icon" />
                            <span>{catName}</span>
                            <span className="pill-count">{items.length}</span>
                          </div>
                          <div className="hint" style={{ fontSize: 11 }}>
                            {inGuidelineCount > 0 ? `${inGuidelineCount} in guideline` : 'All available'}
                          </div>
                        </div>
                        {!isCollapsed && (
                          <div className="catalog-category-items">
                            {items.map(renderItemCard)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  results.map(renderItemCard)
                )}
              </div>
            )}
          </div>

          {/* Item Preview Card */}
          <div className="catalog-preview-col">
            {activeItem ? (
              <div className="catalog-detail-card">
                <div className="card-head" style={{ marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>{activeItem.label}</h3>
                    <div className="hint" style={{ marginTop: 2 }}>
                      <code style={{ fontSize: 11 }}>{activeItem.id}</code>
                      {activeItem.category && ` · ${activeItem.category}`}
                    </div>
                  </div>
                  <span className="spacer" />
                  {activeItem.kind && <KindPill kind={activeItem.kind} />}
                  {activeItem.alreadyInGuideline ? (
                    <button className="btn sm" disabled>Already Added</button>
                  ) : (
                    <button
                      className="btn sm primary"
                      onClick={() => handleImportSingle(activeItem)}
                    >
                      + Import into Guideline
                    </button>
                  )}
                </div>

                {/* Specific Type Previews */}
                {type === 'findings' && (
                  <div>
                    {activeItem.help && (
                      <div className="sentence" style={{ margin: '8px 0' }}>
                        <b>Clinical Scope:</b> {activeItem.help}
                      </div>
                    )}
                    {activeItem.codeSystemUrl && (
                      <div className="hint" style={{ marginBottom: 10 }}>
                        <b>FHIR CodeSystem:</b> <code style={{ fontSize: 11 }}>{activeItem.codeSystemUrl}</code>
                      </div>
                    )}
                    <div className="lbl" style={{ marginBottom: 6 }}>Allowed Standard Values ({activeItem.values?.length || 0})</div>
                    <div className="chips">
                      {(activeItem.values || []).map((v) => (
                        <div key={v.code} className="chip on" style={{ cursor: 'default' }}>
                          <span>{v.label}</span>
                          <code className="hint" style={{ fontSize: 10 }}>{v.code}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {type === 'functions' && (
                  <div>
                    {activeItem.description && (
                      <div className="sentence" style={{ margin: '8px 0' }}>
                        {activeItem.description}
                      </div>
                    )}
                    {activeItem.citations && (
                      <div className="hint" style={{ marginBottom: 10 }}>
                        <b>Citations:</b> {activeItem.citations}
                      </div>
                    )}

                    {/* Dependencies status */}
                    <div style={{ margin: '12px 0', padding: '10px 12px', background: 'var(--sunk)', borderRadius: 6 }}>
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="lbl">Required Clinical Findings</span>
                        {activeItem.missingDependencies?.length > 0 && (
                          <label className="row" style={{ fontSize: 12, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={autoImportMissing}
                              onChange={(e) => setAutoImportMissing(e.target.checked)}
                            />
                            <span>Auto-import missing findings</span>
                          </label>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(activeItem.requiredFindingIds || (activeItem.factors || []).map((f) => f.findingId)).map((fid) => {
                          const isMissing = activeItem.missingDependencies?.includes(fid);
                          return (
                            <span
                              key={fid}
                              className={`pill ${isMissing ? 'fail' : 'pass'}`}
                              style={{ fontSize: 11 }}
                            >
                              {isMissing ? '✗ Missing: ' : '✓ Found: '} {fid}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lbl" style={{ margin: '12px 0 6px' }}>Prognostic Factor Weights</div>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--sunk)', textAlign: 'left' }}>
                          <th style={{ padding: '4px 8px' }}>Factor Finding</th>
                          <th style={{ padding: '4px 8px' }}>Trigger Values</th>
                          <th style={{ padding: '4px 8px' }}>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeItem.factors || []).map((fa, i) => {
                          const nonZero = Object.entries(fa.points || {}).filter(([, pts]) => Number(pts) > 0);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 500 }}>{fa.findingId}</td>
                              <td style={{ padding: '6px 8px' }}>
                                {nonZero.map(([code]) => code).join(', ') || 'Any value'}
                              </td>
                              <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--accent)' }}>
                                +{nonZero[0]?.[1] || 1} pt
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="lbl" style={{ marginBottom: 6 }}>Risk Stratification Bands</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                      {(activeItem.bands || []).map((b) => (
                        <div key={b.code} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }}>
                          <div style={{ fontWeight: 600 }}>{b.label}</div>
                          <div className="hint" style={{ fontSize: 11 }}>Range: {b.min} to {b.max} pts</div>
                          {b.note && <div style={{ fontSize: 11, color: 'var(--soft)', marginTop: 2 }}>{b.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {type === 'outcomes' && (
                  <div>
                    {activeItem.rationale && (
                      <div className="sentence" style={{ margin: '8px 0' }}>
                        <b>Clinical Rationale:</b> {activeItem.rationale}
                      </div>
                    )}
                    <div className="lbl" style={{ margin: '14px 0 6px' }}>Regimens / Clinical Directives ({activeItem.regimens?.length || 0})</div>
                    {activeItem.regimens?.length === 0 ? (
                      <div className="hint">No specific drug regimens (Review / Watch & Wait protocol).</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(activeItem.regimens || []).map((r, i) => (
                          <div key={r.id || i} className="regimen" style={{ padding: '6px 8px', background: 'var(--sunk)', borderRadius: 4 }}>
                            <div className="grow" style={{ fontWeight: 500 }}>{r.name}</div>
                            {r.category && <span className="meta-tag">{r.category}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty" style={{ margin: '40px auto', maxWidth: 300 }}>
                Select an item from the list to preview details.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="catalog-modal-foot">
          <div className="hint">
            Tip: You can also save custom findings, functions, or outcomes to this library from their edit screens.
          </div>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
