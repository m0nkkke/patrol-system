import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import {
  useArchivePatrolPoint,
  usePatrolPoint,
  useUpdatePatrolPoint,
  useUploadPatrolPointPhoto,
} from '@/features/patrol-points/queries';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AppToast,
  AsyncStateScreen,
  Button,
  CancelButton,
  Card,
  EntityIcon,
  FormHeader,
  Header,
  ProtectedImage,
  Screen,
  SectionHeading,
  StatusLabel,
  SubmitButton,
  TextField,
} from '@/ui';

export default function PatrolPointScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '', shopId = '' } = useLocalSearchParams<{ id: string; shopId: string }>();
  const pointQuery = usePatrolPoint(id);
  const upload = useUploadPatrolPointPhoto(shopId, id);
  const update = useUpdatePatrolPoint(shopId, id);
  const archive = useArchivePatrolPoint(shopId, id);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!pointQuery.data) return;
    setName(pointQuery.data.name);
    setDescription(pointQuery.data.description ?? '');
  }, [pointQuery.data]);

  if (pointQuery.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (pointQuery.isError || !pointQuery.data) {
    return (
      <AsyncStateScreen
        message={describeError(pointQuery.error)}
        onBack={() => router.back()}
        onRetry={() => void pointQuery.refetch()}
      />
    );
  }

  const point = pointQuery.data;
  const photoFileId = point.photoFileId;
  const hasNfc = Boolean(point.nfcTagId ?? point.nfcTag?.id);
  const error =
    localError ??
    (update.isError ? describeError(update.error) : null) ??
    (archive.isError ? describeError(archive.error) : null) ??
    (upload.isError ? describeError(upload.error) : null);
  const isChanged = name.trim() !== point.name || description.trim() !== (point.description ?? '');
  const isNameValid = name.trim().length >= 2;

  async function savePoint(): Promise<void> {
    if (!isNameValid || update.isPending) return;

    setLocalError(null);
    setNotice(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      });
      setNotice('Контрольная точка сохранена.');
    } catch {
      // Ошибка mutation отображается общим AppToast.
    }
  }

  async function archivePoint(): Promise<void> {
    setArchiveDialogOpen(false);
    setLocalError(null);
    setNotice(null);
    try {
      await archive.mutateAsync();
      router.dismissTo({ pathname: '/patrol-routes/[shopId]', params: { shopId, tab: 'points' } });
    } catch {
      // Ошибка mutation отображается общим AppToast.
    }
  }

  async function choosePhoto(source: 'camera' | 'library'): Promise<void> {
    if (upload.isPending) return;

    setSourceDialogOpen(false);
    setLocalError(null);
    setNotice(null);
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

    try {
      await upload.mutateAsync({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      setNotice('Фотография точки обновлена.');
    } catch {
      // Ошибка mutation отображается общим AppToast.
    }
  }

  return (
    <Screen padded={false}>
      <AppToast message={error ?? notice} tone={error ? 'danger' : 'success'} />
      <AppDialog
        visible={sourceDialogOpen}
        title={photoFileId ? 'Заменить фотографию' : 'Добавить фотографию'}
        message="Выберите источник изображения контрольной точки."
        actions={[
          { label: 'Камера', onPress: () => void choosePhoto('camera') },
          { label: 'Галерея', variant: 'secondary', onPress: () => void choosePhoto('library') },
          { label: 'Отмена', variant: 'ghost', onPress: () => setSourceDialogOpen(false) },
        ]}
        onClose={() => setSourceDialogOpen(false)}
      />
      <AppDialog
        visible={archiveDialogOpen}
        title="Удалить точку?"
        message="Точка исчезнет из активного списка. Восстановить её можно будет из архива. Точку из активного маршрута сначала нужно удалить."
        tone="danger"
        actions={[
          { label: 'Удалить', variant: 'danger', onPress: () => void archivePoint() },
          { label: 'Отмена', variant: 'ghost', onPress: () => setArchiveDialogOpen(false) },
        ]}
        onClose={() => setArchiveDialogOpen(false)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="location-outline"
            title="Контрольная точка"
            subtitle="Данные, фотография и NFC-метка"
          />

          <Card style={styles.summaryCard}>
            <EntityIcon icon="location-outline" size="large" />
            <View style={styles.summaryCopy}>
              <AppText variant="label" numberOfLines={2}>
                {point.name}
              </AppText>
              <View style={styles.statuses}>
                <StatusLabel label="Активна" tone="success" />
                <StatusLabel
                  label={hasNfc ? 'NFC привязана' : 'Без NFC-метки'}
                  tone={hasNfc ? 'success' : 'warning'}
                />
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeading title="Основные данные" subtitle="Название и ориентир для сотрудника" />
            <TextField
              label="Название"
              required
              icon="pricetag-outline"
              value={name}
              onChangeText={setName}
              placeholder="Название контрольной точки"
              maxLength={200}
              error={name.length > 0 && !isNameValid ? 'Введите не менее двух символов.' : null}
            />
            <View style={styles.fieldGap}>
              <TextField
                label="Описание"
                value={description}
                onChangeText={setDescription}
                placeholder="Как найти точку"
                multiline
                maxLength={10000}
                style={styles.descriptionInput}
              />
            </View>
            <View style={styles.fieldGap}>
              <SectionHeading
                title="Фотография"
                subtitle="Помогает быстрее найти контрольную точку"
              />
              {photoFileId ? (
                <ProtectedImage
                  key={photoFileId}
                  fileId={photoFileId}
                  style={styles.photo}
                  resizeMode="cover"
                  accessibilityLabel={`Фото точки ${point.name}`}
                />
              ) : (
                <View style={styles.placeholder}>
                  <EntityIcon icon="image-outline" size="large" tone="neutral" />
                  <AppText variant="label" style={styles.placeholderTitle}>
                    Фотография не добавлена
                  </AppText>
                </View>
              )}
              <View style={styles.actionGap}>
                <Button
                  label={photoFileId ? 'Заменить фотографию' : 'Добавить фотографию'}
                  variant="secondary"
                  icon="camera-outline"
                  loading={upload.isPending}
                  onPress={() => setSourceDialogOpen(true)}
                />
              </View>
            </View>
            <View style={styles.saveAction}>
              <SubmitButton
                label="Сохранить изменения"
                loading={update.isPending}
                disabled={!isNameValid || !isChanged}
                onPress={() => void savePoint()}
              />
              <View style={styles.actionGap}>
                <CancelButton onPress={() => router.back()} />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading title="NFC-метка" subtitle="Используется для отметки точки в обходе" />
            <View style={styles.nfcPanel}>
              <EntityIcon
                icon={hasNfc ? 'radio-outline' : 'alert-circle-outline'}
                tone={hasNfc ? 'success' : 'warning'}
              />
              <View style={styles.nfcCopy}>
                <AppText variant="label">
                  {hasNfc ? 'Метка привязана' : 'Метка не привязана'}
                </AppText>
                <AppText variant="caption" muted style={styles.pointMeta}>
                  {hasNfc
                    ? 'При замене старая метка останется в истории.'
                    : 'Для использования точки отсканируйте NFC-метку.'}
                </AppText>
              </View>
            </View>
            <View style={styles.actionGap}>
              <Button
                label={hasNfc ? 'Заменить NFC-метку' : 'Привязать NFC-метку'}
                variant="secondary"
                icon={hasNfc ? 'swap-horizontal-outline' : 'scan-outline'}
                onPress={() =>
                  router.push({
                    pathname: '/nfc-replace/point/[id]',
                    params: { id: point.id, shopId, name: point.name },
                  })
                }
              />
            </View>
          </View>

          <View style={styles.archiveAction}>
            <Button
              label="Удалить точку"
              variant="dangerOutline"
              icon="trash-outline"
              loading={archive.isPending}
              onPress={() => setArchiveDialogOpen(true)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  summaryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: spacing.lg,
  },
  summaryCopy: {
    flex: 1,
    marginLeft: spacing.lg,
    minWidth: 0,
  },
  statuses: {
    columnGap: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    rowGap: spacing.xs,
  },
  section: {
    marginTop: spacing.xxl,
  },
  fieldGap: {
    marginTop: spacing.lg,
  },
  descriptionInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  saveAction: {
    marginTop: spacing.xl,
  },
  actionGap: {
    marginTop: spacing.md,
  },
  photo: {
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    aspectRatio: 16 / 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  placeholderTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  nfcPanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  nfcCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pointMeta: {
    marginTop: spacing.xs,
  },
  archiveAction: {
    marginTop: spacing.xxl,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
