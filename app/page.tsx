import { MusicDownloader } from './components/MusicDownloader';
import { MusicPreview } from './components/MusicPreview';

export default function App() {
  return (
    <div className="dark min-h-screen overflow-hidden bg-gray-900 text-white select-none">
      <div className="flex h-screen">
       
       
        <div className="flex-1 flex flex-col overflow-hidden">
       
          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 via-gray-900 to-black">
            <div className="min-h-full">
              <MusicDownloader />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}