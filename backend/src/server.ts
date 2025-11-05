import express from "express";
import { Pool } from "pg";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createUserContent, GoogleGenAI } from "@google/genai";
import type { PartListUnion } from "@google/genai";

dotenv.config();

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
  DATABASE_URL,
} = process.env;

const isProduction = process.env.NODE_ENV === "production";

// In-memory token storage for personal use
let accessToken: string | null = null;
let tokenExpiry: number = 0;

const pool = new Pool({ connectionString: DATABASE_URL });

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
  throw new Error(
    "Missing Spotify env vars. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN.",
  );
}

// Helper to refresh access token using your personal refresh token
async function refreshAccessToken(): Promise<string> {
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", SPOTIFY_REFRESH_TOKEN!);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh token: ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return accessToken;
}

// Get a valid access token (refresh if expired)
async function getAccessToken(): Promise<string> {
  if (!accessToken || Date.now() >= tokenExpiry - 60000) {
    // Refresh if no token or expires in < 1 minute
    return await refreshAccessToken();
  }
  return accessToken;
}

const app = express();
app.use(
  cors({
    origin: isProduction
      ? "https://herb-sunday-player.grantcuster.com"
      : "http://127.0.0.1:4000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
const PORT = process.env.NODE_ENV === "production" ? 8005 : 4001;

app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
      // No cache for index html otherwhise there's gonna be problems loading the scripts
      if (path.indexOf("index.html") !== -1) {
        res.set("Cache-Control", "no-store");
      }
    },
  }),
);

app.get("/api/health", (_, res) => {
  res.json({ status: "OK", message: "Backend is live running!" });
});

app.get("/api/spotify/me/player/currently-playing", async (req, res) => {
  try {
    const access_token = await getAccessToken();
    const r = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    if (r.status === 204) {
      return res.status(204).end(); // nothing playing
    }

    if (!r.ok) {
      const text = await r.text();
      return res
        .status(r.status)
        .json({ error: "Spotify API error", detail: text });
    }

    const json = await r.json();
    res.status(r.status).json(json);
  } catch (err) {
    console.error("Error fetching currently playing:", err);
    return res.status(500).json({ error: "Failed to fetch currently playing" });
  }
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateContent({ prompt }: { prompt: string }) {
  const _contents: PartListUnion = [prompt];
  const response = await ai!.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent(_contents),
    config: {
      tools: [
        {
          googleSearch: {},
        },
      ],
    },
  });
  const text = response.candidates?.[0].content?.parts?.[0].text;
  return { text };
}

// Database helper functions for artist info cache
async function getCachedArtistInfo(
  artistName: string,
): Promise<string | null> {
  try {
    const result = await pool.query(
      "SELECT info_text FROM artist_info_cache WHERE LOWER(artist_name) = LOWER($1)",
      [artistName],
    );
    return result.rows.length > 0 ? result.rows[0].info_text : null;
  } catch (error) {
    console.error("Error fetching cached artist info:", error);
    return null;
  }
}

async function cacheArtistInfo(
  artistName: string,
  infoText: string,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO artist_info_cache (artist_name, info_text, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (artist_name)
       DO UPDATE SET info_text = $2, updated_at = CURRENT_TIMESTAMP`,
      [artistName, infoText],
    );
  } catch (error) {
    console.error("Error caching artist info:", error);
  }
}

app.post("/api/artist-info", async (req, res) => {
  const { artistName } = req.body as { artistName?: string };
  if (!artistName)
    return res.status(400).json({ error: "Missing artistName" });

  try {
    // Check cache first
    const cachedInfo = await getCachedArtistInfo(artistName);
    if (cachedInfo) {
      console.log(`Cache hit for artist: ${artistName}`);
      return res.json({ text: cachedInfo, cached: true });
    }

    console.log(`Cache miss for artist: ${artistName}, generating...`);
    // Generate new info if not in cache
    const result = await generateContent({
      prompt: `Give a one sentence summary of the musical artist ${artistName}`,
    });

    // Cache the result
    if (result.text) {
      await cacheArtistInfo(artistName, result.text);
    }

    res.json({ ...result, cached: false });
  } catch (err) {
    console.error("Error generating artist info:", err);
    res.status(500).json({ error: "Failed to generate artist info" });
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
