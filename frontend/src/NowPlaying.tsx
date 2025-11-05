import { useAtom } from "jotai";
import { ArtistCacheAtom, SpotifyNowPlayingAtom } from "./Spotify/SpotifyAtoms";
import { useEffect, useRef } from "react";

export function NowPlaying() {
  const [nowPlaying] = useAtom(SpotifyNowPlayingAtom);

  const [artistCache, setArtistCache] = useAtom(ArtistCacheAtom);
  const artistCacheRef = useRef(artistCache);
  useEffect(() => {
    artistCacheRef.current = artistCache;
  }, [artistCache]);

  const fetchArtistInfo = async (artistName: string) => {
    if (
      artistCacheRef.current[artistName]?.status === "loading" ||
      artistCacheRef.current[artistName]?.status === "loaded"
    ) {
      return;
    }

    setArtistCache((prev) => {
      const newPrev = { ...prev };
      newPrev[artistName] = { status: "loading" };
      artistCacheRef.current = newPrev;
      return newPrev;
    });

    try {
      const res = await fetch("/api/artist-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistName,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setArtistCache((prev) => ({
        ...prev,
        [artistName]: { status: "loaded", text: data.text },
      }));
    } catch (error: any) {
      setArtistCache((prev) => ({
        ...prev,
        [artistName]: { status: "error", error: error.message },
      }));
    }
  };

  useEffect(() => {
    const artistName = nowPlaying?.item?.artists[0]?.name;
    if (artistName) {
      fetchArtistInfo(artistName);
    }
  }, [nowPlaying]);

  return (
    <div className="flex gap-8 overflow-hidden">
      <div className="max-w-[400px] aspect-square w-full shrink-0">
        <img src={nowPlaying?.item?.album.images[0]?.url} alt="Album Art" />
      </div>
      <div className="grow text-2xl flex flex-col justify-center pr-4">
        <div className="mb-[1lh]">
          <div>{nowPlaying?.item?.name}</div>
          <div className="text-neutral-400">{nowPlaying?.item?.album.name}</div>
        </div>
        <div>
          {artistCache[nowPlaying?.item?.artists[0]?.name || ""]?.status ===
            "loading" && <div className="text-neutral-400">Loading...</div>}
          {artistCache[nowPlaying?.item?.artists[0]?.name || ""]?.status ===
            "loaded" && (
            <div>
              {artistCache[nowPlaying?.item?.artists[0]?.name || ""].text}
            </div>
          )}
          {artistCache[nowPlaying?.item?.artists[0]?.name || ""]?.status ===
            "error" && (
            <div className="text-red-500">
              {artistCache[nowPlaying?.item?.artists[0]?.name || ""].error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
