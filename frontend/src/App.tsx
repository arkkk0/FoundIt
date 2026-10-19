import React from 'react';
import { Header } from './components/Header';

const App: React.FC = () => {
  return (
    <div>
      <Header />
      <main>
        <h1>FoundIt Main Feed</h1>
        <p>Browse or search campus lost and found items below.</p>
      </main>
    </div>
  );
};

export default App;