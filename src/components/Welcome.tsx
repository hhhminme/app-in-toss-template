interface WelcomeProps {
  onGetStarted?: () => void;
}

export function Welcome({ onGetStarted }: WelcomeProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">
            앱인토스 템플릿
          </h1>
          <p className="text-lg text-gray-600">
            Vite + React + TypeScript + Tailwind CSS
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              ⚡️ 빠른 개발
            </h3>
            <p className="text-gray-600">Vite와 HMR로 즉각적인 피드백</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              🎨 TDS 디자인
            </h3>
            <p className="text-gray-600">토스 디자인 시스템으로 일관된 UX</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              🔷 타입 안정성
            </h3>
            <p className="text-gray-600">TypeScript로 안전한 코드 작성</p>
          </div>
        </div>

        {onGetStarted && (
          <button
            onClick={onGetStarted}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            시작하기
          </button>
        )}
      </div>
    </div>
  );
}
