// Supabase Edge Function: collect-event-info
// MVP: fetches active public source pages and stores keyword-based candidates as pending.
// It never writes to public.schedules. Instagram pages may block automated access.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: "예매", keywords: ["예매", "티켓", "ticket", "booking", "reservation"] },
  { category: "주차", keywords: ["주차", "parking"] },
  { category: "교통", keywords: ["교통", "오시는 길", "대중교통", "transportation", "directions"] },
  { category: "셔틀", keywords: ["셔틀", "shuttle", "운행"] },
  { category: "입장", keywords: ["입장", "관객 입장", "입장시간", "입장 시간", "반입", "출입", "doors open"] },
  { category: "취소/변경", keywords: ["취소", "변경", "연기", "우천", "cancel", "postpon", "reschedule"] },
];

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function makeCandidates(text: string, url: string) {
  const lower = text.toLocaleLowerCase();
  const found: Array<{ category: string; title: string; content: string; source_url: string }> = [];
  for (const rule of CATEGORY_RULES) {
    const match = rule.keywords.find((keyword) => lower.includes(keyword.toLocaleLowerCase()));
    if (!match) continue;
    const at = lower.indexOf(match.toLocaleLowerCase());
    const start = Math.max(0, at - 180);
    const end = Math.min(text.length, at + 420);
    const snippet = text.slice(start, end).trim();
    if (!snippet) continue;
    found.push({
      category: rule.category,
      title: `공식 출처에서 감지된 ${rule.category} 관련 정보`,
      content: `자동 키워드 감지(확인 필요): ${snippet}`,
      source_url: url,
    });
  }
  return found;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST 요청만 지원합니다." }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "서버 환경변수 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const startedAt = new Date().toISOString();
  const { data: run, error: runInsertError } = await supabase
    .from("event_collection_runs")
    .insert({ status: "running" })
    .select("id")
    .single();

  if (runInsertError || !run) {
    return new Response(JSON.stringify({ error: "수집 실행 기록을 만들지 못했습니다.", details: runInsertError?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sourcesChecked = 0;
  let itemsFound = 0;
  const errors: string[] = [];
  const { data: sources, error: sourceError } = await supabase
    .from("event_info_sources")
    .select("id,schedule_id,source_name,source_url,source_type")
    .eq("is_active", true);

  if (sourceError) errors.push(`출처 조회 실패: ${sourceError.message}`);

  for (const source of sources ?? []) {
    sourcesChecked++;
    try {
      const response = await fetch(source.source_url, {
        method: "GET",
        headers: {
          "User-Agent": "YB-Schedule-Calendar-EventInfoBot/0.1 (+manual-review; contact site owner)",
          "Accept": "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        throw new Error(`지원하지 않는 콘텐츠 유형: ${contentType || "unknown"}`);
      }
      const html = await response.text();
      const text = cleanHtml(html).slice(0, 250000);
      if (text.length < 80) throw new Error("페이지에서 읽을 수 있는 텍스트가 너무 적습니다. JavaScript 렌더링 또는 접근 제한일 수 있습니다.");

      const candidates = makeCandidates(text, source.source_url);
      for (const candidate of candidates) {
        const { data: existing } = await supabase
          .from("event_info_items")
          .select("id")
          .eq("schedule_id", source.schedule_id)
          .eq("source_id", source.id)
          .eq("category", candidate.category)
          .eq("title", candidate.title)
          .eq("content", candidate.content)
          .limit(1);

        if (existing?.length) continue;
        const { error: insertError } = await supabase.from("event_info_items").insert({
          schedule_id: source.schedule_id,
          source_id: source.id,
          category: candidate.category,
          title: candidate.title,
          content: candidate.content,
          source_url: candidate.source_url,
          status: "pending",
        });
        if (insertError) throw new Error(`후보 저장 실패: ${insertError.message}`);
        itemsFound++;
      }

      await supabase.from("event_info_sources").update({ last_checked_at: new Date().toISOString() }).eq("id", source.id);
    } catch (error) {
      errors.push(`${source.source_name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const status = errors.length === 0 ? "success" : (sourcesChecked > 0 && itemsFound > 0 ? "partial" : "failed");
  await supabase.from("event_collection_runs").update({
    completed_at: new Date().toISOString(),
    status,
    sources_checked: sourcesChecked,
    items_found: itemsFound,
    error_summary: errors.length ? errors.join("\n").slice(0, 5000) : null,
  }).eq("id", run.id);

  return new Response(JSON.stringify({
    run_id: run.id,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    status,
    sources_checked: sourcesChecked,
    items_found: itemsFound,
    errors,
    note: "키워드 기반 후보 추출입니다. 내용의 정확성을 보장하지 않으며 모든 후보는 pending 검토 상태입니다. 일정 본문은 수정하지 않습니다.",
  }, null, 2), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
