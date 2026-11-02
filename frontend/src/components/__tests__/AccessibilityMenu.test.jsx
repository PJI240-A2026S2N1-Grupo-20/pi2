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
    expect(
      screen.getByRole('button', { name: /ferramentas de acessibilidade/i })
    ).toHaveAttribute('aria-expanded', 'true');
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
    const item = screen.getByRole('menuitemcheckbox', { name: /escala de cinza/i });
    fireEvent.click(item);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(true);
    });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  test('alto contraste aplica classe a11y-high-contrast', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /alto contraste/i }));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);
    });
  });

  test('contraste negativo aplica classe a11y-negative-contrast', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /contraste negativo/i }));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-negative-contrast')).toBe(true);
    });
  });

  test('luz de cor de fundo aplica classe a11y-soft-bg', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /luz de cor de fundo/i }));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-soft-bg')).toBe(true);
    });
  });

  test('fonte legível aplica classe a11y-readable-font', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /fonte legível/i }));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-readable-font')).toBe(true);
    });
  });

  test('redefinir restaura estado padrão e limpa classes', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /escala de cinza/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /aumentar o texto/i }));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(true);
      expect(document.documentElement.style.fontSize).toBe('110%');
    });

    fireEvent.click(screen.getByRole('menuitem', { name: /redefinir/i }));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(false);
      expect(document.documentElement.style.fontSize).toBe('100%');
    });
  });

  test('persiste preferências em localStorage', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /fonte legível/i }));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('eletrokanban_a11y'));
      expect(stored.readableFont).toBe(true);
    });
  });

  test('restaura preferências persistidas ao montar', async () => {
    localStorage.setItem(
      'eletrokanban_a11y',
      JSON.stringify({
        fontScale: 130,
        grayscale: true,
        highContrast: false,
        negativeContrast: false,
        softBackground: false,
        readableFont: true,
      })
    );
    render(<AccessibilityMenu />);
    await waitFor(() => {
      expect(document.documentElement.style.fontSize).toBe('130%');
      expect(document.documentElement.classList.contains('a11y-grayscale')).toBe(true);
      expect(document.documentElement.classList.contains('a11y-readable-font')).toBe(true);
    });
  });

  test('fecha ao clicar fora', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('fecha com Escape', async () => {
    render(<AccessibilityMenu />);
    openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});
