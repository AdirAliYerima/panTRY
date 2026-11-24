import { motion } from "motion/react";
import { ArrowLeft, Copy, Check, Send, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import type { Meal } from "@/lib/types";

export function GroceryList({
  meal,
  haveSet,
  onBack,
}: {
  meal: Meal;
  haveSet: Set<string>;
  onBack: () => void;
}) {
  const need = meal.ingredients.filter((i) => !haveSet.has(i.name));
  const grouped = need.reduce<Record<string, typeof need>>((acc, i) => {
    (acc[i.category] ||= []).push(i);
    return acc;
  }, {});
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<null | { ok: boolean; msg: string }>(null);

  const messageText = useMemo(() => {
    const body = Object.entries(grouped)
      .map(
        ([cat, items]) =>
          `${cat.toUpperCase()}\n${items.map((i) => `\u2022 ${i.quantity} ${i.name}`).join("\n")}`,
      )
      .join("\n\n");
    return `\ud83d\uded2 Grocery to get \u2014 ${meal.name}\n\n${body}`;
  }, [grouped, meal.name]);

  const copyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendSms = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setSendStatus({ ok: false, msg: "Enter your phone number first." });
      return;
    }
    setSending(true);
    setSendStatus(null);
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed, message: messageText }),
      });
      const data = (await res.json()) as { sent: boolean; fallback?: string; error?: string };
      if (data.sent) {
        setSendStatus({ ok: true, msg: `Sent to ${trimmed}.` });
      } else if (data.fallback) {
        // Open native SMS composer as a graceful fallback.
        window.location.href = data.fallback;
        setSendStatus({ ok: true, msg: "Opening your messages app\u2026" });
      } else {
        setSendStatus({ ok: false, msg: data.error ?? "Couldn't send. Try copying instead." });
      }
    } catch {
      // Network-level failure: open native SMS as last resort.
      const smsHref = `sms:${encodeURIComponent(trimmed)}?&body=${encodeURIComponent(messageText)}`;
      window.location.href = smsHref;
      setSendStatus({ ok: true, msg: "Opening your messages app\u2026" });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl px-6"
    >
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="glass rounded-3xl p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--amber)" }}>
              Grocery to get
            </p>
            <h2 className="mt-1 font-display text-4xl">{meal.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {need.length} item{need.length === 1 ? "" : "s"} to buy
            </p>
          </div>
          <button
            onClick={copyText}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:border-amber/60"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {need.length === 0 ? (
          <p className="mt-8 text-muted-foreground">You already have everything. Time to cook!</p>
        ) : (
          <>
            <div className="mt-8 space-y-6">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="font-display text-xl" style={{ color: "var(--amber)" }}>{cat}</h3>
                  <ul className="mt-2 divide-y divide-border/40">
                    {items.map((i) => (
                      <li key={i.name} className="flex items-center justify-between py-2.5">
                        <span>
                          <span className="font-medium">{i.name}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{i.quantity}</span>
                        </span>
                        <span className="text-sm text-muted-foreground">{i.estimatedCost}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* SMS send block */}
            <div
              className="mt-8 rounded-2xl border p-5"
              style={{
                borderColor: "color-mix(in oklab, var(--amber) 30%, transparent)",
                background: "color-mix(in oklab, var(--amber) 6%, transparent)",
              }}
            >
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--amber)" }}>
                Send to your phone
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="+1 555 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-full border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber"
                    style={{ borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)" }}
                  />
                </div>
                <button
                  onClick={sendSms}
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-60"
                  style={{ background: "var(--tomato)" }}
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending\u2026" : "Send list"}
                </button>
              </div>
              {sendStatus && (
                <p
                  className="mt-3 text-xs"
                  style={{ color: sendStatus.ok ? "var(--amber)" : "var(--tomato)" }}
                >
                  {sendStatus.msg}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
