export type AgeGroup = "minor" | "adult" | "senior";

export interface PostWithCounts {
  id: string;
  title: string | null;
  summary: string | null;
  media_urls: string[] | null;
  author: string | null;
  age_group?: string | null;
  nationality?: string | null;
  likesCount: number;
  starsCount: number;
}

export interface UserInfo {
  nationality: string;
  ageGroup: AgeGroup;
}

/**
 * Convert the on-chain userType value (0-11) into a generic age group label.
 */
export function userTypeToAgeGroup(userType: number): AgeGroup {
  if ([0, 1, 6, 7].includes(userType)) return "minor";
  if ([4, 5, 10, 11].includes(userType)) return "senior";
  return "adult"; // default adult
}

/**
 * Compute a composite ranking score for a post.
 * Higher scores indicate higher ranking.
 */
export function computeSearchRank(
  post: PostWithCounts,
  keywords: string[],
  user: UserInfo
): number {
  let relevance = 0;
  const lowerTitle = (post.title || "").toLowerCase();
  const lowerSummary = (post.summary || "").toLowerCase();
  keywords.forEach((k) => {
    if (lowerTitle.includes(k)) relevance += 2; // weight title matches higher
    if (lowerSummary.includes(k)) relevance += 1;
  });

  // Base relevance has the highest weight
  let score = relevance * 1000;

  // Engagement metrics
  score += post.likesCount * 10;
  score += post.starsCount * 5;

  // Preference boosts
  if (post.nationality && user.nationality && post.nationality === user.nationality) {
    score += 3;
  }
  if (post.age_group && (post.age_group as AgeGroup) === user.ageGroup) {
    score += 2;
  }

  return score;
} 