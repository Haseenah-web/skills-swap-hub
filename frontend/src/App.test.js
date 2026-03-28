import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders app brand', () => {
  render(<App />);
  expect(screen.getByText(/skillswap/i)).toBeInTheDocument();
});
