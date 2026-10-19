/**
 * 🎮 DaLines-Site Cloudflare Worker API & Static Asset Handler
 * Handles /api/valorant endpoint for real-time streamer rank & match sync,
 * while serving static assets (HTML, images, audio) for all other routes.
 */

// In-memory cache for live synced data
let liveValorantCache = {
  riotId: "DaLines#TTV",
  region: "ap",
  currentTier: "Diamond 1",
  tierColor: "#a855f7",
  currentRR: 31,
  peakRank: "Immortal 1 34RR (Ep 7: Act III)",
  streak: "🔥 11W - 9L (55%)",
  stats: {
    kd: "1.08",
    hs: "26.4%",
    winrate: "55.0%",
    acs: "218.5",
    adr: "148.0",
    kpr: "0.78",
    firstBloods: "48",
    clutchRate: "16.5%"
  },
  agents: [
    { name: "Sova", role: "Initiator", pickRate: "769 hrs", kd: "1.03", winRate: "53%", initial: "S", color: "sky" },
    { name: "Jett", role: "Duelist", pickRate: "399 hrs", kd: "1.15", winRate: "52%", initial: "J", color: "cyan" },
    { name: "Killjoy", role: "Sentinel", pickRate: "308 hrs", kd: "1.10", winRate: "54%", initial: "K", color: "amber" }
  ],
  recentMatches: [
    { map: "5h ago", result: "VICTORY", score: "13 - 11", agent: "Sova", role: "Initiator", kda: "KD 1.8", kd: "1.80", acs: 235, rrChange: "+19", mvp: false },
    { map: "6h ago", result: "DEFEAT", score: "10 - 13", agent: "Sova", role: "Initiator", kda: "KD 1.2", kd: "1.20", acs: 215, rrChange: "-14", mvp: false },
    { map: "7h ago", result: "VICTORY", score: "13 - 8", agent: "Sova", role: "Initiator", kda: "KD 0.7", kd: "0.70", acs: 180, rrChange: "+18", mvp: false },
    { map: "7h ago", result: "VICTORY", score: "13 - 3", agent: "Sova", role: "Initiator", kda: "KD 1.7", kd: "1.70", acs: 260, rrChange: "+24", mvp: true },
    { map: "11h ago", result: "DEFEAT", score: "2 - 13", agent: "Chamber", role: "Sentinel", kda: "KD 1.1", kd: "1.10", acs: 195, rrChange: "-16", mvp: false }
  ],
  lastUpdated: Date.now(),
  source: "Official DaLines In-Game Direct Sync"
};

let lastKyrosSyncTime = 0;

async function syncFromKyroskoh() {
  const now = Date.now();
  // Rate-limit upstream calls to once every 2 minutes
  if (now - lastKyrosSyncTime < 120000) {
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://api.kyroskoh.xyz/valorant/v1/mmr/ap/DaLines/TTV?show=all&display=0', {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const text = (await res.text()).trim();
      const match = text.match(/^([A-Za-z0-9 ]+?)\s*-\s*(\d+)\s*RR/i);
      if (match) {
        liveValorantCache.currentTier = match[1].trim();
        liveValorantCache.currentRR = parseInt(match[2], 10);
        liveValorantCache.lastUpdated = now;
        liveValorantCache.source = "Kyroskoh Live MMR Sync";
        lastKyrosSyncTime = now;
      }
    }
  } catch (err) {
    // Upstream fallback without interrupting response
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 2. Direct Valorant API Route (/api/valorant or /api/valorant-tracker)
    if (url.pathname === '/api/valorant' || url.pathname === '/api/valorant-tracker') {
      // GET: Retrieve latest player stats or search arbitrary player
      if (request.method === 'GET') {
        const searchName = url.searchParams.get('name');
        const searchTag = url.searchParams.get('tag');
        const searchRegion = (url.searchParams.get('region') || 'ap').toLowerCase();

        // 🔍 Arbitrary player search lookup
        if (searchName && searchTag) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const upstream = `https://api.kyroskoh.xyz/valorant/v1/mmr/${searchRegion}/${encodeURIComponent(searchName)}/${encodeURIComponent(searchTag)}?show=all&display=0`;
            const res = await fetch(upstream, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
              const text = (await res.text()).trim();
              const match = text.match(/^([A-Za-z0-9 ]+?)\s*-\s*(\d+)\s*RR(?:\s+MMR Elo:\s*(\d+))?/i);
              if (match) {
                return new Response(JSON.stringify({
                  status: 'success',
                  isPlayerLookup: true,
                  data: {
                    riotId: `${searchName}#${searchTag}`,
                    region: searchRegion,
                    currentTier: match[1].trim(),
                    currentRR: parseInt(match[2], 10),
                    elo: match[3] ? parseInt(match[3], 10) : null,
                    timestamp: Date.now()
                  }
                }), {
                  status: 200,
                  headers: {
                    ...CORS_HEADERS,
                    'Cache-Control': 'public, max-age=60'
                  }
                });
              } else {
                return new Response(JSON.stringify({
                  status: 'not_found',
                  message: 'ไม่พบข้อมูลแรงก์ หรือยังไม่ได้เล่นโหมด Competitive ใน Act ปัจจุบัน'
                }), {
                  status: 404,
                  headers: CORS_HEADERS
                });
              }
            } else {
              return new Response(JSON.stringify({
                status: 'error',
                message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ Valorant ได้ (Status: ' + res.status + ')'
              }), {
                status: res.status,
                headers: CORS_HEADERS
              });
            }
          } catch (err) {
            return new Response(JSON.stringify({
              status: 'error',
              message: 'ค้นหาไม่สำเร็จ: ' + err.message
            }), {
              status: 504,
              headers: CORS_HEADERS
            });
          }
        }

        // Default: DaLines Streamer Profile
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(syncFromKyroskoh());
        } else {
          await syncFromKyroskoh();
        }

        return new Response(JSON.stringify({
          status: 'success',
          data: liveValorantCache,
          serverTimestamp: Date.now()
        }), {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
          }
        });
      }

      // POST: Push live update from Streamer's PC local sync daemon
      if (request.method === 'POST') {
        const auth = request.headers.get('Authorization') || '';
        const expectedSecret = env.STREAMER_SECRET || 'dalines_live_val_sync_token_2026';

        if (auth !== `Bearer ${expectedSecret}`) {
          return new Response(JSON.stringify({
            status: 'error',
            message: 'Unauthorized: Invalid streamer sync token.'
          }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        try {
          const body = await request.json();
          if (body && typeof body === 'object') {
            // Merge updated fields into cache
            liveValorantCache = {
              ...liveValorantCache,
              ...body,
              stats: {
                ...liveValorantCache.stats,
                ...(body.stats || {})
              },
              lastUpdated: Date.now(),
              source: body.source || "Live In-Game PC Sync"
            };

            return new Response(JSON.stringify({
              status: 'success',
              message: 'Valorant live stats updated successfully!',
              lastUpdated: liveValorantCache.lastUpdated
            }), {
              status: 200,
              headers: CORS_HEADERS
            });
          }
        } catch (err) {
          return new Response(JSON.stringify({
            status: 'error',
            message: 'Invalid JSON payload: ' + err.message
          }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: CORS_HEADERS
      });
    }

    // 3. Fallback: Serve static assets for the website
    return env.ASSETS.fetch(request);
  }
};
