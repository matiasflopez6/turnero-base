import { appointmentLabel } from '../lib/clinical';

export default function AppointmentSearch({ appointments = [], tz, value, onChange }) {
  const selected = appointments.find((item) => String(item.id) === String(value));

  return (
    <div className="grid gap-2">
      <div className="text-xs font-medium uppercase tracking-wide text-(color:--c-muted)">Turno asociado</div>
      <div className="max-h-48 overflow-auto rounded-xl border border-(color:--c-line)">
        <button
          type="button"
          className={`block w-full px-3 py-2 text-left text-sm hover:bg-(color:--c-subtle) ${
            !value ? 'bg-(color:--c-accent-tint) text-(color:--c-accent-strong)' : ''
          }`}
          onClick={() => onChange('')}
        >
          Sin turno asociado
        </button>
        {appointments.map((item) => {
          const active = String(item.id) === String(value);
          return (
            <button
              key={item.id}
              type="button"
              className={`block w-full border-t border-(color:--c-line) px-3 py-2 text-left text-sm hover:bg-(color:--c-subtle) ${
                active ? 'bg-(color:--c-accent-tint) text-(color:--c-accent-strong)' : ''
              }`}
              onClick={() => onChange(String(item.id))}
            >
              <div className="font-medium">
                {item.service?.name || 'Servicio'} · {item.professional?.name || 'Profesional'}
              </div>
              <div className="text-(color:--c-muted)">{appointmentLabel(item, tz)}</div>
            </button>
          );
        })}
        {!appointments.length && (
          <div className="border-t border-(color:--c-line) px-3 py-3 text-sm text-(color:--c-muted)">
            No hay turnos para asociar.
          </div>
        )}
      </div>
      {selected && (
        <div className="rounded-lg bg-(color:--c-subtle) px-3 py-2 text-sm text-(color:--c-text)">
          <div className="font-medium">
            {selected.service?.name} · {selected.professional?.name}
          </div>
          <div className="text-(color:--c-muted)">
            {appointmentLabel(selected, tz)}
            {selected.status ? ` · ${selected.status}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
