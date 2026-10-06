"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Star } from "@/components/stars";
import { deleteReview, saveReview, type ReviewState } from "./actions";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({
  appId,
  existing,
  needsName,
}: {
  appId: string;
  existing?: { rating: number; body: string };
  needsName: boolean;
}) {
  const [state, action, pending] = useActionState(saveReview.bind(null, appId), {} as ReviewState);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [deleting, startDelete] = useTransition();
  const [deleted, setDeleted] = useState(false);
  const body = useRef<HTMLTextAreaElement>(null);
  const shown = hover || rating;

  return (
    <form action={action} className="panel space-y-4 p-5">
      <fieldset>
        <legend className="label">{existing ? "Your rating" : "Rate it"}</legend>
        <div className="flex items-center gap-3">
          <div className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <label key={i} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(i)}>
                <input
                  type="radio"
                  name="rating"
                  value={i}
                  required
                  checked={rating === i}
                  onChange={() => setRating(i)}
                  className="peer sr-only"
                />
                <span className="block rounded peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  <Star size={28} fill={shown >= i ? 1 : 0} />
                </span>
                <span className="sr-only">{i} {i === 1 ? "star" : "stars"}, {LABELS[i]}</span>
              </label>
            ))}
          </div>
          <span className="text-sm text-muted" aria-hidden>{LABELS[shown]}</span>
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-body" className="label">Review <span className="font-normal text-muted">(optional)</span></label>
        <textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={2000}
          ref={body}
          defaultValue={existing?.body}
          placeholder="What did you like? What could be better?"
          className="input"
        />
      </div>
      {needsName && (
        <div>
          <label htmlFor="review-name" className="label">Your name</label>
          <input id="review-name" name="name" required maxLength={80} autoComplete="name" className="input" />
          <p className="hint">Shown with your review.</p>
        </div>
      )}
      {state.error && <p role="alert" className="rounded-md bg-danger-wash p-2 text-sm text-danger">{state.error}</p>}
      {deleted && !existing && <p role="status" className="rounded-md bg-accent-wash p-2 text-sm text-accent-ink">Your review is deleted.</p>}
      {state.ok && existing && <p role="status" className="rounded-md bg-accent-wash p-2 text-sm text-accent-ink">{state.ok}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={pending || deleting}>{existing ? "Update review" : "Post review"}</button>
        {existing && (
          <button
            type="button"
            className="btn btn-danger"
            disabled={pending || deleting}
            onClick={() => confirm("Delete your review?") && startDelete(async () => {
              await deleteReview(appId);
              setRating(0);
              setDeleted(true);
              if (body.current) body.current.value = "";
            })}
          >
            Delete review
          </button>
        )}
      </div>
    </form>
  );
}
