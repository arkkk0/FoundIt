import React from 'react';
import { useParams } from 'react-router-dom';

export const SinglePost: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>Post Details</h1>
      <p>Viewing details for Post ID: {id}</p>
    </div>
  );
};