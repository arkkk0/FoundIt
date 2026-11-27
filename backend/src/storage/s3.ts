import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// The AWS SDK reads AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from the environment on its own.
const client = new S3Client({})

function bucket(): string {
  const name = process.env.AWS_S3_BUCKET
  if (!name) throw new Error('AWS_S3_BUCKET is not set')
  return name
}

// File extension to use for each image type we accept
export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Uploads a photo and returns its key, like "posts/3f2a...e1.jpg"
export async function uploadImage(data: Buffer, contentType: string): Promise<string> {
  const key = `posts/${randomUUID()}.${IMAGE_TYPES[contentType]}`
  await client.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: data, ContentType: contentType }))
  return key
}

// A link that lets the browser show a private photo for the next 10 minutes
export async function getImageUrl(key: string): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 600 })
}
