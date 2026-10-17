import { useState } from 'react';
import { Label } from './Modal';
import { connectSupabase } from '../lib/supabase';
import { saveConnection } from '../lib/cloudConfig';

/**
 * Formulário para colar a URL, a chave anon e o schema do Supabase.
 * Guarda neste computador e liga o cliente na hora. Chama `onSaved(conn)`.
 */
export default function ConnectionForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({ url: initial?.url || '', anonKey: initial?.anonKey || '', schema: initial?.schema || 'gwen' });
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const saved = saveConnection(form);
      connectSupabase(saved);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-[13px] text-muted leading-relaxed">
        Cole os dados do seu projeto Supabase (Project Settings, API). Eles ficam só neste computador. Antes, rode as migrações da
        pasta <span className="mono text-bone">supabase/migrations</span> e adicione o schema em Data API, Exposed schemas.
      </p>
      <label className="field">
        <span className="field-label">URL do projeto</span>
        <input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://abcd1234.supabase.co" required />
      </label>
      <label className="field">
        <span className="field-label">Chave anon</span>
        <input className="input mono" value={form.anonKey} onChange={(e) => setForm({ ...form, anonKey: e.target.value })} placeholder="eyJ..." required />
      </label>
      <label className="field">
        <span className="field-label">Schema</span>
        <input className="input" value={form.schema} onChange={(e) => setForm({ ...form, schema: e.target.value })} />
      </label>
      {error && <p className="text-[13px] text-ember">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">
          <Label>Salvar conexão</Label>
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            <Label>Cancelar</Label>
          </button>
        )}
      </div>
    </form>
  );
}
