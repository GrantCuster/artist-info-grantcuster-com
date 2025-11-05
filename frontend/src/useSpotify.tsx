import { useAtom } from "jotai";
import { SpotifyNowPlayingAtom } from "./Spotify/SpotifyAtoms";
import { useEffect } from "react";

export async function transferToDevice(device_id: string, play = true) {
  const res = await fetch("/api/spotify/transfer", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id, play }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Transfer failed: ${res.status} ${t}`);
  }
}

export function useSpotify() {
  const pollMs = 5000;
  const [, setNowPlaying] = useAtom(SpotifyNowPlayingAtom);
  async function fetchNowPlaying() {
    try {
      const res = await fetch("/api/spotify/me/player/currently-playing");
      if (res.status === 204) {
        // 204 means nothing is playing
        setNowPlaying((prev) => {
          if (prev && prev.is_playing) {
            return { ...prev, is_playing: false };
          }
          return prev;
        });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNowPlaying(data);
    } catch (err) {
      console.error("Failed to fetch now playing:", err);
    }
  }

  useEffect(() => {
    fetchNowPlaying();
    const id = setInterval(() => {
      fetchNowPlaying();
    }, pollMs);
    return () => clearInterval(id);
  }, []);
}
