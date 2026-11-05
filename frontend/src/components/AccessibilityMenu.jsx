import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  BarChart3,
  Contrast as ContrastIcon,
  Eye,
  Lightbulb,
  Type,
  RotateCcw,
  Check,
} from 'lucide-react';

// SVG customizado: Símbolo Universal de Acesso (braços abertos)
const UniversalAccessIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="6.5" r="1.5" />
    <path d="M12 8v5" />
    <path d="M7 10.5l5-1.5 5 1.5" />
    <path d="M8 21.5l4-8.5 4 8.5" />
  </svg>
);

const STORAGE_KEY = 'eletrokanban_a11y';
const STEP = 10;
const MIN_SCALE = 80;
const MAX_SCALE = 150;

const DEFAULT_STATE = {
  fontScale: 100,
  colorMode: 'default', // 'default', 'grayscale', 'highContrast', 'negativeContrast', 'softBackground'
  readableFont: false,
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    // Suporte para migração de estado antigo (onde as cores eram booleanas)
    const parsed = JSON.parse(raw);
    return {
      fontScale: parsed.fontScale ?? 100,
      colorMode: parsed.colorMode ?? 'default',
      readableFont: parsed.readableFont ?? false,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

const applyState = (state) => {
  const root = document.documentElement;
  root.style.fontSize = `${state.fontScale}%`;

  // Remove todas as classes de cor antes de aplicar a nova
  root.classList.remove(
    'a11y-grayscale',
    'a11y-high-contrast',
    'a11y-negative-contrast',
    'a11y-soft-bg'
  );

  // Aplica a classe de cor correspondente ao modo selecionado
  if (state.colorMode !== 'default') {
    const classMap = {
      grayscale: 'a11y-grayscale',
      highContrast: 'a11y-high-contrast',
      negativeContrast: 'a11y-negative-contrast',
      softBackground: 'a11y-soft-bg',
    };
    if (classMap[state.colorMode]) {
      root.classList.add(classMap[state.colorMode]);
    }
  }

  root.classList.toggle('a11y-readable-font', state.readableFont);
};

export const AccessibilityMenu = () => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(loadState);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    applyState(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota ou modo privado: silencioso */
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector(
        '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]'
      );
      if (first) first.focus({ preventScroll: true });
    }
  }, [open]);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const reset = () => setState({ ...DEFAULT_STATE });

  const toggleColorMode = (mode) => {
    update({ colorMode: state.colorMode === mode ? 'default' : mode });
  };

  const canIncrease = state.fontScale < MAX_SCALE;
  const canDecrease = state.fontScale > MIN_SCALE;

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    fontSize: '0.85rem',
    color: '#1f2937',
    cursor: 'pointer',
  };

  const checkStyle = {
    marginLeft: 'auto',
    color: '#10b981',
    fontWeight: 'bold',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Ferramentas de acessibilidade"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ef4444', /* Mesma cor do botão Sair */
          color: '#ffffff',
          border: 'none',
          padding: '0.4rem', /* Padding uniforme para deixar o botão quadrado */
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '0.8rem',
        }}
      >
        <UniversalAccessIcon size={16} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Ferramentas de acessibilidade"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.35rem)',
            right: 0,
            minWidth: '250px',
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
            padding: '0.35rem 0',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid #e5e7eb',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: '#111827',
            }}
          >
            Ferramentas de Acessibilidade
          </div>

          <button
            type="button"
            role="menuitem"
            disabled={!canIncrease}
            onClick={() => update({ fontScale: Math.min(MAX_SCALE, state.fontScale + STEP) })}
            style={{
              ...itemStyle,
              opacity: canIncrease ? 1 : 0.45,
              cursor: canIncrease ? 'pointer' : 'not-allowed',
            }}
          >
            <ZoomIn size={16} /> Aumentar o Texto
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#6b7280' }}>
              {state.fontScale}%
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!canDecrease}
            onClick={() => update({ fontScale: Math.max(MIN_SCALE, state.fontScale - STEP) })}
            style={{
              ...itemStyle,
              opacity: canDecrease ? 1 : 0.45,
              cursor: canDecrease ? 'pointer' : 'not-allowed',
            }}
          >
            <ZoomOut size={16} /> Diminuir o Texto
          </button>

          {/* Opções mutuamente exclusivas (menuitemradio) */}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={state.colorMode === 'grayscale'}
            onClick={() => toggleColorMode('grayscale')}
            style={itemStyle}
          >
            <BarChart3 size={16} /> Escala de Cinza
            {state.colorMode === 'grayscale' && <Check size={14} style={checkStyle} />}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={state.colorMode === 'highContrast'}
            onClick={() => toggleColorMode('highContrast')}
            style={itemStyle}
          >
            <ContrastIcon size={16} /> Alto Contraste
            {state.colorMode === 'highContrast' && <Check size={14} style={checkStyle} />}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={state.colorMode === 'negativeContrast'}
            onClick={() => toggleColorMode('negativeContrast')}
            style={itemStyle}
          >
            <Eye size={16} /> Contraste Negativo
            {state.colorMode === 'negativeContrast' && <Check size={14} style={checkStyle} />}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={state.colorMode === 'softBackground'}
            onClick={() => toggleColorMode('softBackground')}
            style={itemStyle}
          >
            <Lightbulb size={16} /> Luz de Cor de Fundo
            {state.colorMode === 'softBackground' && <Check size={14} style={checkStyle} />}
          </button>

          {/* Fonte Legível é independente (menuitemcheckbox) */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={state.readableFont}
            onClick={() => update({ readableFont: !state.readableFont })}
            style={itemStyle}
          >
            <Type size={16} /> Fonte Legível
            {state.readableFont && <Check size={14} style={checkStyle} />}
          </button>

          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              marginTop: '0.35rem',
              paddingTop: '0.35rem',
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={reset}
              style={{ ...itemStyle, color: '#dc2626' }}
            >
              <RotateCcw size={16} /> Redefinir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
