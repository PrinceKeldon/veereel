import { redirect } from "next/navigation";
import Link from "next/link";
import { getWriterSession } from "@/lib/writer-auth";
import { getProducerSession } from "@/lib/producer-auth";
import { getMessages } from "@/lib/pitch-actions";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/MessageThread";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Messages - Veereel",
  description: "Your message inbox on Veereel",
};

export default async function MessagesPage() {
  const writerId = await getWriterSession();
  const producerId = await getProducerSession();

  if (!writerId && !producerId) {
    redirect("/writer/login");
  }

  const messages = await getMessages(writerId || undefined, producerId || undefined);

  // Group messages by conversation
  const conversations = new Map<
    string,
    {
      id: string;
      otherParty: { id: string; name: string; type: "writer" | "producer" };
      pitch?: { id: string; title: string };
      lastMessage: string;
      lastMessageTime: Date;
      unread: number;
    }
  >();

  for (const msg of messages) {
    const otherPartyId =
      msg.fromWriterId === writerId ? msg.toProducerId : msg.toWriterId || msg.fromProducerId;
    const otherPartyName =
      msg.fromWriterId === writerId ? msg.toProducer?.companyName : msg.fromWriter?.displayName;
    const otherPartyType =
      msg.fromWriterId === writerId ? ("producer" as const) : ("writer" as const);

    if (!otherPartyId || !otherPartyName) continue;

    const convKey = [msg.pitchId || "", otherPartyId].join(":");

    if (!conversations.has(convKey)) {
      conversations.set(convKey, {
        id: convKey,
        otherParty: { id: otherPartyId, name: otherPartyName, type: otherPartyType },
        pitch: msg.pitch ? { id: msg.pitch.id, title: msg.pitch.title } : undefined,
        lastMessage: msg.body.substring(0, 100),
        lastMessageTime: msg.createdAt,
        unread: msg.readAt ? 0 : 1,
      });
    } else {
      const conv = conversations.get(convKey)!;
      if (!msg.readAt) conv.unread++;
    }
  }

  const conversationList = Array.from(conversations.values()).sort(
    (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
  );

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--text)]">
          Messages
        </h1>

        <p className="mt-2 text-[var(--text-muted)]">
          {conversationList.length === 0
            ? "No messages yet. Start connecting with writers or producers!"
            : `${conversationList.length} conversation${conversationList.length !== 1 ? "s" : ""}`}
        </p>

        {conversationList.length === 0 ? (
          <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
            <p className="mb-4 text-[var(--text-muted)]">
              No messages yet. Start exploring pitches or reach out to writers.
            </p>
            <Link
              href="/pitches"
              className="inline-block rounded-lg bg-[var(--accent-marigold)] px-6 py-2 font-semibold text-[var(--bg)] hover:opacity-90"
            >
              Browse Pitches
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {conversationList.map((conversation) => (
              <div
                key={conversation.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--accent-marigold)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--text)]">
                        {conversation.otherParty.name}
                      </h3>
                      <span className="text-xs font-mono uppercase text-[var(--text-muted)]">
                        {conversation.otherParty.type}
                      </span>
                      {conversation.unread > 0 && (
                        <span className="ml-auto rounded-full bg-[var(--accent-rose)] px-2 py-0.5 text-xs font-semibold text-[var(--bg)]">
                          {conversation.unread}
                        </span>
                      )}
                    </div>

                    {conversation.pitch && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Re: <Link
                          href={`/pitch/${conversation.pitch.id}`}
                          className="text-[var(--accent-marigold)] hover:underline"
                        >
                          {conversation.pitch.title}
                        </Link>
                      </p>
                    )}

                    <p className="mt-2 line-clamp-1 text-sm text-[var(--text-muted)]">
                      {conversation.lastMessage}
                    </p>
                  </div>

                  <div className="ml-4 text-right text-xs text-[var(--text-muted)]">
                    {new Date(conversation.lastMessageTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
