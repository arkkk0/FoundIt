import React, { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

type Post = {
  id: number;
  title: string;
  type: 'lost' | 'found';
  description: string;
  location_label: string | null;
  event_date: string;
  status: 'open' | 'returned';
};

type Comment = {
  id: number;
  author_id: number;
  body: string;
  created_at: string;
};

// Temporary local user until login is connected.
const TEST_USER_ID = 1;

export const SinglePost = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    setPost(null);
    setComments([]);
    setBody('');
    setError('');
    setCommentError('');
    setLoading(true);

    async function loadPost() {
      try {
        const response = await fetch(`/api/posts/${id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Post not found.'
              : 'Failed to load post.'
          );
        }

        const data: Post = await response.json();
        setPost(data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : 'Failed to load post.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    async function loadComments() {
      try {
        const response = await fetch(`/api/posts/${id}/comments`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load comments.');
        }

        const data: Comment[] = await response.json();
        setComments(data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setCommentError(
          err instanceof Error ? err.message : 'Failed to load comments.'
        );
      }
    }

    void loadPost();
    void loadComments();

    return () => controller.abort();
  }, [id]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!trimmedBody || trimmedBody.length > 2000) {
      setCommentError('Enter a comment between 1 and 2000 characters.');
      return;
    }

    setSubmitting(true);
    setCommentError('');

    try {
      const response = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(TEST_USER_ID),
        },
        body: JSON.stringify({ body: trimmedBody }),
      });

      if (!response.ok) {
        const failure = await response.json();
        throw new Error(failure.error || 'Failed to add comment.');
      }

      const comment: Comment = await response.json();
      setComments((previous) => [...previous, comment]);
      setBody('');
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : 'Failed to add comment.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main><p>Loading post...</p></main>;
  }

  if (error || !post) {
    return (
      <main>
        <p>{error || 'Post not found.'}</p>
        <Link to="/">Back to all posts</Link>
      </main>
    );
  }

  return (
    <main>
      <Link to="/">Back to all posts</Link>

      <article>
        <h1>{post.title}</h1>
        <p>
          {post.type === 'lost' ? 'Lost' : 'Found'} · {post.status}
        </p>
        <p>{post.description}</p>

        {post.location_label && (
          <p>Location: {post.location_label}</p>
        )}

        <p>
          Date: <time dateTime={post.event_date}>
            {new Date(post.event_date).toLocaleString()}
          </time>
        </p>

        <Link to={`/posts/${post.id}/edit`}>Edit post</Link>
      </article>

      <section>
        <h2>Comments</h2>

        {commentError && <p>{commentError}</p>}

        {comments.length === 0 && !commentError && (
          <p>No comments yet.</p>
        )}

        <ul>
          {comments.map((comment) => (
            <li key={comment.id}>
              <p>{comment.body}</p>
              <p>
                User {comment.author_id} ·{' '}
                <time dateTime={comment.created_at}>
                  {new Date(comment.created_at).toLocaleString()}
                </time>
              </p>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit}>
          <label htmlFor="comment">Add a comment</label>
          <textarea
            id="comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={3}
            required
            disabled={submitting}
          />

          <button
            type="submit"
            disabled={submitting || !body.trim()}
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </section>
    </main>
  );
};