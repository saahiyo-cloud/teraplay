import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables from .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BASE_PUBLIC = "https://www.terabox.com";
const BASE_API    = "https://dm.1024terabox.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const ROOT_PATH = "/cloudvids";

// Environment variables with hardcoded fallbacks
let JSTOKEN   = process.env.TERABOX_JSTOKEN || "5D29BC1A0FACF3CEB3FD732DA7D673A0FD8AED8B4523E154A3C81F3703E40D5447EFC35BD4572A1A6364FD87651714FD6421FCD4C698998BEFFA5A318A8A07B2";
let BDSTOKEN  = process.env.TERABOX_BDSTOKEN || "dc0d479a8da1268439f4ef3c78000af2";
const SIGN      = process.env.TERABOX_SIGN || "BLhPnIgjr3XPA0yBJBbzPiJoxt2HPLGx4xzdkuc4DpwkO4p00xrA6Q%3D%3D";
const TIMESTAMP = process.env.TERABOX_TIMESTAMP || "1781211335";
const LOGID     = process.env.TERABOX_LOGID || "91617900647418900040";
const COOKIE    = process.env.TERABOX_COOKIE || "ndus=YdPTAX9peHuiF8hccqWybi55eQ8PxkBA39HlfmXM; PANWEB=1";
const API_KEY   = process.env.API_KEY || "supercloudkey";

const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL || "60", 10);
const CACHE_MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES || "256", 10);
const RATE_LIMIT_RPM    = parseInt(process.env.RATE_LIMIT_RPM || "30", 10);
const RATE_LIMIT_WINDOW = 60 * 1000; // 60s in ms

const startTime = Date.now();

// ─── custom session fetcher ──────────────────────────────────────────
async function fetchWithSession(url, options = {}) {
  const headers = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.8",
    "Referer": `${BASE_API}/main?category=all&path=%2F`,
    "X-Requested-With": "XMLHttpRequest",
    "Cookie": COOKIE,
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

// ─── Cache & Limiter Classes ─────────────────────────────────────────
class ResponseCache {
  constructor(maxEntries = 256, ttlSeconds = 60) {
    this.store = new Map();
    this.max = maxEntries;
    this.ttl = ttlSeconds * 1000;
    this.hits = 0;
    this.misses = 0;
  }

  makeKey(link, action, wait) {
    const raw = `${link}|${action}|${wait}`;
    return crypto.createHash("md5").update(raw).digest("hex");
  }

  get(link, action, wait) {
    const key = this.makeKey(link, action, wait);
    if (this.store.has(key)) {
      const entry = this.store.get(key);
      if (Date.now() - entry.ts < this.ttl) {
        this.store.delete(key);
        this.store.set(key, entry); // Move to end (LRU)
        this.hits++;
        return entry.response;
      } else {
        this.store.delete(key);
      }
    }
    this.misses++;
    return null;
  }

  put(link, action, wait, response) {
    const key = this.makeKey(link, action, wait);
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, { response, ts: Date.now() });
    
    if (this.store.size > this.max) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      entries: this.store.size,
      max_entries: this.max,
      ttl_seconds: this.ttl / 1000,
      hits: this.hits,
      misses: this.misses,
      hit_rate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : "N/A"
    };
  }
}

class RateLimiter {
  constructor(maxRequests = 30, windowMs = 60000) {
    this.requests = new Map();
    this.max = maxRequests;
    this.window = windowMs;
    this.totalBlocked = 0;
  }

  isAllowed(ip) {
    const now = Date.now();
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }
    
    let tsList = this.requests.get(ip);
    tsList = tsList.filter(ts => now - ts < this.window);
    this.requests.set(ip, tsList);

    if (tsList.length >= this.max) {
      this.totalBlocked++;
      return false;
    }

