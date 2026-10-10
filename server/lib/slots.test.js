import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSlots } from './slots.js';

const starts = (slots) => slots.map((s) => s.startMin);

test('sin turnos ocupados genera todos los horarios de la ventana', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 660 }],
    busy: [],
    durationMin: 30,
    intervalMin: 30,
  });
  assert.deepEqual(slots, [
    { startMin: 540, endMin: 570 },
    { startMin: 570, endMin: 600 },
    { startMin: 600, endMin: 630 },
    { startMin: 630, endMin: 660 },
  ]);
});

test('un turno que solo toca el borde no se considera solapado', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 630 }],
    busy: [{ startMin: 570, endMin: 600 }],
    durationMin: 30,
    intervalMin: 30,
  });
  assert.deepEqual(starts(slots), [540, 600]);
});

test('un solapamiento parcial descarta los horarios afectados', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 660 }],
    busy: [{ startMin: 585, endMin: 615 }],
    durationMin: 30,
    intervalMin: 30,
  });
  assert.deepEqual(starts(slots), [540, 630]);
});

test('un turno contenido dentro del horario lo descarta', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 600 }],
    busy: [{ startMin: 550, endMin: 560 }],
    durationMin: 30,
    intervalMin: 30,
  });
  assert.deepEqual(starts(slots), [570]);
});

test('un bloqueo que cubre toda la ventana no deja horarios', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 660 }],
    busy: [{ startMin: 480, endMin: 720 }],
    durationMin: 30,
    intervalMin: 30,
  });
  assert.deepEqual(slots, []);
});

test('acepta minutos como strings', () => {
  const slots = generateSlots({
    windows: [{ startMin: '540', endMin: '600' }],
    busy: [{ startMin: '540', endMin: '570' }],
    durationMin: '30',
    intervalMin: '30',
  });
  assert.deepEqual(starts(slots), [570]);
});

test('con intervalo menor a la duración los horarios se pisan entre sí pero respetan los ocupados', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 630 }],
    busy: [{ startMin: 600, endMin: 615 }],
    durationMin: 30,
    intervalMin: 15,
  });
  assert.deepEqual(starts(slots), [540, 555, 570]);
});

test('sin intervalo usa la duración como paso', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 630 }],
    busy: [],
    durationMin: 45,
  });
  assert.deepEqual(starts(slots), [540, 585]);
});

test('earliestMin descarta los horarios anteriores', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 660 }],
    busy: [],
    durationMin: 30,
    intervalMin: 30,
    earliestMin: 580,
  });
  assert.deepEqual(starts(slots), [600, 630]);
});

test('el último horario no se pasa del fin de la ventana', () => {
  const slots = generateSlots({
    windows: [{ startMin: 540, endMin: 620 }],
    busy: [],
    durationMin: 30,
    intervalMin: 30,
  });
  assert.deepEqual(starts(slots), [540, 570]);
});

test('con varias ventanas aplica los ocupados a cada una', () => {
  const slots = generateSlots({
    windows: [
      { startMin: 540, endMin: 600 },
      { startMin: 840, endMin: 900 },
    ],
    busy: [
      { startMin: 540, endMin: 570 },
      { startMin: 870, endMin: 900 },
    ],
    durationMin: 30,
    intervalMin: 30,
  });
  assert.deepEqual(starts(slots), [570, 840]);
});
