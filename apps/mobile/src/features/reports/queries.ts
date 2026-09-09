import { useMutation } from '@tanstack/react-query';

import {
  attachReportPhoto,
  cancelReportDraft,
  createReportDraft,
  submitReport,
} from '@/api/reports.api';
import type { ReportPhoto } from '@/api/reports.api';

export function useCreateReportDraft() {
  return useMutation({ mutationFn: createReportDraft });
}

export function useAttachReportPhoto() {
  return useMutation({
    mutationFn: ({ reportId, photo }: { reportId: string; photo: ReportPhoto }) =>
      attachReportPhoto(reportId, photo),
  });
}

export function useSubmitReport() {
  return useMutation({
    mutationFn: ({ reportId, comment }: { reportId: string; comment?: string }) =>
      submitReport(reportId, { comment, fields: {} }),
  });
}

export function useCancelReportDraft() {
  return useMutation({
    mutationFn: ({ reportId, reason }: { reportId: string; reason: string }) =>
      cancelReportDraft(reportId, { reason }),
  });
}
