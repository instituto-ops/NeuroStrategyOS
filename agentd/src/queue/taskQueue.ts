/**
 * agentd/src/queue/taskQueue.ts
 * 
 * In-memory task queue (STUB para Fase 2).
 * Será expandida com persistência e prioridades nas fases seguintes.
 */

export interface Task {
  id: string;
  type: string;
  payload: unknown;
  priority: number;
  createdAt: Date;
  status: 'pending' | 'running' | 'done' | 'failed';
}

export class TaskQueue {
  private queue: Task[] = [];

  push(task: Omit<Task, 'id' | 'createdAt' | 'status'>): Task {
    const newTask: Task = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date(),
      status: 'pending',
    };
    this.queue.push(newTask);
    this.queue.sort((a, b) => b.priority - a.priority);
    return newTask;
  }

  pop(): Task | undefined {
    const task = this.queue.find(t => t.status === 'pending');
    if (task) task.status = 'running';
    return task;
  }

  peek(): Task | undefined {
    return this.queue.find(t => t.status === 'pending');
  }

  complete(id: string, failed = false): void {
    const task = this.queue.find(t => t.id === id);
    if (task) task.status = failed ? 'failed' : 'done';
  }

  get size(): number {
    return this.queue.filter(t => t.status === 'pending').length;
  }

  get all(): readonly Task[] {
    return this.queue;
  }

  clear(): void {
    this.queue = [];
  }
}
