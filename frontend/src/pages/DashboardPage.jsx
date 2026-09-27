import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KanbanBoard } from '../components/KanbanBoard';
import { FluxoManagerModal } from '../components/FluxoManagerModal';
import { LogOut, Layout, Clock, Settings } from 'lucide-react';

export const DashboardPage = () => {
  const { user, limiares, logout } = useAuth();
  const [isFluxoModalOpen, setIsFluxoModalOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <header style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layout size={24} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>EletroKanban (v0.3.0)</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user?.papel === 'administrador' && (
            <button
              onClick={() => setIsFluxoModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.8rem'
              }}
            >
              <Settings size={15} /> Gerenciar Fluxos
            </button>
          )}
          <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
            {user?.username} ({user?.papel})
          </span>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.85rem'
            }}
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main style={{ padding: '1.5rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              Quadro de Negociações Comerciais
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              Gestão adaptável com abordagem para dispositivos móveis
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#4b5563' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={14} color="#f59e0b" /> Limiares ativos: L1={limiares?.l1}d | L2={limiares?.l2}d
            </span>
          </div>
        </div>

        <KanbanBoard />
      </main>

      {isFluxoModalOpen && (
        <FluxoManagerModal
          onClose={() => setIsFluxoModalOpen(false)}
          onFluxosUpdated={() => window.location.reload()}
        />
      )}
    </div>
  );
};
