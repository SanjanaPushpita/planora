import type { VocabularyStatus, VocabularyReviewRating } from './types';

/**
 * Predictable SM-2 spaced repetition calculation for Vocabulary flashcards
 */
export function calculateNextReview(
  currentReviewCount: number,
  currentInterval: number,
  currentEase: number,
  rating: VocabularyReviewRating
): { nextReviewAt: string; intervalDays: number; easeFactor: number; status: VocabularyStatus } {
  const now = new Date();
  let ease = currentEase || 2.5;
  let interval = currentInterval || 0;
  let count = currentReviewCount || 0;
  let status: VocabularyStatus = 'learning';

  if (rating === 'again') {
    interval = 1;
    count = 0;
    ease = Math.max(1.3, ease - 0.2);
    status = 'needs_review';
  } else if (rating === 'hard') {
    interval = count === 0 ? 1 : Math.max(2, Math.round(interval * 1.2));
    count += 1;
    ease = Math.max(1.3, ease - 0.15);
    status = 'learning';
  } else if (rating === 'good') {
    if (count === 0) interval = 1;
    else if (count === 1) interval = 4;
    else interval = Math.max(3, Math.round(interval * ease));
    count += 1;
    status = count >= 3 ? 'known' : 'learning';
  } else if (rating === 'easy') {
    if (count === 0) interval = 4;
    else if (count === 1) interval = 8;
    else interval = Math.max(7, Math.round(interval * (ease + 0.3) * 1.3));
    count += 1;
    ease = ease + 0.15;
    status = 'known';
  }

  const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return {
    nextReviewAt: nextDate.toISOString(),
    intervalDays: interval,
    easeFactor: Number(ease.toFixed(2)),
    status
  };
}
