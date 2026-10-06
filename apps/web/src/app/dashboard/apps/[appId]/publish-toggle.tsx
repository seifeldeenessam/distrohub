"use client";

import { useState, useTransition } from "react";
import { setPublished } from "../../actions";

export function PublishToggle({ appId, published, canPublish }: { appId: string; published: boolean; canPublish: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="text-right">
      <button
        className={published ? "btn" : "btn btn-primary"}
        disabled={pending || (!published && !canPublish)}
        onClick={() =>
          start(async () => {
            const res = await setPublished(appId, !published);
            setError(res.error);
          })
        }
      >
        {published ? "Unpublish" : "Publish"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
