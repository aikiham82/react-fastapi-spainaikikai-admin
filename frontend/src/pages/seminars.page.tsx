import { SeminarProvider } from './features/seminars/hooks/useSeminarContext';
import { SeminarList } from './features/seminars/components/SeminarList';

export const SeminarsPage = () => {
  return (
    <SeminarProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seminarios</h1>
          <p className="text-gray-600 mt-1">Gestiona los seminarios de la asociación</p>
        </div>
        <SeminarList />
      </div>
    </SeminarProvider>
  );
};
