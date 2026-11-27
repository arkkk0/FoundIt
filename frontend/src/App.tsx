import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AllPosts } from './pages/AllPosts';
import { SinglePost } from './pages/SinglePost';
import { CreatePost } from './pages/CreatePost';
import { EditPost } from './pages/EditPost';
import { Layout } from './components/Layout';
import { AuthProvider } from './auth';
import { AuthPage } from './pages/AuthPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/login" element={<AuthPage key="login" mode="login" />} />
            <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
            <Route path="/" element={<AllPosts />} />
            <Route path="/posts/:id" element={<SinglePost />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/posts/:id/edit" element={<EditPost />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
};

export default App;