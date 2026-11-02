import React from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Bell, User, MapPin } from 'lucide-react'

export const Header: React.FC = () => {
  return (
    <header>
      <div>
        <div>
          
          {/* Logo -> Links to / */}
          <div>
            <MapPin />
            <Link to="/">
              Found<span>It</span>
            </Link>
          </div>

          {/* Quick Search Bar */}
          <div>
            <div>
              <Search />
              <input
                type="text"
                placeholder="Search lost & found items..."
              />
            </div>
          </div>

          {/* Actions */}
          <div>
            {/* Create Post -> Links to /create */}
            <Link to="/create">
              <PlusCircle />
              <span>Create Post</span>
            </Link>

            <button aria-label="Notifications">
              <Bell />
            </button>

            <button>
              <User />
              <span>Sign In</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};