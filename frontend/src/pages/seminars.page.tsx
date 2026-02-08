import { SeminarProvider } from '@/features/seminars/hooks/useSeminarContext';
import { SeminarList } from '@/features/seminars/components/SeminarList';

export const SeminarsPage = () => {
  return (
    <SeminarProvider>
      <SeminarList />
    </SeminarProvider>
  );
};
