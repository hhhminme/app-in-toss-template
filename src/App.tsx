import { Welcome } from './components/Welcome';

function App() {
  const handleGetStarted = () => {
    console.log('시작하기 클릭!');
    alert('앱인토스 개발을 시작해보세요! 🚀');
  };

  return <Welcome onGetStarted={handleGetStarted} />;
}

export default App;