    tsList.push(now);
    return true;
  }

  remaining(ip) {
    const now = Date.now();
    if (!this.requests.has(ip)) {
      return this.max;
    }
    const tsList = this.requests.get(ip).filter(ts => now - ts < this.window);
    return Math.max(0, this.max - tsList.length);
  }

  stats() {
    const now = Date.now();
    let activeClients = 0;
    for (const tsList of this.requests.values()) {
      if (tsList.some(ts => now - ts < this.window)) {
        activeClients++;
      }
    }
    return {
      max_rpm: this.max,
      window_seconds: this.window / 1000,
      active_clients: activeClients,
      total_blocked: this.totalBlocked
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, tsList] of this.requests.entries()) {
      const active = tsList.filter(ts => now - ts < this.window);
      if (active.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, active);
      }
    }
  }
}

const cache = new ResponseCache(CACHE_MAX_ENTRIES, CACHE_TTL_SECONDS);
const rateLimiter = new RateLimiter(RATE_LIMIT_RPM, RATE_LIMIT_WINDOW);

// Periodic cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

// ─── HMAC Signature & Auth Helpers ─────────────────────────────────────
function generateSignature(param1, param2, param3 = "") {
  const secret = API_KEY || "supercloudkey";
  const message = `${param1}|${param2}|${param3}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function verifySignature(param1, param2, param3, signature) {
  if (!signature) return false;
  const expected = generateSignature(param1, param2, param3);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (e) {
    return expected === signature;
  }
}

function checkAuth(req) {
  const expectedKey = API_KEY || "supercloudkey";
  let clientKey = req.headers["x-api-key"];
  
  if (!clientKey) {
    const authHeader = req.headers["authorization"] || "";
    if (authHeader.startsWith("Bearer ")) {
      clientKey = authHeader.slice(7).trim();
    }
  }
  
  if (!clientKey) {
    clientKey = req.query.key || req.query.api_key;
  }
  
  if (!clientKey && req.body) {
    clientKey = req.body.key || req.body.api_key;
  }
  
  return clientKey === expectedKey || clientKey === "supercloudkey";
}

function qp() {
  return `app_id=250528&web=1&channel=dubox&clienttype=0&jsToken=${JSTOKEN}&dp-logid=${LOGID}`;
}

function parseSurl(url) {
  let surl = "";
  if (url.includes("surl=")) {
    surl = url.split("surl=")[1].split("&")[0];
  } else if (url.includes("/s/")) {
    surl = url.split("/s/")[1].split("?")[0];
  } else {
    surl = url;
  }
  surl = surl.split("/").pop();
  while (surl.length > 22 && surl.startsWith("1")) {
    surl = surl.slice(1);
  }
  return surl;
}

// ─── Resolution Logic ────────────────────────────────────────────────
async function resolveLink(link, action = "d", waitForTranscoding = false, streamType = null) {
  try {
    const rMain = await fetchWithSession(`${BASE_API}/main`);
    const text = await rMain.text();
    
    const m1 = text.match(/bdstoken["']?\s*[:=]\s*["']([a-f0-9]{32})["']/i);
    if (m1) {
      BDSTOKEN = m1[1];
    } else {
      const m2 = text.match(/bdstoken\s*=\s*["']([a-f0-9]{32})["']/);
      if (m2) {
        BDSTOKEN = m2[1];
      }
    }

    const m3 = text.match(/jstoken["']?\s*[:=]\s*["'](.*?)["']/i);
    if (m3) {
      const decodedJs = decodeURIComponent(m3[1]);
      const argMatch = decodedJs.match(/fn\s*\(\s*["']([a-f0-9]{128})["']\s*\)/i);
      if (argMatch) {
        JSTOKEN = argMatch[1];
      }
    }
  } catch (e) {
    return { errno: -1, error: `Failed to resolve session tokens: ${e.message}` };
  }

  const surl = parseSurl(link);
  const listUrl = `${BASE_PUBLIC}/share/list?app_id=250528&shorturl=${surl}&root=1&order=name&desc=0&showempty=0&web=1&page=1&num=100`;
  
  let shareData;
  try {
    const r = await fetchWithSession(listUrl);
    shareData = await r.json();
  } catch (e) {
    return { errno: -2, error: `Failed to query share list: ${e.message}` };
  }

  if (shareData.errno !== 0) {
    return { errno: shareData.errno, error: "Share link is invalid or expired." };
  }

  const title = shareData.title || "Untitled Shared Content";
  const share_id = shareData.share_id;
  const uk = shareData.uk;
  const filesList = shareData.list || [];

  const existingFiles = {};
  if (action !== "l") {
    const encodedDir = encodeURIComponent(ROOT_PATH);
    try {
      const listRes = await fetchWithSession(`${BASE_API}/api/list?${qp()}&dir=${encodedDir}&order=time&desc=1&showempty=0&page=1&num=100&bdstoken=${BDSTOKEN}`).then(r => r.json());
      if (listRes.errno === 0) {
        for (const entry of (listRes.list || [])) {
          const name = entry.server_filename;
          existingFiles[name] = {
            fs_id: String(entry.fs_id || ""),
            path: entry.path || "",
            size: Number(entry.size || 0)
          };
        }
      }
    } catch (e) {}
  }

  const results = [];
  for (const item of filesList) {
    let filename = item.server_filename;
    const fs_id = item.fs_id;
    const size_bytes = Number(item.size || 0);
    const size_mb = size_bytes / 1024 / 1024;

    const fileRes = {
      filename,
      size_bytes,
      size_mb: Math.round(size_mb * 100) / 100,
      original_fs_id: fs_id,
      fs_id: action === "l" ? fs_id : null,
      transfer_status: action === "l" ? "not_transferred" : "skipped_existing",
      dlink: null,
      stream_ready: false,
      stream_m3u8: null,
      error: null,
      thumbnails: item.thumbs,
      path: item.path,
      is_directory: Boolean(item.isdir)
    };

    if (action === "l") {
      results.push(fileRes);
      continue;
    }

    let myFsId = "";
    let myFilePath = "";

    if (existingFiles[filename] && existingFiles[filename].size === size_bytes) {
      myFsId = existingFiles[filename].fs_id;
      myFilePath = existingFiles[filename].path;
    } else {
      // Step A: Transfer
      const transferPayload = new URLSearchParams({
        fsidlist: `[${fs_id}]`,
        path: ROOT_PATH,
        shareid: String(share_id),
        from: String(uk),
        ondup: "newcopy",
        bdstoken: BDSTOKEN
      });

      try {
        const tr = await fetchWithSession(`${BASE_API}/share/transfer?${qp()}&bdstoken=${BDSTOKEN}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: transferPayload.toString()
        });
        const transferRes = await tr.json();
        
        if (transferRes.errno !== 0 && transferRes.errno !== 4) {
          fileRes.error = `Transfer failed with Terabox errno ${transferRes.errno}`;
          fileRes.transfer_status = "failed";
          results.push(fileRes);
          continue;
        }

        fileRes.transfer_status = "success";
        
        const extraList = transferRes.extra?.list || [];
        if (extraList.length > 0) {
          myFsId = String(extraList[0].to_fs_id || "");
          const destPath = extraList[0].to || "";
          if (myFsId && destPath) {
            filename = destPath.split("/").pop();
            myFilePath = destPath;
          }
        }
      } catch (e) {
        fileRes.error = `Transfer API request failed: ${e.message}`;
        fileRes.transfer_status = "failed";
        results.push(fileRes);
        continue;
      }

      if (!myFsId) {
        try {
          const encodedDir = encodeURIComponent(ROOT_PATH);
          const listRes = await fetchWithSession(`${BASE_API}/api/list?${qp()}&dir=${encodedDir}&order=time&desc=1&showempty=0&page=1&num=20&bdstoken=${BDSTOKEN}`).then(r => r.json());
          for (const entry of (listRes.list || [])) {
            const entryName = entry.server_filename || "";
            if (filename.includes(entryName) || entryName.includes(filename)) {
              myFsId = String(entry.fs_id || "");
              filename = entryName;
              myFilePath = entry.path || "";
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (!myFsId) {
      fileRes.error = "Could not resolve transferred file ID in account.";
      results.push(fileRes);
      continue;
    }

    fileRes.fs_id = myFsId;
    fileRes.filename = filename;

    // --- ACTION HLS STREAMING ---
    if (action === "s") {
      if (!myFilePath) {
        myFilePath = ROOT_PATH.replace(/\/$/, "") + "/" + filename;
      }
      const encodedPath = encodeURIComponent(myFilePath);
      
      const streamTypes = ["M3U8_AUTO_720", "M3U8_AUTO_480", "M3U8_AUTO_360"];
      fileRes.streams = {};

      const _tryStream = async (stype) => {
        const streamUrl = `${BASE_API}/api/streaming?${qp()}&path=${encodedPath}&type=${stype}&bdstoken=${BDSTOKEN}`;
        try {
          const sr = await fetchWithSession(streamUrl);
          const srText = await sr.text();
          if (sr.status === 200 && srText.includes("#EXTM3U")) {
            return { ok: true, errno: 0, text: srText };
          }
          let errCode = null;
          try {
            const resJson = JSON.parse(srText);
            errCode = resJson.errno;
          } catch (e) {}
          return { ok: false, errno: errCode, text: srText.slice(0, 200) };
        } catch (e) {
          return { ok: false, errno: -1, text: e.message };
        }
      };

      if (streamType) {
        // Only try the requested stream type
        const maxRetries = waitForTranscoding ? 6 : 1;
        const retryDelay = 10000;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const res = await _tryStream(streamType);
          if (res.ok) {
            fileRes.stream_ready = true;
            fileRes.stream_m3u8 = res.text;
            fileRes.streams[streamType] = res.text;
            break;
          }
          if (res.errno === 130) {
            fileRes.error = "transcoding_in_progress";
            if (waitForTranscoding && attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
              break;
            }
          } else {
            fileRes.error = `Streaming API failed: ${res.text}`;
            break;
          }
        }
      } else {
        // PASS 1: Quick scan — try each resolution once to find any that's ready
        let bestM3u8 = null;
        let allTranscoding = true;
        let fatalError = null;

        for (const stype of streamTypes) {
          const res = await _tryStream(stype);
          if (res.ok) {
            fileRes.streams[stype] = res.text;
            if (!bestM3u8) {
              bestM3u8 = { type: stype, text: res.text };
            }
            allTranscoding = false;
          } else if (res.errno === 130) {
            continue;
          } else if (res.errno === 31066 || res.errno === 31341 || res.errno === 31023) {
            fatalError = `Streaming error (errno ${res.errno})`;
            allTranscoding = false;
            break;
          } else {
            allTranscoding = false;
            fileRes.error = `Streaming API failed (errno ${res.errno}): ${res.text}`;
          }
        }

        if (bestM3u8) {
          fileRes.stream_ready = true;
          fileRes.stream_m3u8 = bestM3u8.text;
          fileRes.error = null;
        } else if (fatalError) {
          fileRes.error = fatalError;
        } else if (allTranscoding && waitForTranscoding) {
          // PASS 2: Wait & retry
          const maxRetries = 12;
          const retryDelay = 10000;
          console.log(`⏳ All resolutions transcoding, waiting...`);
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            for (const stype of streamTypes) {
              const res = await _tryStream(stype);
              if (res.ok) {
                fileRes.streams[stype] = res.text;
                if (!fileRes.stream_ready) {
                  fileRes.stream_ready = true;
                  fileRes.stream_m3u8 = res.text;
                  fileRes.error = null;
                }
              }
            }
            if (fileRes.stream_ready) {
              break;
            }
          }
          if (!fileRes.stream_ready) {
            fileRes.error = "transcoding_in_progress";
          }
        } else if (allTranscoding) {
          fileRes.error = "transcoding_in_progress";
        }
      }
    }
    // --- ACTION DOWNLOAD ---
    else if (action === "d") {
      const metasUrl = `${BASE_API}/api/filemetas?${qp()}&fsids=["${myFsId}"]&dlink=1&thumb=0&bdstoken=${BDSTOKEN}`;
      try {
        const mr = await fetchWithSession(metasUrl);
        const metasRes = await mr.json();
        let dlink = "";
        const list = metasRes.list || metasRes.info || [];
        for (const entry of list) {
          dlink = entry.dlink || "";
          if (dlink) break;
        }
        if (dlink) {
          fileRes.dlink = dlink;
        } else {
          fileRes.error = "Failed to resolve direct download link (dlink) from filemetas.";
        }
      } catch (e) {
        fileRes.error = `filemetas query failed: ${e.message}`;
      }
    }

    results.push(fileRes);
  }

  return {
    errno: 0,
    title,
    share_id,
    uk,
    files: results
  };
}

