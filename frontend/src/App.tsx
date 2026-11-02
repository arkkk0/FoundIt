import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { AllPosts } from './pages/AllPosts';
import { SinglePost } from './pages/SinglePost';
import { CreatePost } from './pages/CreatePost';
import { EditPost } from './pages/EditPost';

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<AllPosts />} />
            <Route path="/posts/:id" element={<SinglePost />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/posts/:id/edit" element={<EditPost />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;