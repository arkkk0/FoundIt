import React from 'react';
import { Link } from 'react-router-dom';

export const AllPosts: React.FC = () => {
  return (
    <div>
      <h1>All Lost & Found Posts</h1>
      <p>Feed of all reported items will display here.</p>

      {/* Temporary test links to access SinglePost and EditPost */}
      <div>
        <h2>Test Route Shells:</h2>
        <ul>
          <li>
            <Link to="/posts/1">View Sample Post #1</Link>
          </li>
          <li>
            <Link to="/posts/1/edit">Edit Sample Post #1</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};