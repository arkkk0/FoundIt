import React from 'react';
import { Header } from './Header';

// The frame around every page: header on top, page content in the middle, footer at the bottom.
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="layout">
      <Header />
      <main className="page">{children}</main>
      <footer className="footer">FoundIt · Campus Lost &amp; Found</footer>
    </div>
  );
};