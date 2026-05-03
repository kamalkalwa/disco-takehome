"use client";

import { useState } from "react";
import type { DraftCampaign } from "@/lib/schemas";

const SAMPLE_BRIEFS = [
  "We sell premium dog food for senior dogs, targeting owners who care about joint health and longevity. Grain-free, vet-formulated, subscription-based.",
  "A sustainable activewear brand for women. Made from recycled ocean plastic. Price point sits between Lululemon and Girlfriend Collective.",
  "Refillable, concentrated cleaning products. Skip the single-use plastic bottles. Works as well as the big brands.",
  "B2B SaaS for dental practices. We automate their patient recall workflow.",
  "idk just try it",
];

export default function Home() {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftCampaign | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/draft-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setResult(data as DraftCampaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Campaign Drafter</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Describe your business in 1-2 sentences. We draft publishers, personas, ad creatives, and a campaign config.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="e.g. We sell premium dog food for senior dogs..."
          className="w-full rounded-md border border-neutral-300 bg-white p-3 text-sm font-sans focus:border-neutral-900 focus:outline-none"
          disabled={loading}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading || !brief.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {loading ? "Drafting…" : "Draft campaign"}
          </button>
          <span className="text-xs text-neutral-500">or try:</span>
          {SAMPLE_BRIEFS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setBrief(s)}
              disabled={loading}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:border-neutral-500"
              title={s}
            >
              {`Example ${i + 1}`}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-10 text-sm text-neutral-500">
          Planning publishers, picking personas, writing creatives in parallel… typically 10-25 seconds.
        </div>
      )}

      {result && <Results data={result} />}
    </main>
  );
}

function Results({ data }: { data: DraftCampaign }) {
  return (
    <div className="mt-10 space-y-10">
      <BriefSection data={data} />
      <PublishersSection data={data} />
      <PersonasAndCreativesSection data={data} />
      <CampaignSection data={data} />
      <Meta data={data} />
    </div>
  );
}

function BriefSection({ data }: { data: DraftCampaign }) {
  const conf = data.brief.confidence;
  const color =
    conf === "high" ? "bg-emerald-100 text-emerald-800" : conf === "medium" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return (
    <section>
      <SectionTitle>Brief understanding</SectionTitle>
      <p className="text-sm">{data.brief.normalized}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{conf} confidence</span>
        {data.brief.notes && <span className="text-xs text-neutral-600">{data.brief.notes}</span>}
      </div>
    </section>
  );
}

function PublishersSection({ data }: { data: DraftCampaign }) {
  return (
    <section>
      <SectionTitle>Publishers</SectionTitle>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Recommended</h3>
      <ul className="space-y-2">
        {data.publishers.recommended.map((p) => (
          <li key={p.publisher_id} className="rounded-md border border-neutral-200 bg-white p-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-medium">{p.publisher_name}</div>
              <div className="text-xs text-neutral-500">
                fit {p.fit_score}/100 · {p.publisher_id}
              </div>
            </div>
            <p className="mt-1 text-sm text-neutral-700">{p.reasoning}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Excluded (considered, not selected)
      </h3>
      <ul className="space-y-2">
        {data.publishers.excluded.map((p) => (
          <li key={p.publisher_id} className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-medium text-neutral-700">{p.publisher_name}</div>
              <div className="text-xs text-neutral-500">{p.publisher_id}</div>
            </div>
            <p className="mt-1 text-sm text-neutral-600">{p.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PersonasAndCreativesSection({ data }: { data: DraftCampaign }) {
  return (
    <section>
      <SectionTitle>Personas &amp; creatives</SectionTitle>
      <ul className="space-y-3">
        {data.creatives.map((c) => {
          const persona = data.personas.find((p) => p.persona_id === c.persona_id);
          return (
            <li key={c.persona_id} className="rounded-md border border-neutral-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-medium">{c.persona_name}</div>
                <div className="text-xs text-neutral-500">{c.persona_id}</div>
              </div>
              {persona && <p className="mt-1 text-xs text-neutral-600">Why chosen: {persona.why_chosen}</p>}
              <div className="mt-3 rounded border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-base font-semibold leading-snug">{c.headline}</div>
                <div className="mt-1 text-sm">{c.body}</div>
              </div>
              <p className="mt-2 text-xs italic text-neutral-500">Angle: {c.angle}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CampaignSection({ data }: { data: DraftCampaign }) {
  const c = data.campaign;
  return (
    <section>
      <SectionTitle>Campaign config</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Objective">
          <div className="text-sm">{c.objective}</div>
        </Card>
        <Card title="Budget">
          <div className="text-sm">
            ${c.budget.daily_usd.toLocaleString()} / day × {c.budget.flight_days} days
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            ${(c.budget.daily_usd * c.budget.flight_days).toLocaleString()} total
          </div>
        </Card>
        <Card title="Targeting">
          <Kv k="Age" v={c.targeting.age_range} />
          <Kv k="Gender skew" v={c.targeting.gender_skew} />
          <Kv k="Geos" v={c.targeting.geos.join(", ")} />
          <Kv k="Income" v={c.targeting.income_tiers.join(", ")} />
          <div className="mt-2 flex flex-wrap gap-1">
            {c.targeting.interest_tags.map((t) => (
              <span key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        </Card>
        <Card title="Bid strategy">
          <Kv k="Model" v={c.bid_strategy.pricing_model} />
          <Kv k="Range" v={`$${c.bid_strategy.bid_range_usd.min} - $${c.bid_strategy.bid_range_usd.max}`} />
          <Kv k="Pacing" v={c.bid_strategy.pacing} />
          <p className="mt-2 text-xs text-neutral-600">{c.bid_strategy.rationale}</p>
        </Card>
        <Card title="Measurement">
          <Kv k="Primary KPI" v={c.measurement.primary_kpi} />
          <Kv k="Expected AOV" v={`$${c.measurement.expected_aov_usd}`} />
        </Card>
        <Card title="Per-publisher allocation">
          <ul className="space-y-1">
            {c.budget.allocations.map((a) => (
              <li key={a.publisher_id} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{a.publisher_name}</span>
                  <span className="text-neutral-600">
                    {(a.pct * 100).toFixed(0)}% · ${a.daily_usd}/day
                  </span>
                </div>
                <div className="text-neutral-500">{a.rationale}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function Meta({ data }: { data: DraftCampaign }) {
  return (
    <p className="text-xs text-neutral-400">
      Generated in {(data.meta.duration_ms / 1000).toFixed(1)}s.
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 border-b border-neutral-200 pb-2 text-sm font-semibold uppercase tracking-wide text-neutral-700">{children}</h2>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</div>
      {children}
    </div>
  );
}
function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{k}</span>
      <span className="text-neutral-900">{v}</span>
    </div>
  );
}
