// Corre contra Postgres solo si TEST_DATABASE_URL está definida, por ejemplo:
// TEST_DATABASE_URL=postgres://turnero:turnero@localhost:5432/turnero_test npm test
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('conflicts (Postgres)', { skip: !testDatabaseUrl && 'falta TEST_DATABASE_URL' }, () => {
  let query, getPool, hasAppointmentConflict, hasBlockConflict, assertSlotFree;
  let profA, profB, serviceId, appointmentId, blockId, globalBlockId;

  const at = (hhmm) => `2099-01-05T${hhmm}:00Z`;
  const range = (from, to) => ({ startsAt: at(from), endsAt: at(to) });

  before(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    ({ query, getPool } = await import('../db/pool.js'));
    ({ hasAppointmentConflict, hasBlockConflict, assertSlotFree } = await import('./conflicts.js'));

    const schema = fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
    for (const statement of schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      await query(statement);
    }

    profA = (await query(`INSERT INTO professionals (name) VALUES ('Test A') RETURNING id`)).rows[0].id;
    profB = (await query(`INSERT INTO professionals (name) VALUES ('Test B') RETURNING id`)).rows[0].id;
    serviceId = (await query(`INSERT INTO services (name) VALUES ('Test') RETURNING id`)).rows[0].id;

    const insertAppointment = (from, to, status) =>
      query(
        `INSERT INTO appointments (professional_id, service_id, starts_at, ends_at, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [profA, serviceId, at(from), at(to), status]
      );
    appointmentId = (await insertAppointment('10:00', '10:30', 'RESERVADO')).rows[0].id;
    await insertAppointment('11:00', '11:30', 'CANCELADO');
    await insertAppointment('11:30', '12:00', 'COMPLETADO');

    blockId = (
      await query(`INSERT INTO blocks (professional_id, starts_at, ends_at) VALUES ($1, $2, $3) RETURNING id`, [
        profA,
        at('12:00'),
        at('13:00'),
      ])
    ).rows[0].id;
    globalBlockId = (
      await query(`INSERT INTO blocks (professional_id, starts_at, ends_at) VALUES (NULL, $1, $2) RETURNING id`, [
        at('14:00'),
        at('15:00'),
      ])
    ).rows[0].id;
  });

  after(async () => {
    if (!query) return;
    await query('DELETE FROM blocks WHERE id = ANY($1)', [[blockId, globalBlockId]]);
    await query('DELETE FROM appointments WHERE professional_id = ANY($1)', [[profA, profB]]);
    await query('DELETE FROM professionals WHERE id = ANY($1)', [[profA, profB]]);
    await query('DELETE FROM services WHERE id = $1', [serviceId]);
    await getPool().end();
  });

  describe('hasAppointmentConflict', () => {
    test('detecta un solapamiento parcial', async () => {
      const found = await hasAppointmentConflict({ professionalId: profA, ...range('10:15', '10:45') });
      assert.equal(found?.id, appointmentId);
    });

    test('detecta un turno nuevo que contiene al existente', async () => {
      const found = await hasAppointmentConflict({ professionalId: profA, ...range('09:30', '11:00') });
      assert.equal(found?.id, appointmentId);
    });

    test('un turno pegado (fin = inicio) no es conflicto', async () => {
      assert.equal(await hasAppointmentConflict({ professionalId: profA, ...range('10:30', '11:00') }), null);
      assert.equal(await hasAppointmentConflict({ professionalId: profA, ...range('09:30', '10:00') }), null);
    });

    test('no mira turnos de otro profesional', async () => {
      assert.equal(await hasAppointmentConflict({ professionalId: profB, ...range('10:00', '10:30') }), null);
    });

    test('ignora turnos cancelados y completados', async () => {
      assert.equal(await hasAppointmentConflict({ professionalId: profA, ...range('11:00', '12:00') }), null);
    });

    test('excludeId ignora el propio turno al reprogramarlo', async () => {
      const found = await hasAppointmentConflict({
        professionalId: profA,
        ...range('10:15', '10:45'),
        excludeId: appointmentId,
      });
      assert.equal(found, null);
    });
  });

  describe('hasBlockConflict', () => {
    test('detecta un bloqueo del profesional', async () => {
      const found = await hasBlockConflict({ professionalId: profA, ...range('12:30', '13:30') });
      assert.equal(found?.id, blockId);
    });

    test('un bloqueo de otro profesional no afecta', async () => {
      assert.equal(await hasBlockConflict({ professionalId: profB, ...range('12:30', '13:30') }), null);
    });

    test('un bloqueo general (sin profesional) afecta a todos', async () => {
      assert.equal((await hasBlockConflict({ professionalId: profA, ...range('14:30', '15:30') }))?.id, globalBlockId);
      assert.equal((await hasBlockConflict({ professionalId: profB, ...range('14:30', '15:30') }))?.id, globalBlockId);
    });

    test('un horario pegado al bloqueo no es conflicto', async () => {
      assert.equal(await hasBlockConflict({ professionalId: profA, ...range('13:00', '13:30') }), null);
    });

    test('excludeId ignora el propio bloqueo', async () => {
      const found = await hasBlockConflict({ professionalId: profA, ...range('12:30', '13:30'), excludeId: blockId });
      assert.equal(found, null);
    });
  });

  describe('assertSlotFree', () => {
    test('rechaza con 409 si hay un turno', async () => {
      await assert.rejects(assertSlotFree({ professionalId: profA, ...range('10:00', '10:30') }), {
        status: 409,
        message: 'El profesional ya tiene un turno en ese horario',
      });
    });

    test('rechaza con 409 si hay un bloqueo', async () => {
      await assert.rejects(assertSlotFree({ professionalId: profA, ...range('12:00', '12:30') }), {
        status: 409,
        message: 'El horario está bloqueado',
      });
    });

    test('resuelve si el horario está libre', async () => {
      await assert.doesNotReject(assertSlotFree({ professionalId: profA, ...range('10:30', '11:00') }));
    });
  });
});
