"use client";

import React, { useState } from "react";
import styles from "./contact.module.css";

function newSubmissionKey(): string {
  if (typeof crypto === "undefined") return "";
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto.getRandomValues !== "function") return "";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot field
  const [idempotencyKey, setIdempotencyKey] = useState(newSubmissionKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; status: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!idempotencyKey) throw new Error("A secure submission key is unavailable. Please use the direct email below.");
      const payload = {
        name,
        email,
        message,
        idempotencyKey,
        ...(website ? { website } : {}),
      };

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 202 && data.status === "received") {
        setReceipt({ id: data.id, status: data.status });
        // Clear inputs and cycle idempotency key
        setName("");
        setEmail("");
        setMessage("");
        setWebsite("");
        setIdempotencyKey(newSubmissionKey());
      } else if (res.status === 429) {
        const retryAfter = data.retryAfter || 60;
        setErrorMessage(
          data.error || `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        );
      } else if (res.status === 409) {
        setErrorMessage(
          "Submission conflict: This idempotency key was previously used with different content."
        );
      } else if (res.status === 413) {
        setErrorMessage("Request payload too large. Please shorten your message.");
      } else if (res.status === 503) {
        setErrorMessage(
          "Message storage is temporarily unavailable. Your message was not accepted. Please retry or use the direct email below."
        );
      } else {
        setErrorMessage(data.error || "Unable to send message. Please verify your input and try again.");
      }
    } catch {
      setErrorMessage("Network error occurred while submitting. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.formCard}>
      <noscript><p>The form needs JavaScript. You can contact the owner using the direct email below.</p></noscript>
      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          <strong>Notice:</strong> {errorMessage}
        </div>
      )}

      {receipt ? (
        <div className={styles.receiptCard} role="status" aria-live="polite">
          <h3>✓ Message Received</h3>
          <p>
            Your message has been recorded for review. This receipt confirms it was received; email delivery follows separately.
          </p>
          <p>
            Receipt Identifier: <span className={styles.receiptId}>{receipt.id}</span>
          </p>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => setReceipt(null)}
            style={{ marginTop: "12px" }}
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate={false}>
          {/* Honeypot field for bot suppression */}
          <div className={styles.honeypot} aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="contact-name" className={styles.label}>
              Your Name *
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              disabled={isSubmitting}
            />
            <div className={styles.hint}>Between 2 and 100 characters.</div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="contact-email" className={styles.label}>
              Email Address *
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              maxLength={254}
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@example.com"
              disabled={isSubmitting}
            />
            <div className={styles.hint}>Used only to respond directly to your inquiry.</div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="contact-message" className={styles.label}>
              Message *
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              minLength={20}
              maxLength={4000}
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your project, role opportunity, or question..."
              disabled={isSubmitting}
            />
            <div className={styles.hint}>
              {message.length}/4000 characters (minimum 20 characters).
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || name.trim().length < 2 || message.trim().length < 20}
          >
            {isSubmitting ? "Sending Message..." : "Send Message"}
          </button>
        </form>
      )}
    </div>
  );
}
