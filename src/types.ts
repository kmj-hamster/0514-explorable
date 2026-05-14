export interface PostBase {
  id: string;
  content: string;
  base_truth: number;
  viral_potential: number;
  comments_pool: string[];
}

export interface PostState extends PostBase {
  likes: number;
  comments: number;
  shares: number;
  age: number; // in seconds
  rank_score: number;
  delta_likes: number;
  delta_comments: number;
  delta_shares: number;
}

export interface Weights {
  like: number;
  comment: number;
  share: number;
  truth: number;
}

export type StagePhase = 1 | 2 | 3;
