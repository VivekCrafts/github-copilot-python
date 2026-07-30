import React from 'react';
import { render, screen } from '@testing-library/react';

function App() {
  return <h1>Sudoku</h1>;
}

describe('App', () => {
  it('renders the game title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sudoku/i })).toBeInTheDocument();
  });
});