// ─── API Routes ──────────────────────────────────────────────────────
app.get("/", (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    status: "online",
    message: "TeraBridge API is running!",
    version: "2.0.0",
    uptime_seconds: uptime,
    endpoints: {
      "/api/resolve": "Resolve share links. Params: url (required), mode [download|stream|list] (optional)",
      "/api/stats": "View cache, rate limiter, and server statistics"
    }
  });
});

app.get("/api/stats", (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ status: "error", message: "Unauthorized: Invalid or missing API key." });
  }
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    status: "online",
    uptime_seconds: uptime,
    cache: cache.stats(),
    rate_limiter: rateLimiter.stats()
  });
});

app.all("/api/resolve", async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ status: "error", message: "Unauthorized: Invalid or missing API key." });
  }

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const ip = clientIp.split(",")[0].trim();

  if (!rateLimiter.isAllowed(ip)) {
    const remaining = rateLimiter.remaining(ip);
    res.setHeader("Retry-After", "60");
    res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_RPM));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    return res.status(429).json({
      status: "error",
      message: `Rate limit exceeded. Max ${RATE_LIMIT_RPM} requests per minute. Try again shortly.`
    });
  }

  let link = "";
  let action = "d";
  let waitForTranscoding = false;

  if (req.method === "POST") {
    link = req.body.url || req.body.link || "";
    action = req.body.mode || req.body.action || "d";
    waitForTranscoding = Boolean(req.body.wait);
  } else {
    link = req.query.url || req.query.link || "";
    action = req.query.mode || req.query.action || "d";
    waitForTranscoding = req.query.wait === "true" || req.query.wait === "1";
  }

  if (!link) {
    return res.status(400).json({
      status: "error",
      message: "Missing required parameter 'url' or 'link'."
    });
  }

  link = link.replace(/[\s\u200b\u200c\u200d\ufeff\u202a\u202b\u202c\u202d\u202e]+/g, "");

  const actLower = action.toLowerCase();
  if (actLower === "s" || actLower === "stream" || actLower === "streaming") {
    action = "s";
  } else if (actLower === "l" || actLower === "list" || actLower === "info" || actLower === "metadata") {
    action = "l";
  } else {
    action = "d";
  }

  const cached = cache.get(link, action, waitForTranscoding);
  if (cached !== null) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("X-RateLimit-Remaining", String(rateLimiter.remaining(ip)));
    return res.json(cached);
  }

  try {
    const result = await resolveLink(link, action, waitForTranscoding);
    if (result.errno !== 0) {
      return res.status(400).json({
        status: "error",
        message: result.error || "Unknown resolution error occurred."
      });
    }

    const isTranscoding = result.files.some(f => f.error === "transcoding_in_progress");
    const responseData = {
      status: isTranscoding ? "transcoding" : "success",
      title: result.title,
      share_id: result.share_id,
      uk: result.uk,
      files: []
    };

    const surl = parseSurl(link);
    const host = `${req.protocol}://${req.get("host")}`;

    for (const f of result.files) {
      const originalFsId = f.original_fs_id;
      const rawThumbs = f.thumbnails;
      const proxiedThumbs = {};
      if (rawThumbs && typeof rawThumbs === "object") {
        for (const [k, v] of Object.entries(rawThumbs)) {
          if (v) {
            if (originalFsId && surl) {
              const sig = generateSignature(surl, originalFsId, k);
              proxiedThumbs[k] = `${host}/api/thumbnail?surl=${surl}&fs_id=${originalFsId}&size_type=${k}&sig=${sig}`;
            } else {
              let urlParam = `${host}/api/thumbnail?url=${encodeURIComponent(v)}`;
              if (API_KEY) {
                urlParam += `&key=${API_KEY}`;
              }
              proxiedThumbs[k] = urlParam;
            }
          }
        }
      }

      let proxyDlink = f.dlink;
      if (f.dlink && originalFsId && surl) {
        const sig = generateSignature(surl, originalFsId, "");
        proxyDlink = `${host}/api/download?surl=${surl}&fs_id=${originalFsId}&sig=${sig}`;
      }

      const fileInfo = {
        filename: f.filename,
        size_bytes: f.size_bytes,
        size_mb: f.size_mb,
        fs_id: f.fs_id,
        transfer_status: f.transfer_status,
        dlink: proxyDlink,
        stream_ready: f.stream_ready,
        error: f.error,
        thumbnails: Object.keys(proxiedThumbs).length > 0 ? proxiedThumbs : null,
        path: f.path,
        is_directory: f.is_directory
      };

      if (f.stream_ready) {
        fileInfo.stream_m3u8 = f.stream_m3u8;
        fileInfo.streams = f.streams;
      }
      responseData.files.push(fileInfo);
    }

    if (!isTranscoding) {
      cache.put(link, action, waitForTranscoding, responseData);
    }

    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-RateLimit-Remaining", String(rateLimiter.remaining(ip)));
    return res.json(responseData);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      status: "error",
      message: `Server encountered exception: ${e.message}`
    });
  }
});

