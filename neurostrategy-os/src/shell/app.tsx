/*
  NeuroStrategy OS — Bootloader Shell (Fase 1)
  AXIOMA 1: O Shell NÃO contém lógica clínica (zero business logic).
  AXIOMA 3: Tauri commands são usados como única forma de I/O.
*/

import React, { createContext, useContext, useState, useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, NavLink } from 'react-router-dom';
import './styles.css';

// --- Types & Context ---

/**
 * AXIOMA 5: Contexto global mínimo para o Shell.
 * Mantém apenas o estado da sessão e o ID do paciente ativo.
 */
interface ShellContextType {
  activePatientId: string | null;
  sessionState: 'idle' | 'active' | 'paused';
  dispatch: (event: { type: string; payload?: any }) => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export const useShellContext = () => {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShellContext must be used within a ShellProvider');
  }
  return context;
};

// --- Components ---

/**
 * Componente Principal do Shell
 * Define a estrutura fixa (Header + Outlet).
 */
const ShellRoot: React.FC = () => {
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'paused'>('idle');

  // AXIOMA 3: Dispatcher de eventos globais
  // Por enquanto, apenas loga e atualiza o estado (em seguida será substituído por XState)
  const dispatch = (event: { type: string; payload?: any }) => {
    console.log('[SHELL DISPATCHER]', event);
    if (event.type === 'SELECT_PATIENT') {
      setActivePatientId(event.payload);
    }
  };

  const contextValue = useMemo(() => ({
    activePatientId,
    sessionState,
    dispatch,
  }), [activePatientId, sessionState]);

  return (
    <ShellContext.Provider value={contextValue}>
      {/* Header Fixo (50px) */}
      <header id="menu">
        <div className="brand">NeuroStrategy OS</div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            <button>Dashboard</button>
          </NavLink>
          <NavLink to="/pacientes" className={({ isActive }) => isActive ? 'active' : ''}>
            <button>Pacientes</button>
          </NavLink>
          <NavLink to="/clinico" className={({ isActive }) => isActive ? 'active' : ''}>
            <button>Clínico</button>
          </NavLink>
          <NavLink to="/marketing" className={({ isActive }) => isActive ? 'active' : ''}>
            <button>Marketing</button>
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
            <button>Admin</button>
          </NavLink>
          <NavLink to="/configuracoes" className={({ isActive }) => isActive ? 'active' : ''}>
            <button>Configurações</button>
          </NavLink>
        </nav>
      </header>

      {/* Área Central Dinâmica */}
      <main id="core-outlet">
        <Outlet />
      </main>
    </ShellContext.Provider>
  );
};

// --- Placeholder Components ---

const Dashboard = () => (
  <div className="card">
    <h2>Dashboard Inicial</h2>
    <p>Bem-vindo ao NeuroStrategy OS. Este é o esqueleto funcional da Fase 1.</p>
  </div>
);

const Pacientes = () => <div className="card"><h2>Controle de Pacientes</h2><p>Área declarada para gestão longitudinal.</p></div>;
const Clinico = () => <div className="card"><h2>Núcleo Clínico</h2><p>Área para atendimento e evolução (Aba Evolução).</p></div>;
const Marketing = () => <div className="card"><h2>Núcleo de Marketing</h2><p>BI, Analytics e Autoridade Clínica.</p></div>;

// --- Router Definition ---

const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellRoot />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/pacientes', element: <Pacientes /> },
      { path: '/clinico', element: <Clinico /> },
      { path: '/marketing', element: <Marketing /> },
      { path: '/admin', element: <div className="card"><h2>Administração</h2><p>Controle financeiro e operacional.</p></div> },
      { path: '/configuracoes', element: <div className="card"><h2>Configurações</h2><p>Ajustes de sistema e IA.</p></div> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
