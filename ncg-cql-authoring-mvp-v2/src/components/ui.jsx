import React from 'react';

export const Field = ({ label, hint, children }) => (
  <div className="field">
    {label && <label>{label}</label>}
    {children}
    {hint && <span className="hint">{hint}</span>}
  </div>
);

export const Lead = ({ children }) => <p className="lead">{children}</p>;

export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export const KindPill = ({ kind }) => (
  <span className={`pill ${kind}`}>{{ treatment: 'Treatment', observation: 'Observation', review: 'Review' }[kind] || kind}</span>
);
