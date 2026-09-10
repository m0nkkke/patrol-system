import { Ionicons } from '@expo/vector-icons';
import type { PatrolReportType } from '@patrol/shared';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import type { ReportPhoto } from '@/api/reports.api';
import {
  useAttachReportPhoto,
  useCancelReportDraft,
  useCreateReportDraft,
  useSubmitReport,
} from '@/features/reports/queries';
import { SelectedShopSummary } from '@/features/shops/SelectedShopSummary';
import { useNetworkStatus } from '@/lib/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AppToast,
  Button,
  FormHeader,
  Header,
  PreviewableImage,
  Screen,
  SectionHeading,
  Select,
  TextField,
} from '@/ui';

const REPORT_TYPES = [
  { value: 'photo_report', label: 'Фотоотчёт' },
  { value: 'morning', label: 'Утренний отчёт' },
  { value: 'closing', label: 'Отчёт закрытия' },
  { value: 'sunday', label: 'Воскресный отчёт' },
  { value: 'heating', label: 'Отчёт отопительного периода' },
  { value: 'evacuation', label: 'Эвакуационный отчёт' },
] as const;

type UploadedPhoto = ReportPhoto & {
  id: string;
  name: string;
};

export default function ReportsScreen(): React.ReactElement {
  const router = useRouter();
  const shopId = useAuthStore((state) => state.selectedShopId);
  const [reportType, setReportType] = useState<PatrolReportType>('photo_report');
  const [comment, setComment] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadedPhotoIds, setUploadedPhotoIds] = useState<string[]>([]);
  const [photoDialog, setPhotoDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const createDraft = useCreateReportDraft();
  const attachPhoto = useAttachReportPhoto();
  const submit = useSubmitReport();
  const cancel = useCancelReportDraft();
  const networkStatus = useNetworkStatus();

  const operationError = createDraft.error ?? attachPhoto.error ?? submit.error ?? cancel.error;
  const error = localError ?? (operationError ? describeError(operationError) : null);
  const busy =
    isSubmittingWorkflow ||
    createDraft.isPending ||
    attachPhoto.isPending ||
    submit.isPending ||
    cancel.isPending;

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!draftId && !comment.trim() && photos.length === 0) {
          return false;
        }
        setCancelDialog(true);
        return true;
      });
      return () => subscription.remove();
    }, [comment, draftId, photos.length]),
  );

  function handleBack(): void {
    if (draftId || comment.trim() || photos.length > 0) {
      setCancelDialog(true);
      return;
    }
    router.back();
  }

  async function submitDraft(): Promise<void> {
    if (!shopId) {
      setLocalError('Сначала выберите магазин.');
      return;
    }
    if (networkStatus !== 'online') {
      setLocalError('Для создания отчёта требуется подключение к интернету.');
      return;
    }
    if (reportType === 'photo_report' && photos.length === 0) {
      setLocalError('Для фотоотчёта добавьте хотя бы одну фотографию.');
      return;
    }
    setLocalError(null);
    setIsSubmittingWorkflow(true);

    let reportId = draftId;
    try {
      if (reportId === null) {
        const draft = await createDraft.mutateAsync({
          reportType,
          shopId,
          fields: {},
          comment: comment.trim() || undefined,
        });
        reportId = draft.id;
        setDraftId(reportId);
      }

      const uploadedIds = new Set(uploadedPhotoIds);
      for (const photo of photos) {
        if (uploadedIds.has(photo.id)) continue;
        await attachPhoto.mutateAsync({
          reportId,
          photo: { uri: photo.uri, fileName: photo.fileName, mimeType: photo.mimeType },
        });
        uploadedIds.add(photo.id);
        setUploadedPhotoIds([...uploadedIds]);
      }

      await submit.mutateAsync({ reportId, comment: comment.trim() || undefined });
      setSuccessDialog(true);
    } catch {
      // Ошибка текущего шага отображается общим AppToast; созданный черновик можно отправить повторно.
    } finally {
      setIsSubmittingWorkflow(false);
    }
  }

  async function choosePhoto(source: 'camera' | 'library'): Promise<void> {
    if (busy || photos.length >= 10) {
      return;
    }
    setPhotoDialog(false);
    setLocalError(null);

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLocalError(
        source === 'camera'
          ? 'Разрешите доступ к камере в настройках телефона.'
          : 'Разрешите доступ к фотографиям в настройках телефона.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if (asset.fileSize !== undefined && asset.fileSize > 10 * 1024 * 1024) {
      setLocalError('Размер фотографии не должен превышать 10 МБ.');
      return;
    }

    setPhotos((current) => [
      ...current,
      {
        fileName: asset.fileName,
        id: `${Date.now()}-${current.length}-${asset.uri}`,
        mimeType: asset.mimeType,
        name: asset.fileName || `Фото ${current.length + 1}`,
        uri: asset.uri,
      },
    ]);
  }

  function cancelDraft(): void {
    if (!draftId) {
      router.back();
      return;
    }
    if (networkStatus !== 'online') {
      setCancelDialog(false);
      setLocalError('Для отмены отчёта требуется подключение к интернету.');
      return;
    }
    cancel.mutate(
      { reportId: draftId, reason: 'Отменено сотрудником в мобильном приложении' },
      {
        onSuccess: () => {
          setCancelDialog(false);
          router.dismissTo('/');
        },
      },
    );
  }

  return (
    <Screen padded={false}>
      <AppToast message={error} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header compact onBack={handleBack} right={<View />} />
          <FormHeader
            icon="document-text-outline"
            title="Операционный отчёт"
            subtitle="Заполните сведения, добавьте фотографии и отправьте отчёт"
          />

          <SelectedShopSummary shopId={shopId} />

          <View style={styles.formSection}>
            <Select
              label="Тип отчёта"
              required
              icon="documents-outline"
              title="Тип отчёта"
              value={reportType}
              options={[...REPORT_TYPES]}
              onChange={(value) => setReportType(value as PatrolReportType)}
              disabled={busy || draftId !== null}
            />
          <View style={styles.gapLg}>
            <TextField
              label="Комментарий"
              value={comment}
              onChangeText={setComment}
              placeholder="Добавьте сведения по отчёту"
              multiline
              editable={!busy}
              style={styles.comment}
            />
          </View>

            <View style={styles.attachmentsSection}>
              <SectionHeading
                title="Фотографии"
                subtitle={`${photos.length} из 10 · ${reportType === 'photo_report' ? 'обязательно' : 'необязательно'}`}
              />

              {photos.length > 0 ? (
                <View style={styles.photos}>
                  {photos.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                      <PreviewableImage
                        accessibilityLabel={photo.name}
                        uri={photo.uri}
                        style={styles.photo}
                      />
                      <AppText variant="caption" numberOfLines={1} style={styles.photoName}>
                        {photo.name}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyPhotos}>
                  <Ionicons name="images-outline" size={24} color={colors.textMuted} />
                  <AppText variant="caption" muted style={styles.emptyPhotosText}>
                    Фотографии ещё не добавлены
                  </AppText>
                </View>
              )}

              <Button
                label="Добавить фото"
                icon="camera-outline"
                variant="secondary"
                onPress={() => setPhotoDialog(true)}
                loading={attachPhoto.isPending}
                disabled={photos.length >= 10}
              />
              <View style={styles.submitAction}>
                <Button
                  label="Отправить отчёт"
                  icon="send-outline"
                  onPress={() => void submitDraft()}
                  loading={busy}
                  disabled={networkStatus !== 'online'}
                />
              </View>
              {draftId && !isSubmittingWorkflow && !successDialog ? <View style={styles.gapSm}>
                <Button
                  label="Отменить отчёт"
                  icon="trash-outline"
                  variant="dangerOutline"
                  onPress={() => setCancelDialog(true)}
                  disabled={busy}
                />
              </View> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppDialog
        visible={photoDialog}
        title="Добавить фотографию"
        tone="info"
        actions={[
          { label: 'Сделать фото', onPress: () => void choosePhoto('camera') },
          { label: 'Выбрать из галереи', onPress: () => void choosePhoto('library'), variant: 'secondary' },
          { label: 'Закрыть', onPress: () => setPhotoDialog(false), variant: 'ghost' },
        ]}
        onClose={() => setPhotoDialog(false)}
      />
      <AppDialog
        visible={cancelDialog}
        title={draftId ? 'Отменить подготовку отчёта?' : 'Закрыть отчёт?'}
        message={
          draftId
            ? 'Созданный черновик останется в истории со статусом отмены.'
            : 'Введённые данные и выбранные фотографии не сохранятся.'
        }
        tone="warning"
        actions={[
          {
            label: draftId ? 'Отменить отчёт' : 'Выйти без сохранения',
            onPress: cancelDraft,
            variant: 'danger',
          },
          { label: 'Продолжить редактирование', onPress: () => setCancelDialog(false), variant: 'ghost' },
        ]}
        onClose={() => setCancelDialog(false)}
      />
      <AppDialog
        visible={successDialog}
        title="Отчёт отправлен"
        message="Отчёт доступен службе контроля."
        tone="success"
        actions={[{ label: 'На главную', onPress: () => router.dismissTo('/') }]}
        onClose={() => router.dismissTo('/')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  comment: { minHeight: 112, textAlignVertical: 'top' },
  gapLg: { marginTop: spacing.lg },
  gapSm: { marginTop: spacing.sm },
  formSection: { marginTop: spacing.xl },
  photo: { borderRadius: radius.sm, height: 64, width: 64 },
  photoItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.sm,
  },
  photoName: { flex: 1, marginLeft: spacing.md },
  photos: { gap: spacing.sm, marginBottom: spacing.md },
  emptyPhotos: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  emptyPhotosText: { marginLeft: spacing.sm },
  attachmentsSection: { marginTop: spacing.xl },
  submitAction: { marginTop: spacing.md },
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
});
