import React, { useState } from 'react';

export const CreatePost: React.FC = () => {
  const [postType, setPostType] = useState<'lost' | 'found'>('lost');

  return (
    <div>
      <h1>Create New Post</h1>
      
      <form onSubmit={(e) => e.preventDefault()}>
        <div>
          <label>Post Type:</label>
          <select 
            value={postType} 
            onChange={(e) => setPostType(e.target.value as 'lost' | 'found')}
          >
            <option value="lost">Lost Item</option>
            <option value="found">Found Item</option>
          </select>
        </div>

        <div>
          <label>Title:</label>
          <input type="text" placeholder="e.g. Student ID Card, Blue Water Bottle" required />
        </div>

        <div>
          <label>Category ID:</label>
          <input type="number" placeholder="1" required />
        </div>

        <div>
          <label>Description:</label>
          <textarea placeholder="Provide details about the item..." rows={4} required />
        </div>

        <div>
          <label>Location Label:</label>
          <input type="text" placeholder="e.g. Student Union 2nd Floor" />
        </div>

        <div>
          <label>Date & Time:</label>
          <input type="datetime-local" required />
        </div>

        {/* Conditional fields based on database integrity rules */}
        {postType === 'found' && (
          <>
            <div>
              <label>Image Key / URL:</label>
              <input type="text" placeholder="Image key or URL" required />
            </div>

            <div>
              <label>Verification Question:</label>
              <input type="text" placeholder="e.g. What color is the keychain attached?" required />
            </div>

            <div>
              <label>Drop-Off Point ID (Optional):</label>
              <input type="number" placeholder="Drop off point ID" />
            </div>
          </>
        )}

        <button type="submit">Submit Post</button>
      </form>
    </div>
  );
};