import React,{ useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postImageUrl } from '../api/uploadPhoto';

type PostSummary = {
  id: number;
  type: 'lost' | 'found';
  title: string;
  description: string;
  location_label: string | null;
  status: 'open' | 'returned';
  image_key: string | null;
};

export const AllPosts = () => {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadPosts() {
      try {
        const response = await fetch('/api/posts', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load posts.');
        }

        const data: PostSummary[] = await response.json();
        setPosts(data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : 'Failed to load posts.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPosts();

    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>All Lost &amp; Found Posts</h1>

      {loading && <p>Loading posts...</p>}

      {error && <p>{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p>No posts yet. <Link to="/create">Create a post</Link>.</p>
      )}

      {!loading && !error && posts.length > 0 && (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <article>
                {post.image_key && (
                  <img src={postImageUrl(post.id)} alt={post.title} width={240} />
                )}
                <h2>
                  <Link to={`/posts/${post.id}`}>{post.title}</Link>
                </h2>
                <p>
                  {post.type === 'lost' ? 'Lost' : 'Found'} · {post.status}
                </p>
                <p>{post.description}</p>
                {post.location_label && (
                  <p>Location: {post.location_label}</p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};