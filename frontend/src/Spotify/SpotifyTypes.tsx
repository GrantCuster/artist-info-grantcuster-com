export type ArtistStatus = "idle" | "loading" | "loaded" | "error";
export type ArtistState = {
  status: ArtistStatus;
  text?: string;
  error?: string;
};
export type ArtistMap = Record<string, ArtistState>;

export type ViewModeType = "player" | "favs" | "list";

export type SpotifyTrackType = {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
};

export type SpotifyNowPlayingType = {
  is_playing: boolean;
  progress_ms: number;
  item: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    duration_ms: number;
  };
  context: { uri: string };
} | null;
