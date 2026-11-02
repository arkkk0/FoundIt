import React from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Bell, User, MapPin } from 'lucide-react'

export const Header: React.FC = () => {
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

            <button className="button button-outline">
              <User />
              <span>Sign In</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};