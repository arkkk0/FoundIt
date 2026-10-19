import React from 'react';
import { Search, PlusCircle, Bell, User, MapPin } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header>
      <div>
        <div>
          
          {/* Logo & Brand */}
          <div>
            <MapPin />
            <a href="/">
              Found<span>It</span>
            </a>
          </div>

          {/* Quick Search Bar */}
          <div>
            <div>
              <Search />
              <input
                type="text"
                placeholder="Search lost & found items"
              />
            </div>
          </div>

          {/* Right Navigation Actions */}
          <div>
            <button>
              <PlusCircle />
              <span>Create Post</span>
            </button>

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