'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListTodo, CheckCircle2, Circle } from 'lucide-react';
import { PageHeader } from '@/components/alegra/metric-card';

interface Task {
  id: string;
  title: string;
  href: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
}

export function TareasClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/notifications/alerts')
      .then((r) => r.json())
      .then((d) => {
        const t: Task[] = (d.alerts || []).map((a: any) => ({
          id: a.id,
          title: `${a.title}: ${a.message}`,
          href: a.href || '/dashboard',
          done: false,
          priority: a.type === 'critical' ? 'high' : a.type === 'warning' ? 'medium' : 'low',
        }));
        t.push(
          { id: 'review-afip', title: 'Verificar estado AFIP / certificados', href: '/configuracion/afip', done: false, priority: 'medium' },
          { id: 'review-recurrent', title: 'Revisar facturas recurrentes activas', href: '/facturacion/recurrentes', done: false, priority: 'low' },
        );
        setTasks(t);
      });
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Mis tareas" description="Pendientes y acciones sugeridas para tu negocio." />
      <div className="space-y-2">
        {tasks.map((t) => {
          const isDone = done.has(t.id);
          return (
            <div key={t.id} className={`flex items-start gap-3 p-4 bg-white rounded-xl border ${isDone ? 'opacity-60' : ''}`}>
              <button onClick={() => toggle(t.id)} className="mt-0.5 text-gray-400 hover:text-teal-600">
                {isDone ? <CheckCircle2 className="w-5 h-5 text-teal-600" /> : <Circle className="w-5 h-5" />}
              </button>
              <div className="flex-1">
                <p className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</p>
                {!isDone && (
                  <Link href={t.href} className="text-xs text-teal-600 hover:underline mt-1 inline-block">
                    Ir a resolver →
                  </Link>
                )}
              </div>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${
                t.priority === 'high' ? 'bg-red-50 text-red-600' :
                t.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
              }`}>{t.priority}</span>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border">
            <ListTodo className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">Sin tareas pendientes</p>
          </div>
        )}
      </div>
    </div>
  );
}
