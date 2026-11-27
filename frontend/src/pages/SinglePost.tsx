import React, { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { postImageUrl } from '../api/uploadPhoto';

type Post = {
  id: number;
  author_id: number;
  title: string;
  type: 'lost' | 'found';
  description: string;
  location_label: string | null;
  event_date: string;
  status: 'open' | 'returned';
  image_key: string | null;
};

type Comment = {
  author_name: string;
  id: number;
  author_id: number;
  body: string;
  created_at: string;
};


export const SinglePost = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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
    async function removePost() {
    if (!post || !window.confirm('Delete this post and its comments?')) return;

    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });

      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.error ?? 'Could not delete post.');
      }

      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete post.');
    } finally {
      setDeleting(false);
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
        {post.image_key && (
          <img src={postImageUrl(post.id)} alt={post.title} width={400} />
        )}
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

        {user?.id === post.author_id && (
  <p>
    <Link to={`/posts/${post.id}/edit`}>Edit post</Link>{' '}
    <button type="button" onClick={removePost} disabled={deleting}>
      {deleting ? 'Deleting…' : 'Delete post'}
    </button>
  </p>
)}
{deleteError && <p role="alert">{deleteError}</p>}
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
                 {comment.author_name} ·{' '}
                <time dateTime={comment.created_at}>
                  {new Date(comment.created_at).toLocaleString()}
                </time>
              </p>
            </li>
          ))}
        </ul>

        {user ? (<form onSubmit={handleSubmit}>
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
        ) : !authLoading && (
          <p><Link to="/login">Sign in</Link> to comment.</p>
        )}
      </section>
    </main>
  );
};