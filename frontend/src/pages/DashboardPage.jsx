import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { KanbanBoard } from '../components/KanbanBoard';
import { FluxoManagerModal } from '../components/FluxoManagerModal';
import { AccessibilityMenu } from '../components/AccessibilityMenu';
import { LogOut, Layout, Clock, Settings } from 'lucide-react';

export const DashboardPage = () => {
  const { user, limiares, logout } = useAuth();
  const [isFluxoModalOpen, setIsFluxoModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <header style={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '0.75rem',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layout size={22} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>EletroKanban (v0.7.0)</h1>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-end'
        }}>
          {user?.papel === 'administrador' && (
            <button
              onClick={() => setIsFluxoModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.8rem'
              }}
            >
              <Settings size={14} /> Fluxos
            </button>
          )}
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
            {user?.username} ({user?.papel})
          </span>
          
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '0.4rem 0.7rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.8rem'
            }}
          >
            <LogOut size={14} /> Sair
          </button>
          
          {/* Botão de Acessibilidade agora fica À DIREITA do botão Sair */}
          <AccessibilityMenu />
        </div>
      </header>

      <main style={{ padding: '1rem 0.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              Quadro de Negociações
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.15rem 0 0 0' }}>
              Gestão adaptada para dispositivos móveis
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#4b5563' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={13} color="#f59e0b" /> L1={limiares?.l1}d | L2={limiares?.l2}d
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
