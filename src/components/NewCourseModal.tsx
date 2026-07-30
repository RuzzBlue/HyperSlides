import type { CourseSummary } from '@shared/types';
import { CourseSettingsModal } from './CourseSettingsModal';

export { CourseSettingsModal } from './CourseSettingsModal';

export function NewCourseModal({
  open,
  onClose,
  onCreated,
  initialTemplateId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (course: CourseSummary) => void;
  initialTemplateId?: string;
}) {
  return (
    <CourseSettingsModal
      mode="create"
      open={open}
      onClose={onClose}
      onCreated={onCreated}
      initialTemplateId={initialTemplateId}
    />
  );
}
