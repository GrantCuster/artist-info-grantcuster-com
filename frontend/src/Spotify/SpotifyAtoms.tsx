import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type {
  ArtistMap,
  SpotifyNowPlayingType,
} from "./SpotifyTypes";

export const SpotifyNowPlayingAtom = atom<SpotifyNowPlayingType>(null);
export const ArtistCacheAtom = atomWithStorage<ArtistMap>('artist-cache', {});
