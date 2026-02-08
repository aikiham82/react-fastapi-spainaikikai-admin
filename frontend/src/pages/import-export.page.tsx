import { ImportExportPage as ImportExportContent } from '@/features/import-export/components/ImportExportPage';
import { MemberProvider } from '@/features/members/hooks/useMemberContext';

export const ImportExportPage = () => {
  return (
    <MemberProvider>
      <ImportExportContent />
    </MemberProvider>
  );
};
