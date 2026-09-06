"use client";

import { useState } from "react";
import { sendMessage } from "@/lib/pitch-actions";

interface PitchMessageButtonProps {
  pitchId: string;
  producerId: string;
  writerId: string;
}

export function PitchMessageButton({
  pitchId,
  producerId,
  writerId,
}: PitchMessageButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);

    const result = await sendMessage(
      null,
      producerId,
      writerId,
      null,
      pitchId,
      message
    );

    if (!result.error) {
      setMessage("");
      setShowForm(false);
      // Could show a success toast here
    }

    setIsLoading(false);
  };

  return (
    <>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg border border-[var(--accent-marigold)] px-4 py-3 font-semibold text-[var(--accent-marigold)] hover:bg-[var(--accent-marigold)]/10"
        >
          💬 Contact Writer
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! This pitch is perfect for our next project..."
            maxLength={2000}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setMessage("");
              }}
              className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              className="flex-1 rounded-lg bg-[var(--accent-marigold)] px-3 py-2 text-sm font-medium text-[var(--bg)] hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
