import React, { useState, type SubmitEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, loading, authenticate } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const signup = mode === 'signup';

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    try {
      const form = new FormData(event.currentTarget);
      const fields = {
        email: form.get('email'),
        password: form.get('password'),
        ...(signup ? { display_name: form.get('display_name') } : {}),
      };

      await authenticate(mode, fields);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not submit the form.');
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p>Checking session…</p>;
  if (user) return <Navigate to="/" replace />;

  return (
    <section>
      <h1>{signup ? 'Sign Up' : 'Sign In'}</h1>
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          {signup && (
            <p>
              <label htmlFor="display_name">Display name</label>
              <input id="display_name" name="display_name" autoComplete="nickname" maxLength={100} required />
            </p>
          )}
          <p>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" maxLength={254} required />
          </p>
          <p>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              minLength={signup ? 8 : undefined}
              maxLength={128}
              required
            />
          </p>
          <button type="submit">{signup ? 'Sign Up' : 'Sign In'}</button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
      <p>
        <Link to={signup ? '/login' : '/signup'}>
          {signup ? 'Sign in instead' : 'Create an account'}
        </Link>
      </p>
    </section>
  );
}