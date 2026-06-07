import GomokuBoard from '@/components/GomokuBoard';
import GameControl from '@/components/GameControl';
import WinEffect from '@/components/WinEffect';
import DrawCat from '@/components/DrawCat';
import EasterEggPanel from '@/components/EasterEggPanel';

export default function App() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 p-4"
      style={{
        background: 'linear-gradient(180deg, #3E2723 0%, #5D4037 30%, #8D6E63 60%, #A1887F 100%)',
      }}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">


        {/* 控制面板 */}
        <div className="order-2 md:order-1">
          <GameControl />
        </div>

        {/* 棋盘 */}
        <div className="order-1 md:order-2">
          <GomokuBoard />
        </div>
      </div>

      {/* 特效层 */}
      <WinEffect />
      <DrawCat />
      <EasterEggPanel />
    </div>
  );
}
