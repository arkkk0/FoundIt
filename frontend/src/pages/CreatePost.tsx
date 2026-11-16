import React, { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export const CreatePost = () => {
  const navigate = useNavigate();
  const [postType, setPostType] = useState<'lost' | 'found'>('lost');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      setError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author_id: Number(text('author_id')),
          category_id: Number(text('category_id')),
          type: postType,
          title,
          description,
          latitude: Number(text('latitude')),
          longitude: Number(text('longitude')),
          location_label: text('location_label') || null,
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
        throw new Error(failure.error || 'Failed to create post.');
      }

      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create post.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Create New Post</h1>

      {error && <p>{error}</p>}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting}>
          <legend>Post details</legend>

          <p>
            <label htmlFor="author_id">Author ID (temporary local testing)</label>
            <input
              id="author_id"
              name="author_id"
              type="number"
              min="1"
              step="1"
              required
            />
          </p>

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
            <input id="title" name="title" type="text" required />
          </p>

          <p>
            <label htmlFor="category_id">Category ID</label>
            <input
              id="category_id"
              name="category_id"
              type="number"
              min="1"
              step="1"
              required
            />
          </p>

          <p>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
            />
          </p>

          <p>
            <label htmlFor="location_label">Location</label>
            <input id="location_label" name="location_label" type="text" />
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
              required
            />
          </p>

          <p>
            <label htmlFor="event_date">Date &amp; Time</label>
            <input
              id="event_date"
              name="event_date"
              type="datetime-local"
              required
            />
          </p>

          {postType === 'found' && (
            <>
              <p>
                <label htmlFor="image_key">Image Key / URL</label>
                <input id="image_key" name="image_key" type="text" required />
              </p>

              <p>
                <label htmlFor="verification_question">
                  Verification Question
                </label>
                <input
                  id="verification_question"
                  name="verification_question"
                  type="text"
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
                />
              </p>
            </>
          )}

          <button type="submit">
            {submitting ? 'Submitting...' : 'Submit Post'}
          </button>
        </fieldset>
      </form>
    </main>
  );
};