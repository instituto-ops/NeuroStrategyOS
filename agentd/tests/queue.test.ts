/**
 * tests/queue.test.ts — Testa o TaskQueue in-memory
 */

import { describe, it, expect } from 'vitest';
import { TaskQueue } from '../src/queue/taskQueue.js';

describe('TaskQueue', () => {
  it('push e pop respeitam prioridade', () => {
    const q = new TaskQueue();
    q.push({ type: 'low', payload: null, priority: 1 });
    q.push({ type: 'high', payload: null, priority: 10 });
    q.push({ type: 'mid', payload: null, priority: 5 });

    const first = q.pop();
    expect(first?.type).toBe('high');
    expect(first?.status).toBe('running');
  });

  it('size retorna apenas pending', () => {
    const q = new TaskQueue();
    q.push({ type: 'a', payload: null, priority: 1 });
    q.push({ type: 'b', payload: null, priority: 1 });
    expect(q.size).toBe(2);

    q.pop(); // muda status de 'a' para running
    expect(q.size).toBe(1);
  });

  it('complete marca task como done', () => {
    const q = new TaskQueue();
    const task = q.push({ type: 'x', payload: {}, priority: 1 });
    q.pop();
    q.complete(task.id);
    expect(q.all.find(t => t.id === task.id)?.status).toBe('done');
  });

  it('clear esvazia a fila', () => {
    const q = new TaskQueue();
    q.push({ type: 'a', payload: null, priority: 1 });
    q.clear();
    expect(q.size).toBe(0);
  });
});
