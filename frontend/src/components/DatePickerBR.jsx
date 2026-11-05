import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DatePickerBR = ({ id, value, onChange, required, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef(null);

  // Sincroniza o valor externo (ISO) com o display interno (dd/mm/aaaa)
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      if (y && m && d) {
        setDisplayValue(`${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`);
        setViewDate(new Date(y, m - 1, d));
        return;
      }
    }
    setDisplayValue('');
    setViewDate(new Date());
  }, [value]);

  // Fecha o popup ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTextChange = (e) => {
    let rawVal = e.target.value;

    // Suporte para valor ISO (ex: 2026-10-05) vindo de testes ou preenchimento programatico
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawVal)) {
      const [y, m, d] = rawVal.split('-');
      setDisplayValue(`${d}/${m}/${y}`);
      onChange(rawVal);
      return;
    }

    let val = rawVal.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    
    let formatted = val;
    if (val.length > 4) formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    else if (val.length > 2) formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    
    setDisplayValue(formatted);

    if (val.length === 8) {
      const d = parseInt(val.slice(0, 2), 10);
      const m = parseInt(val.slice(2, 4), 10);
      const y = parseInt(val.slice(4), 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900) {
        onChange(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      } else {
        onChange('');
      }
    } else {
      onChange('');
    }
  };

  const handleDayClick = (day) => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + 1;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const renderDays = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '32px', height: '32px' }} />);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = value === dateStr;
      const isToday = new Date().toDateString() === new Date(y, m, i).toDateString();
      
      days.push(
        <button
          key={i}
          type="button"
          onClick={() => handleDayClick(i)}
          style={{
            width: '32px', height: '32px', border: 'none', borderRadius: '50%',
            backgroundColor: isSelected ? '#2563eb' : 'transparent',
            color: isSelected ? '#fff' : isToday ? '#2563eb' : '#374151',
            fontWeight: isSelected || isToday ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem',
          }}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          id={id}
          value={displayValue}
          onChange={handleTextChange}
          onFocus={() => setIsOpen(true)}
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          required={required}
          style={{ ...style, paddingRight: '2.5rem' }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir calendário"
          style={{
            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <CalendarIcon size={18} />
        </button>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem',
          backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, padding: '0.75rem',
          width: '280px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#111827' }}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>
            {DAYS.map(d => <div key={d}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {renderDays()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
            <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer' }}>
              Limpar
            </button>
            <button type="button" onClick={() => { const today = new Date(); handleDayClick(today.getDate()); setViewDate(today); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer' }}>
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
