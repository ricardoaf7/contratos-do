import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Usuarios from '../Usuarios';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

describe('Usuarios Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mostrar mensagem de acesso negado para não diretores', async () => {
    // Mock user as fiscal
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: '123' } },
    });
    
    // Mock profile query for fiscal role
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: 'fiscal' } }),
        }),
      }),
    });

    render(
      <BrowserRouter>
        <Usuarios />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Acesso restrito a Diretores.')).toBeInTheDocument();
    });
  });

  it('deve renderizar a lista de usuários e botão criar para diretores', async () => {
    // Mock user as diretor
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'admin' } },
    });
    
    // Mock profile query (1st call: role check, 2nd call: list profiles)
    const selectMock = vi.fn();
    (supabase.from as any).mockReturnValue({
      select: selectMock,
    });

    // Role check response
    selectMock.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { role: 'diretor' } }),
      }),
    });

    // List profiles response
    selectMock.mockReturnValueOnce({
      order: vi.fn().mockResolvedValue({ 
        data: [{ id: '1', nome: 'Teste User', role: 'fiscal' }],
        error: null 
      }),
    });

    render(
      <BrowserRouter>
        <Usuarios />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Gestão de Equipe')).toBeInTheDocument();
      expect(screen.getByText('Criar Usuário')).toBeInTheDocument();
      expect(screen.getByText('Teste User')).toBeInTheDocument();
    });
  });

  it('deve abrir o modal ao clicar em Criar Usuário', async () => {
    // Setup Director role
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'admin' } },
    });
    
    const selectMock = vi.fn();
    (supabase.from as any).mockReturnValue({ select: selectMock });
    
    selectMock.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { role: 'diretor' } }),
      }),
    });
    selectMock.mockReturnValueOnce({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    render(
      <BrowserRouter>
        <Usuarios />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Criar Usuário'));
    
    fireEvent.click(screen.getByText('Criar Usuário'));
    
    expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: João Silva')).toBeInTheDocument();
  });
});
