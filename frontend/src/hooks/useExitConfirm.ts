import { graniteEvent, closeView } from '@apps-in-toss/web-framework';
import { useEffect } from 'react';

export function useExitConfirm(serviceName: string = '타자 속도 측정기') {
  useEffect(() => {
    try {
      const unsubscribe = graniteEvent.addEventListener('backEvent', {
        onEvent: () => {
          const shouldExit = window.confirm(`${serviceName}을 종료할까요?`);
          if (shouldExit) {
            closeView();
          }
        },
        onError: error => {
          console.error('backEvent error:', error);
        },
      });

      return () => {
        unsubscribe();
      };
    } catch {
      return undefined;
    }
  }, [serviceName]);
}
