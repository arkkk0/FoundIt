import React, { useEffect, useState, type SubmitEvent,} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type Post = {
  id: number;
  type: 'lost' | 'found';
  title: string;
  category_id: number;
  description: string;
  location_label: string | null;
  latitude: number;
  longitude: number;
  event_date: string;
  image_key: string | null;
  verification_question: string | null;
  drop_off_point_id: number | null;
};

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export const EditPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [postType, setPostType] = useState<'lost' | 'found'>('lost');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setPost(null);
    setLoadError('');
    setSaveError('');

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
        setPostType(data.type);
      } catch (err) {
        if (controller.signal.aborted) return;

        setLoadError(
          err instanceof Error ? err.message : 'Failed to load post.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPost();

    return () => controller.abort();
  }, [id]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '').trim();

    const title = text('title');
    const description = text('description');
    const imageKey = text('image_key');
    const verificationQuestion = text('verification_question');

    if (
      !title ||
      !description ||
      (postType === 'found' && (!imageKey || !verificationQuestion))
    ) {
      setSaveError('Please complete all required fields.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: postType,
          title,
          category_id: Number(text('category_id')),
          description,
          location_label: text('location_label') || null,
          latitude: Number(text('latitude')),
          longitude: Number(text('longitude')),
          event_date: new Date(text('event_date')).toISOString(),
          image_key: postType === 'found' ? imageKey : null,
          verification_question:
            postType === 'found' ? verificationQuestion : null,
          drop_off_point_id:
            postType === 'found' && text('drop_off_point_id')
              ? Number(text('drop_off_point_id'))
              : null,
        }),
      });

      if (!response.ok) {
        const failure = await response.json();
        throw new Error(failure.error || 'Failed to update post.');
      }

      navigate(`/posts/${id}`);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to update post.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main><p>Loading post...</p></main>;
  }

  if (loadError || !post) {
    return (
      <main>
        <p>{loadError || 'Post not found.'}</p>
        <Link to="/">Back to all posts</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Post</h1>

      {saveError && <p>{saveError}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={saving}>
          <legend>Post details</legend>

          <p>
            <label htmlFor="type">Post Type</label>
            <select
              id="type"
              name="type"
              value={postType}
              onChange={(event) =>
                setPostType(event.target.value as 'lost' | 'found')
              }
            >
              <option value="lost">Lost Item</option>
              <option value="found">Found Item</option>
            </select>
          </p>

          <p>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              defaultValue={post.title}
              required
            />
          </p>

          <p>
            <label htmlFor="category_id">Category ID</label>
            <input
              id="category_id"
              name="category_id"
              type="number"
              min="1"
              step="1"
              defaultValue={post.category_id}
              required
            />
          </p>

          <p>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={post.description}
              required
            />
          </p>

          <p>
            <label htmlFor="location_label">Location</label>
            <input
              id="location_label"
              name="location_label"
              defaultValue={post.location_label ?? ''}
            />
          </p>

          <p>
            <label htmlFor="latitude">Latitude</label>
            <input
              id="latitude"
              name="latitude"
              type="number"
              min="-90"
              max="90"
              step="any"
              defaultValue={post.latitude}
              required
            />
          </p>

          <p>
            <label htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              name="longitude"
              type="number"
              min="-180"
              max="180"
              step="any"
              defaultValue={post.longitude}
              required
            />
          </p>

          <p>
            <label htmlFor="event_date">Date &amp; Time</label>
            <input
              id="event_date"
              name="event_date"
              type="datetime-local"
              defaultValue={toLocalDateTime(post.event_date)}
              required
            />
          </p>

          {postType === 'found' && (
            <>
              <p>
                <label htmlFor="image_key">Image Key / URL</label>
                <input
                  id="image_key"
                  name="image_key"
                  defaultValue={post.image_key ?? ''}
                  required
                />
              </p>

              <p>
                <label htmlFor="verification_question">
                  Verification Question
                </label>
                <input
                  id="verification_question"
                  name="verification_question"
                  defaultValue={post.verification_question ?? ''}
                  required
                />
              </p>

              <p>
                <label htmlFor="drop_off_point_id">
                  Drop-Off Point ID (optional)
                </label>
                <input
                  id="drop_off_point_id"
                  name="drop_off_point_id"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={post.drop_off_point_id ?? ''}
                />
              </p>
            </>
          )}

          <button type="submit">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </fieldset>
      </form>

      <Link to={`/posts/${post.id}`}>Cancel</Link>
    </main>
  );
};