import React, { useState }  from 'react';
import { useAuth } from '../auth';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Bell, MapPin } from 'lucide-react'

export const Header: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      await logout();
    } catch {
      setError('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
}
  return (
    <header className="header">
      <div>
        <div className="header-inner">
          
          {/* Logo -> Links to / */}
          <div className="logo">
            <MapPin />
            <Link to="/">
              Found<span>It</span>
            </Link>
          </div>

          {/* Quick Search Bar */}
          <div>
            <div className="search">
              <Search />
              <input
                type="text"
                placeholder="Search lost & found items..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="actions">
            {/* Create Post -> Links to /create */}
            <Link to="/create" className="button">
              <PlusCircle />
              <span>Create Post</span>
            </Link>

            <button aria-label="Notifications">
              <Bell />
            </button>

              {!loading && (user ? (
              <>
                <span>{user.display_name}</span>
                <button type="button" onClick={signOut} disabled={signingOut}>
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login">Sign In</Link>
            ))}
            {error && <span role="alert">{error}</span>}
          </div>

        </div>
      </div>
    </header>
  );
};