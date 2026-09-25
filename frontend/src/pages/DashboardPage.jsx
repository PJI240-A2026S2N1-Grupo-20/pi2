import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield, Clock, Layout } from 'lucide-react';

export const DashboardPage = () => {
  const { user, limiares, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <header style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layout size={24} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>EletroKanban — Painel Inicial (v0.1.0)</h1>
        </div>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </header>

      <main className="container" style={{ marginTop: '2rem' }}>
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
            Informações da Sessão Autenticada
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              <User size={20} color="#3b82f6" />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Usuário Logado</p>
                <p style={{ fontWeight: '600' }}>{user?.username} ({user?.email || 'Sem e-mail'})</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              <Shield size={20} color="#10b981" />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Papel (RBAC)</p>
                <p style={{ fontWeight: '600', textTransform: 'capitalize' }}>{user?.papel}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              <Clock size={20} color="#f59e0b" />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Limiares de Atraso Ativos</p>
                <p style={{ fontWeight: '600' }}>L1: {limiares?.l1} dias | L2: {limiares?.l2} dias</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '8px', color: '#1e40af' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Esqueleto Base Configurado com Sucesso!</p>
          <p style={{ fontSize: '0.875rem' }}>
            A infraestrutura de backend (Django + PostgreSQL), autenticação via cookies protegidos, controle RBAC e o frontend em React (projetado com abordagem para dispositivos móveis) estão totalmente operacionais.
          </p>
        </div>
      </main>
    </div>
  );
};