app.get(["/api/stream/manifest", "/api/stream/playlist.m3u8"], async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ status: "error", message: "Unauthorized: Invalid or missing API key." });
  }

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const ip = clientIp.split(",")[0].trim();
  if (!rateLimiter.isAllowed(ip)) {
    return res.status(429).json({ status: "error", message: "Rate limit exceeded. Try again shortly." });
  }

  const link = req.query.url || req.query.link || "";
  const waitForTranscoding = req.query.wait === "true" || req.query.wait === "1";
  const streamType = req.query.type || null;
  let fileIndex = parseInt(req.query.index || "0", 10);
  if (isNaN(fileIndex)) fileIndex = 0;

  if (!link) {
    return res.status(400).json({ status: "error", message: "Missing required parameter 'url' or 'link'." });
  }

  try {
    const result = await resolveLink(link, "s", waitForTranscoding, streamType);
    if (result.errno !== 0) {
      return res.status(400).json({ status: "error", message: result.error || "Unknown resolution error occurred." });
    }

    const files = result.files || [];
    const streamableFiles = files.filter(f => f.stream_ready);

    if (streamableFiles.length === 0) {
      const isTranscoding = files.some(f => f.error === "transcoding_in_progress");
      if (isTranscoding) {
        return res.status(202).json({
          status: "transcoding",
          message: "HLS streaming manifest is currently transcoding. Please try again shortly."
        });
      }
      return res.status(404).json({ status: "error", message: "No streamable video files found in this share link." });
    }

    if (fileIndex < 0 || fileIndex >= streamableFiles.length) {
      fileIndex = 0;
    }

    const targetFile = streamableFiles[fileIndex];

    // If no type is requested, return a master playlist referencing the available stream resolutions.
    if (!streamType) {
      const host = `${req.protocol}://${req.get("host")}`;
      const urlEscaped = encodeURIComponent(link);
      const keyParam = req.query.key || req.query.api_key || "supercloudkey";

      const resMeta = [
        { type: "M3U8_AUTO_720", bandwidth: 2800000, resolution: "1280x720", name: "720p" },
        { type: "M3U8_AUTO_480", bandwidth: 1400000, resolution: "854x480", name: "480p" },
        { type: "M3U8_AUTO_360", bandwidth: 800000, resolution: "640x360", name: "360p" }
      ];

      let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";
      let hasStreams = false;

      for (const meta of resMeta) {
        if (targetFile.streams && targetFile.streams[meta.type]) {
          const streamUrl = `${host}/api/stream/manifest?url=${urlEscaped}&index=${fileIndex}&type=${meta.type}&key=${keyParam}`;
          masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${meta.bandwidth},RESOLUTION=${meta.resolution},NAME="${meta.name}"\n${streamUrl}\n`;
          hasStreams = true;
        }
      }

      if (hasStreams) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.send(masterPlaylist);
      }
    }

    const rawM3u8 = targetFile.stream_m3u8 || "";

    if (!rawM3u8) {
      return res.status(500).json({ status: "error", message: "Stream manifest content is empty." });
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const lines = rawM3u8.split(/\r?\n/);
    const proxiedLines = lines.map(line => {
      const stripped = line.trim();
      if (stripped && !stripped.startsWith("#")) {
        const quotedUrl = encodeURIComponent(stripped);
        const sig = generateSignature(stripped, "", "");
        return `${host}/api/stream/segment?url=${quotedUrl}&sig=${sig}`;
      }
      return line;
    });

    const proxiedM3u8 = proxiedLines.join("\n");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(proxiedM3u8);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ status: "error", message: `Manifest proxy error: ${e.message}` });
  }
});

app.get("/api/stream/segment", async (req, res) => {
  const urlParam = req.query.url || "";
  const sig = req.query.sig || "";

  if (!urlParam) {
    return res.status(400).send("Missing segment URL");
  }

  const targetUrl = urlParam;

  if (!checkAuth(req) && !verifySignature(targetUrl, "", "", sig)) {
    return res.status(401).send("Unauthorized: Invalid signature or API key.");
  }

  try {
    const parsed = new URL(targetUrl);
    const domain = parsed.hostname.toLowerCase();
    const allowedSuffixes = [
      ".1024terabox.com",
      ".baidu.com",
      ".terabox.com",
      ".teraboxapp.com",
      "pcs.baidu.com",
      "d.pcs.1024terabox.com"
    ];
    const isAllowed = allowedSuffixes.some(suffix => domain === suffix || domain.endsWith(suffix));
    if (!isAllowed) {
      return res.status(403).send("Forbidden: Invalid stream host destination.");
    }
  } catch (e) {
    return res.status(400).send("Invalid segment URL format");
  }

  try {
    const headers = {
      "User-Agent": UA,
      "Referer": "https://dm.1024terabox.com/",
      "Cookie": COOKIE
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    const response = await fetch(targetUrl, {
      headers,
      signal: abortController.signal
    });

    res.status(response.status);
    
    const copyHeaders = ["content-length", "content-type", "content-range", "accept-ranges"];
    for (const h of copyHeaders) {
      const val = response.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (!response.body) return res.end();

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (e) {
    if (e.name === "AbortError") return;
    console.error("Segment proxy error:", e);
    return res.status(500).send(`Segment proxy encountered an error: ${e.message}`);
  }
});

app.get(["/api/thumbnail", "/api/stream/thumbnail"], async (req, res) => {
  const urlParam = req.query.url || "";
  const surl = req.query.surl || "";
  const fs_id = req.query.fs_id || "";
  const sizeType = req.query.size_type || req.query.size || "url3";
  const sig = req.query.sig || "";

  if (!urlParam && !(surl && fs_id)) {
    return res.status(400).send("Missing thumbnail URL or surl/fs_id parameters");
  }

  if (!urlParam) {
    if (!checkAuth(req) && !verifySignature(surl, fs_id, sizeType, sig)) {
      return res.status(401).send("Unauthorized: Invalid signature or API key.");
    }
  } else {
    if (!checkAuth(req)) {
      return res.status(401).send("Unauthorized: Invalid API key.");
    }
  }

  let targetUrl = "";
  if (urlParam) {
    targetUrl = urlParam;
  } else {
    const shareUrl = `https://1024terabox.com/s/${surl}`;
    let cachedRes = cache.get(shareUrl, "d", false) || cache.get(shareUrl, "l", false);
    if (!cachedRes) {
      try {
        cachedRes = await resolveLink(shareUrl, "l");
      } catch (e) {
        return res.status(500).send(`Failed to resolve share link metadata: ${e.message}`);
      }
    }

    let targetFile = null;
    const files = cachedRes.files || [];
    for (const f of files) {
      if (String(f.original_fs_id) === String(fs_id) || String(f.fs_id) === String(fs_id)) {
        targetFile = f;
        break;
      }
    }

    if (!targetFile) {
      return res.status(404).send("File not found in share link");
    }

    const thumbs = targetFile.thumbnails;
    if (!thumbs || typeof thumbs !== "object") {
      return res.status(404).send("No thumbnails available for this file");
    }

    targetUrl = thumbs[sizeType] || thumbs["url3"] || thumbs["original"] || Object.values(thumbs)[0];
    if (!targetUrl) {
      return res.status(404).send("No matching thumbnail URL found");
    }
  }

  try {
    const parsed = new URL(targetUrl);
    const domain = parsed.hostname.toLowerCase();
    const allowedSuffixes = [
      ".1024terabox.com",
      ".baidu.com",
      ".terabox.com",
      ".teraboxapp.com",
      "pcs.baidu.com",
      "d.pcs.1024terabox.com",
      "dm-data.terabox.com"
    ];
    const isAllowed = allowedSuffixes.some(suffix => domain === suffix || domain.endsWith(suffix));
    if (!isAllowed) {
      return res.status(403).send("Forbidden: Invalid stream host destination.");
    }
  } catch (e) {
    return res.status(400).send("Invalid thumbnail URL format");
  }

  try {
    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://dm.1024terabox.com/",
        "Cookie": COOKIE
      },
      signal: abortController.signal
    });

    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    const len = response.headers.get("content-length");
    if (len) res.setHeader("content-length", len);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (!response.body) return res.end();

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (e) {
    if (e.name === "AbortError") return;
    console.error("Thumbnail proxy error:", e);
    return res.status(500).send(`Thumbnail proxy encountered an error: ${e.message}`);
  }
});

