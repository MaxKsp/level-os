import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppContextProvider } from '../context/AppContext';
import {
  calculateRoutineProgress,
  Dashboard,
  ROUTINE_PROGRESS_CIRCUMFERENCE,
} from '../components/Dashboard/Dashboard';

const tasks = (completed: number, total: number) =>
  Array.from({ length: total }, (_, index) => ({
    id: String(index),
    time: '08:00',
    title: `Tarefa ${index + 1}`,
    subtitle: 'Teste',
    completed: index < completed,
  }));

describe('progresso da rotina no Dashboard', () => {
  beforeEach(() => localStorage.clear());

  it.each([
    [0, 0, 0],
    [0, 4, 0],
    [1, 3, 33],
    [2, 4, 50],
    [4, 4, 100],
  ])('calcula %i de %i como %i%%', (completed, total, expected) => {
    expect(calculateRoutineProgress(completed, total)).toBe(expected);
  });

  it('expõe no círculo SVG o percentual calculado e sua circunferência', () => {
    localStorage.setItem('orby_tasks', JSON.stringify(tasks(2, 4)));
    render(<AppContextProvider><Dashboard /></AppContextProvider>);

    const circle = screen.getByRole('progressbar', { name: /progresso da rotina/i });
    expect(circle).toHaveAttribute('aria-valuenow', '50');
    expect(circle).toHaveStyle({ strokeDasharray: String(ROUTINE_PROGRESS_CIRCUMFERENCE) });
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
