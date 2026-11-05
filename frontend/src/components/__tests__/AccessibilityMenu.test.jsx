import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccessibilityMenu } from '../AccessibilityMenu';
import { vi } from 'vitest';

const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: /ferramentas de acessibilidade/i }));
};

describe('AccessibilityMenu - RF-33', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.fontSize = '';
    vi.clearAllMocks();
  });

  test('renderiza o botão com aria-label e aria-expanded=false', () => {
    render(<AccessibilityMenu />);
    const button = screen.getByRole('button', { name: /ferramentas de acessibilidade/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('abre o menu ao clicar no botão', () => {
    render(<AccessibilityMenu />);
    openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Ferramentas de Acessibilidade')).toBeInTheDocument();
  });

  test('aumentar o texto incrementa o font-size do <html> em 10%', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /aumentar o texto/i }));
    await waitFor(() => {
      expect(document.documentElement.style.fontSize).toBe('110%');
    });
  });

  test('diminuir o texto decrementa o font-size do <html> em 10%', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /diminuir o texto/i }));
    await waitFor(() => {
      expect(document.documentElement.style.fontSize).toBe('90%');
    });
  });

  test('escala de cinza aplica classe a11y-grayscale no <html>', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    const item = screen.getByRole('menuitemradio', { name: /escala de cinza/i });
    fireEvent.click(item);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(true);
    });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  test('alto contraste aplica classe a11y-high-contrast', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    const item = screen.getByRole('menuitemradio', { name: /alto contraste/i });
    fireEvent.click(item);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);
    });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  test('contraste negativo aplica classe a11y-negative-contrast', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    const item = screen.getByRole('menuitemradio', { name: /contraste negativo/i });
    fireEvent.click(item);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-negative-contrast')).toBe(true);
    });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  test('luz de cor de fundo aplica classe a11y-soft-bg', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    const item = screen.getByRole('menuitemradio', { name: /luz de cor de fundo/i });
    fireEvent.click(item);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-soft-bg')).toBe(true);
    });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  test('fonte legível aplica classe a11y-readable-font (independente)', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    const item = screen.getByRole('menuitemcheckbox', { name: /fonte legível/i });
    fireEvent.click(item);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-readable-font')).toBe(true);
    });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  test('opções de cor são mutuamente exclusivas', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    
    const grayscale = screen.getByRole('menuitemradio', { name: /escala de cinza/i });
    const highContrast = screen.getByRole('menuitemradio', { name: /alto contraste/i });

    // Ativa escala de cinza
    fireEvent.click(grayscale);
    await waitFor(() => {
      expect(grayscale).toHaveAttribute('aria-checked', 'true');
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(true);
    });

    // Ativa alto contraste (deve desligar escala de cinza)
    fireEvent.click(highContrast);
    await waitFor(() => {
      expect(highContrast).toHaveAttribute('aria-checked', 'true');
      expect(grayscale).toHaveAttribute('aria-checked', 'false');
      
      expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(false);
    });
  });

  test('redefinir restaura estado padrão e limpa classes', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /escala de cinza/i }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /fonte legível/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /aumentar o texto/i }));
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(true);
      expect(document.documentElement.classList.contains('a11y-readable-font')).toBe(true);
      expect(document.documentElement.style.fontSize).toBe('110%');
    });

    fireEvent.click(screen.getByRole('menuitem', { name: /redefinir/i }));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(false);
      expect(document.documentElement.classList.contains('a11y-readable-font')).toBe(false);
      expect(document.documentElement.style.fontSize).toBe('100%');
    });
  });

  test('persiste preferências em localStorage', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /contraste negativo/i }));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('eletrokanban_a11y'));
      expect(stored.colorMode).toBe('negativeContrast');
    });
  });
});
