"use client";

import { Bell, CheckCheck, MessageCircleMore, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  getMessages,
  getNotifications,
  markNotificationsRead,
  sendMessage,
} from "@/lib/data/render-api";
import type {
  AccountRole,
  AppNotification,
  CareMessage,
} from "@/lib/data/types";

export function NotificationBell({ role }: { role: AccountRole }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    void getNotifications(role)
      .then(setItems)
      .catch(() => undefined);
  }, [role]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && items.some((item) => !item.readAt)) {
      await markNotificationsRead(role).catch(() => undefined);
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: new Date().toISOString() })),
      );
    }
  };

  const unread = items.filter((item) => !item.readAt).length;
  return (
    <div className="notification-control">
      <button
        className="icon-button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={20} />
        {unread > 0 && <span className="notification-count">{unread}</span>}
      </button>
      {open && (
        <section className="notification-popover" aria-label="Notifications">
          <div>
            <strong>Notifications</strong>
            <CheckCheck size={17} />
          </div>
          {items.length === 0 ? (
            <p>You are all caught up.</p>
          ) : (
            items.slice(0, 8).map((item) => (
              <article key={item.id}>
                <span className={`notification-kind kind-${item.type}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
}

export function CareChat({
  role,
  playerId,
  title,
}: {
  role: AccountRole;
  playerId: string;
  title: string;
}) {
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    void getMessages(role, playerId)
      .then(setMessages)
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Messages are unavailable",
        ),
      );
  }, [playerId, role]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const message = await sendMessage(role, playerId, body.trim());
      setMessages((current) => [...current, message]);
      setBody("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Message not sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="care-chat" aria-label={`Chat with ${title}`}>
      <header>
        <span>
          <MessageCircleMore size={20} />
        </span>
        <div>
          <strong>{title}</strong>
          <small>Private care-team conversation</small>
        </div>
      </header>
      <div className="message-list" aria-live="polite">
        {messages.length === 0 && (
          <div className="message-empty">
            <MessageCircleMore size={27} />
            <strong>Start the conversation</strong>
            <p>Messages stay between this player and her linked clinician.</p>
          </div>
        )}
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.senderRole === role ? "message-mine" : "message-theirs"
            }
          >
            <p>{message.body}</p>
            <small>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </article>
        ))}
        <div ref={endRef} />
      </div>
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor={`chat-${role}-${playerId}`}>
          Write a message
        </label>
        <textarea
          id={`chat-${role}-${playerId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a message..."
          maxLength={1000}
          rows={2}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
      <p className="chat-boundary">
        Do not use chat for emergencies. Contact local emergency services when
        urgent.
      </p>
    </section>
  );
}
