import React from 'react';
import { useParams } from 'react-router-dom';

export const EditPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>Edit Post</h1>
      <p>Editing form for Post ID: {id}</p>
    </div>
  );
};