import { useSpotify } from "./useSpotify";
import { NowPlaying } from "./NowPlaying.tsx";

function App() {
  useSpotify();

  return (
    <div className="w-full h-[100dvh]">
      <NowPlaying />
    </div>
  );
}

export default App;
