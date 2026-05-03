import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Activity, 
  Database, 
  Shield, 
  Layout, 
  Settings, 
  Cpu, 
  Globe, 
  Lock,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Mock data para desenvolvimento se o daemon estiver offline
const INITIAL_LOGS = [
  { timestamp: new Date().toISOString(), level: 'info', msg: 'Console initialized', context: 'UI' },
  { timestamp: new Date().toISOString(), level: 'success', msg: 'Connected to agentd v0.1.0', context: 'IPC' }
];

function App() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [fsmState, setFsmState] = useState('IDLE');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    try {
      const eventSource = new EventSource('http://localhost:3000/api/ai/stream-logs');
      eventSource.onmessage = (event) => {
        const log = JSON.parse(event.data);
        setLogs(prev => [log, ...prev].slice(0, 200));
        if (log.context === 'FSM') setFsmState(log.state || 'IDLE');
      };
      return () => eventSource.close();
    } catch (e) {
      console.warn('⚠️ SSE Connection failed. Operating in offline mode.');
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-slate-300 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/50 bg-[#0d0d0f] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            NeuroEngine
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavItem icon={<Layout size={18} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<Terminal size={18} />} label="Logs & Tracing" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <NavItem icon={<Database size={18} />} label="Memory RAG" active={activeTab === 'memory'} onClick={() => setActiveTab('memory')} />
          <NavItem icon={<Shield size={18} />} label="Governance" active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          <NavItem icon={<Globe size={18} />} label="Browser Skill" active={activeTab === 'browser'} onClick={() => setActiveTab('browser')} />
        </nav>

        <div className="p-4 border-t border-slate-800/50 space-y-3">
          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">FSM Status</span>
              <div className={`w-2 h-2 rounded-full animate-pulse ${fsmState === 'IDLE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <div className="text-sm font-mono text-indigo-400">{fsmState}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-8 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span>Agent Control Center</span>
            <ChevronRight size={14} />
            <span className="text-slate-100 capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center gap-4">
             <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
               <Settings size={20} />
             </button>
             <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
               V
             </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8">
           {activeTab === 'overview' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-4 gap-6">
                 <StatCard icon={<Activity size={20} className="text-emerald-400" />} label="Uptime" value="12d 4h 32m" />
                 <StatCard icon={<Cpu size={20} className="text-indigo-400" />} label="Token Usage" value="1.4M" sub="Today" />
                 <StatCard icon={<Database size={20} className="text-amber-400" />} label="Memories" value="8,432" sub="Factuals" />
                 <StatCard icon={<Lock size={20} className="text-rose-400" />} label="Rules Blocked" value="12" sub="Critical" />
               </div>

               <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-2 bg-[#0d0d0f] rounded-2xl border border-slate-800/50 p-6">
                    <h3 className="text-lg font-bold mb-4">Real-time Operations</h3>
                    <div className="space-y-3 font-mono text-xs">
                      {logs.slice(0, 10).map((log, i) => (
                        <div key={i} className="flex gap-4 p-2 rounded hover:bg-slate-800/30 border border-transparent hover:border-slate-800/50 transition-all group">
                          <span className="text-slate-600 group-hover:text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className={`uppercase font-bold w-12 ${log.level === 'error' ? 'text-rose-500' : 'text-indigo-400'}`}>{log.level}</span>
                          <span className="text-slate-300">{log.msg}</span>
                          {log.context && <span className="ml-auto text-slate-700 bg-slate-800/50 px-2 rounded-full">{log.context}</span>}
                        </div>
                      ))}
                    </div>
                 </div>
                 
                 <div className="bg-[#0d0d0f] rounded-2xl border border-slate-800/50 p-6">
                    <h3 className="text-lg font-bold mb-4">Audit Log</h3>
                    <div className="space-y-4">
                       <AuditItem action="Git Push" target="src/app/page.tsx" time="2m ago" status="success" />
                       <AuditItem action="Vortex Publish" target="hero-section" time="15m ago" status="success" />
                       <AuditItem action="Shell Exec" target="npm run build" time="1h ago" status="warning" />
                       <AuditItem action="Browser Open" target="google.com" time="2h ago" status="error" denied />
                    </div>
                 </div>
               </div>
             </div>
           )}

           {activeTab === 'logs' && (
             <div className="h-full flex flex-col bg-black rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#0d0d0f] flex justify-between items-center">
                   <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                   </div>
                   <span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">tracing.log</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
                   {logs.map((log, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-slate-700 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`${log.level === 'error' ? 'text-rose-400' : 'text-indigo-300'}`}>{log.msg}</span>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
          : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent'
      }`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
      {active && <div className="ml-auto w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />}
    </button>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-[#0d0d0f] p-6 rounded-2xl border border-slate-800/50 hover:border-slate-700/50 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1 tracking-tight">{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        {sub && <span className="text-[10px] text-slate-600 font-bold uppercase">{sub}</span>}
      </div>
    </div>
  );
}

function AuditItem({ action, target, time, status, denied }) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-800/30 transition-colors">
       <div className={`mt-1 p-1.5 rounded-lg border ${
         denied ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
       }`}>
          {denied ? <Lock size={14} /> : <CheckCircle2 size={14} />}
       </div>
       <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
             <span className="text-sm font-bold text-slate-200">{action}</span>
             <span className="text-[10px] text-slate-600 font-bold uppercase">{time}</span>
          </div>
          <div className="text-xs text-slate-500 truncate">{target}</div>
       </div>
    </div>
  );
}

export default App;
