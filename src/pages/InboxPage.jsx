import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api';

export default function InboxPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  async function load(status = filter) {
    const list = await api.inbox(status);
    setRows(list);
    return list;
  }

  useEffect(() => {
    setLoading(true);
    load(filter)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  async function open(row) {
    setSelected(row);
    setError('');
    setMessages(await api.inboxMessages(row.id));
  }

  async function send(ev) {
    ev.preventDefault();
    if (!selected || !draft.trim()) return;
    setError('');
    try {
      await api.inboxReply(selected.id, { body: draft.trim(), phone: selected.phone });
      setDraft('');
      setMessages(await api.inboxMessages(selected.id));
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleBot() {
    if (!selected) return;
    const next = !selected.botEnabled;
    await api.setChatbotForPhone(selected.phone, next);
    setSelected({ ...selected, botEnabled: next });
    setRows(rows.map((row) => (row.id === selected.id ? { ...row, botEnabled: next } : row)));
  }

  return (
    <div className="flex h-full min-h-0 bg-(color:--c-surface)">
      <aside className={`w-full shrink-0 border-(color:--c-line) md:w-80 md:border-r ${selected ? 'hidden md:flex' : 'flex'} min-h-0 flex-col`}>
        <div className="border-b border-(color:--c-line) px-4 py-3">
          <h1 className="text-xl">Mensajes</h1>
          <p className="text-xs text-(color:--c-muted)">WhatsApp de la clínica</p>
          <div className="mt-3 flex gap-2">
            {[
              ['active', 'Activas'],
              ['ended', 'Finalizadas'],
              ['all', 'Todas'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`pill-btn ${filter === value ? 'primary' : ''}`}
                onClick={() => { setFilter(value); setSelected(null); }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading && <p className="p-4 text-sm text-(color:--c-muted)">Cargando…</p>}
          {!loading && !rows.length && <p className="p-4 text-sm text-(color:--c-muted)">No hay conversaciones en este filtro.</p>}
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`flex w-full flex-col gap-1 border-b border-(color:--c-line) px-4 py-3 text-left hover:bg-(color:--c-subtle) ${selected?.id === row.id ? 'bg-(color:--c-accent-tint)' : ''}`}
              onClick={() => open(row).catch((err) => setError(err.message))}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-(color:--c-text)">{row.name}</span>
                <span className="shrink-0 text-xs text-(color:--c-muted)">{shortTime(row.at)}</span>
              </span>
              <span className="truncate text-sm text-(color:--c-muted)">{row.preview || 'Sin texto'}</span>
              {!row.botEnabled && <span className="text-xs text-(color:--c-warn)">Chatbot apagado</span>}
            </button>
          ))}
        </div>
      </aside>
      <section className={`min-h-0 min-w-0 flex-1 flex-col ${selected ? 'flex' : 'hidden md:flex'}`}>
        {!selected && (
          <div className="grid flex-1 place-items-center p-6 text-sm text-(color:--c-muted)">Elegí una conversación</div>
        )}
        {selected && (
          <>
            <header className="flex items-center gap-3 border-b border-(color:--c-line) px-3 py-3">
              <button className="icon-btn md:hidden" type="button" aria-label="Volver" onClick={() => setSelected(null)}>
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{selected.name}</div>
                <div className="truncate text-xs text-(color:--c-muted)">{selected.phone}</div>
              </div>
              <label className="flex items-center gap-2 text-sm text-(color:--c-text)">
                <input type="checkbox" checked={selected.botEnabled} onChange={() => toggleBot().catch((err) => setError(err.message))} />
                Chatbot
              </label>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto bg-(color:--c-subtle) p-4">
              {messages.map((message) => (
                <div key={message.id} className={`max-w-[min(85%,20rem)] min-w-0 rounded-2xl px-3 py-2 text-sm ${message.direction === 'outbound' ? 'ml-auto bg-(color:--c-nav-active) text-(color:--c-nav-active-text)' : 'bg-(color:--c-surface) text-(color:--c-text)'}`}>
                  {message.media && <MessageMedia media={message.media} />}
                  {message.text && (
                    <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      <MessageText text={message.text} />
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-(color:--c-muted)">{shortTime(message.at)}</p>
                </div>
              ))}
            </div>
            <form className="border-t border-(color:--c-line) p-3" onSubmit={send}>
              {error && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              {selected.canReply ? (
                <div className="flex gap-2">
                  <input className="min-w-0 flex-1 rounded-full border border-(color:--c-line) px-4 py-2" value={draft} placeholder="Escribí un mensaje" onChange={(e) => setDraft(e.target.value)} />
                  <button className="pill-btn primary" type="submit">Enviar</button>
                </div>
              ) : (
                <p className="rounded-xl bg-(color:--c-warn-tint) px-3 py-2 text-sm text-(color:--c-warn)">
                  Pasaron más de 24 horas desde el último mensaje de esta persona. WhatsApp no deja escribir hasta que vuelva a escribir.
                </p>
              )}
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function MessageMedia({ media }) {
  if (media.kind === 'image') return <img src={media.url} alt={media.filename} className="mb-1 max-h-64 w-full rounded-lg object-contain" />;
  if (media.kind === 'audio') return <audio className="mb-1 w-full" controls src={media.url} />;
  if (media.kind === 'video') return <video className="mb-1 max-h-64 w-full rounded-lg" controls src={media.url} />;
  return (
    <a className="mb-1 block break-all text-(color:--c-accent) underline" href={media.url} target="_blank" rel="noreferrer">
      {media.filename}
    </a>
  );
}

function MessageText({ text }) {
  const parts = String(text || '').split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (!/^https?:\/\//.test(part)) return <span key={index}>{part}</span>;
    return (
      <a key={index} className="break-all text-(color:--c-accent) underline" href={part} target="_blank" rel="noreferrer">
        {part}
      </a>
    );
  });
}

function shortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