app.get("/api/download", async (req, res) => {
  const surl = req.query.surl || "";
  const fs_id = req.query.fs_id || "";
  const sig = req.query.sig || "";

  if (!surl || !fs_id) {
    return res.status(400).send("Missing required parameters: surl and fs_id");
  }

  if (!checkAuth(req) && !verifySignature(surl, fs_id, "", sig)) {
    return res.status(401).send("Unauthorized: Invalid signature or API key.");
  }

  const shareUrl = `https://1024terabox.com/s/${surl}`;
  let cachedRes = cache.get(shareUrl, "d", false);
  if (!cachedRes) {
    try {
      cachedRes = await resolveLink(shareUrl, "d");
      if (cachedRes.errno === 0) {
        const isTranscoding = cachedRes.files.some(f => f.error === "transcoding_in_progress");
        if (!isTranscoding) {
          cache.put(shareUrl, "d", false, cachedRes);
        }
      }
    } catch (e) {
      return res.status(500).send(`Failed to resolve download details: ${e.message}`);
    }
  }

  if (cachedRes.errno !== 0) {
    return res.status(400).send(`Failed to resolve share link: ${cachedRes.error || "Unknown error"}`);
  }

  let targetFile = null;
  for (const f of (cachedRes.files || [])) {
    if (String(f.original_fs_id) === String(fs_id) || String(f.fs_id) === String(fs_id)) {
      targetFile = f;
      break;
    }
  }

  if (!targetFile) {
    return res.status(404).send("File not found in share link");
  }

  if (targetFile.error) {
    return res.status(400).send(`File resolution error: ${targetFile.error}`);
  }

  const dlink = targetFile.dlink;
  const filename = targetFile.filename || "download";

  if (!dlink) {
    return res.status(404).send("Download link not available for this file");
  }

  try {
    const headers = {
      "User-Agent": UA,
      "Referer": "https://dm.1024terabox.com/",
      "Cookie": COOKIE
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    const response = await fetch(dlink, {
      headers,
      signal: abortController.signal
    });

    res.status(response.status);

    const copyHeaders = ["content-length", "content-type", "content-range", "accept-ranges"];
    for (const h of copyHeaders) {
      const val = response.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    }

    if (!res.getHeader("content-type")) {
      res.setHeader("content-type", "application/octet-stream");
    }

    const quotedFilename = encodeURIComponent(filename);
    res.setHeader("content-disposition", `attachment; filename*=UTF-8''${quotedFilename}`);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (!response.body) return res.end();

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (e) {
    if (e.name === "AbortError") return;
    console.error("Download proxy error:", e);
    return res.status(500).send(`Download proxy encountered an error: ${e.message}`);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[TeraBridge] Express server listening on 0.0.0.0:${PORT}`);
  console.log(`[TeraBridge] Cache TTL: ${CACHE_TTL_SECONDS}s | Rate limit: ${RATE_LIMIT_RPM} req/min`);
});
