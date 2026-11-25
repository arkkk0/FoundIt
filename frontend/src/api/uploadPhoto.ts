// Uploads a photo to the backend (which stores it in S3) and returns its image key.
// You must be logged in: the browser sends the session cookie automatically.
export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('photo', file);

  const response = await fetch('/api/uploads', { method: 'POST', body: form });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to upload photo.');
  }
  return result.image_key;
}

// Where the browser can load a post's photo from
export function postImageUrl(postId: number): string {
  return `/api/posts/${postId}/image`;
}
