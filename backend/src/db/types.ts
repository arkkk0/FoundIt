import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely'

export type UserRole = 'student' | 'staff'
export type PostType = 'lost' | 'found'
export type PostStatus = 'open' | 'returned'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'
export type MatchStatus = 'suggested' | 'dismissed'

type CreatedAt = ColumnType<Date, Date | string | undefined, never>
type UpdatedAt = ColumnType<Date, Date | string | undefined, Date | string>

export interface UsersTable {
  id: Generated<number>
  google_sub: string
  email: string
  display_name: string
  role: UserRole
  created_at: CreatedAt
}

export interface CategoriesTable {
  id: Generated<number>
  name: string
}

export interface DropOffPointsTable {
  id: Generated<number>
  name: string
  building: string
  latitude: number
  longitude: number
}

export interface PostsTable {
  id: Generated<number>
  author_id: number
  category_id: number
  drop_off_point_id: number | null
  type: PostType
  title: string
  description: string
  image_key: string | null
  latitude: number
  longitude: number
  location_label: string | null
  event_date: Date | string
  verification_question: string | null
  status: PostStatus
  returned_at: Date | string | null
  created_at: CreatedAt
  updated_at: UpdatedAt
}

export interface CommentsTable {
  id: Generated<number>
  post_id: number
  author_id: number
  body: string
  created_at: CreatedAt
  updated_at: UpdatedAt
}

export interface ClaimsTable {
  id: Generated<number>
  found_post_id: number
  claimant_id: number
  lost_post_id: number | null
  reviewed_by_id: number | null
  answer_text: string
  status: ClaimStatus
  created_at: CreatedAt
  reviewed_at: Date | string | null
}

export interface MatchSuggestionsTable {
  id: Generated<number>
  lost_post_id: number
  found_post_id: number
  score: number
  status: MatchStatus
  notified_at: Date | string | null
  created_at: CreatedAt
}

export interface Database {
  users: UsersTable
  categories: CategoriesTable
  drop_off_points: DropOffPointsTable
  posts: PostsTable
  comments: CommentsTable
  claims: ClaimsTable
  match_suggestions: MatchSuggestionsTable
}

export type Post = Selectable<PostsTable>
export type NewPost = Insertable<PostsTable>
export type PostUpdate = Updateable<PostsTable>
