import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { RoutePoint } from '@/api/types';
import { NfcScanButton } from '@/features/nfc/NfcScanButton';
import {
  useCreatePatrolPointWithNfc,
  useUploadCreatedPatrolPointPhoto,
} from '@/features/patrol-points/queries';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AppToast,
  Button,
  Card,
  EntityIcon,
  FormHeader,
  Header,
  ResultHeader,
  ResultScreen,
  Screen,
  SectionHeading,
  StatusLabel,
  TextField,
} from '@/ui';

export default function NewPatrolPointScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId = '' } = useLocalSearchParams<{ shopId: string }>();
  const create = useCreatePatrolPointWithNfc(shopId);
  const uploadPhoto = useUploadCreatedPatrolPointPhoto(shopId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createdPoint, setCreatedPoint] = useState<RoutePoint | null>(null);
  const [photo, setPhoto] = useState<{
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
  } | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoUploadFailed, setPhotoUploadFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const valid = name.trim().length >= 2;
  const busy = create.isPending || uploadPhoto.isPending;
  const error = localError ?? (create.isError ? describeError(create.error) : null);

  function returnToPoints(): void {
    router.dismissTo({
      pathname: '/patrol-routes/[shopId]',
      params: { shopId, tab: 'points' },
    });
  }

  async function createWithNfc(uid: string): Promise<void> {
    setLocalError(null);
    try {
      let point = await create.mutateAsync({
        shopId,
        name: name.trim(),
        description: description.trim() || undefined,
        isActive: true,
        uid,
      });
      let uploadFailed = false;
      if (photo) {
        try {
          point = await uploadPhoto.mutateAsync({ pointId: point.id, photo });
        } catch {
          uploadFailed = true;
        }
      }
      setCreatedPoint(point);
      setPhotoUploadFailed(uploadFailed);
      setDone(true);
    } catch {
      // Ошибка запроса отображается через состояние соответствующей mutation.
    }
  }

  async function choosePhoto(source: 'camera' | 'library'): Promise<void> {
    if (busy) return;

    setPhotoDialogOpen(false);
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
    setPhoto({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
  }

  if (done && createdPoint) {
    return (
      <ResultScreen
        onBack={returnToPoints}
        footer={
          <>
            <Button
              label="Открыть точку"
              icon="location-outline"
              onPress={() =>
                router.replace({
                  pathname: '/route-setup/point/[id]',
                  params: { id: createdPoint.id, shopId },
                })
              }
            />
            <View style={styles.actionGap}>
              <Button
                label="Добавить ещё"
                icon="add-outline"
                variant="secondary"
                onPress={() => {
                  setName('');
                  setDescription('');
                  setPhoto(null);
                  setCreatedPoint(null);
                  setPhotoUploadFailed(false);
                  setDone(false);
                  create.reset();
                  uploadPhoto.reset();
                }}
              />
            </View>
          </>
        }
      >
        <ResultHeader
          icon="checkmark"
          iconColor={colors.success}
          iconBackground={colors.successBackground}
          title="Точка создана!"
          subtitle="NFC-метка привязана"
        />
        <Card style={styles.resultCard}>
          <EntityIcon icon="location-outline" size="large" />
          <View style={styles.resultCopy}>
            <AppText variant="label">{createdPoint.name}</AppText>
            {createdPoint.description ? (
              <AppText variant="caption" muted style={styles.resultDescription}>
                {createdPoint.description}
              </AppText>
            ) : null}
            <View style={styles.resultStatus}>
              <StatusLabel label="NFC привязана" tone="success" />
            </View>
            <View style={styles.resultStatus}>
              <StatusLabel
                label={
                  photoUploadFailed
                    ? 'Фото не загрузилось'
                    : photo
                      ? 'Фото добавлено'
                      : 'Без фотографии'
                }
                tone={photoUploadFailed ? 'warning' : photo ? 'success' : 'neutral'}
              />
            </View>
          </View>
        </Card>
      </ResultScreen>
    );
  }

  return (
    <Screen padded={false}>
      <AppToast message={error} />
      <AppDialog
        visible={photoDialogOpen}
        title={photo ? 'Заменить фотографию' : 'Добавить фотографию'}
        message="Выберите источник изображения контрольной точки."
        actions={[
          { label: 'Камера', onPress: () => void choosePhoto('camera') },
          { label: 'Галерея', variant: 'secondary', onPress: () => void choosePhoto('library') },
          { label: 'Отмена', variant: 'ghost', onPress: () => setPhotoDialogOpen(false) },
        ]}
        onClose={() => setPhotoDialogOpen(false)}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="location-outline"
            title="Новая контрольная точка"
            subtitle="Укажите данные и привяжите NFC-метку"
          />
          <SectionHeading
            title="Основные данные"
            subtitle="Название и ориентир для сотрудника"
          />
          <TextField
            label="Название"
            required
            icon="pricetag-outline"
            value={name}
            editable={!create.isPending}
            onChangeText={setName}
            placeholder="Например, электрощитовая"
            maxLength={200}
            error={name.length > 0 && !valid ? 'Введите не менее двух символов.' : null}
          />
          <View style={styles.fieldGap}>
            <TextField
              label="Описание"
              value={description}
              editable={!create.isPending}
              onChangeText={setDescription}
              placeholder="Как найти точку"
              multiline
              maxLength={10000}
              style={styles.descriptionInput}
            />
          </View>

          <View style={styles.photoSection}>
            <SectionHeading
              title="Фотография"
              subtitle="Поможет сотруднику быстрее найти контрольную точку"
            />
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <EntityIcon icon="image-outline" size="large" tone="neutral" />
                <AppText variant="label" muted style={styles.photoPlaceholderText}>
                  Фотография не добавлена
                </AppText>
              </View>
            )}
            <View style={styles.actionGap}>
              <Button
                label={photo ? 'Заменить фотографию' : 'Добавить фотографию'}
                icon="camera-outline"
                variant="secondary"
                disabled={busy}
                onPress={() => setPhotoDialogOpen(true)}
              />
            </View>
          </View>

          <View style={styles.scanHeading}>
            <SectionHeading
              title="NFC-метка"
              subtitle="UID считывается только сканированием"
            />
          </View>
          <View style={styles.scanAction}>
            <NfcScanButton
              label="Сканировать NFC и создать"
              disabled={!valid}
              loading={busy}
              overlayTitle="Сканируем метку точки"
              overlaySubtitle="Поднесите телефон к NFC-метке новой контрольной точки."
              onError={setLocalError}
              onScanned={createWithNfc}
            />
          </View>
          <AppText variant="caption" muted style={styles.hint}>
            Поля, отмеченные <AppText variant="caption" color={colors.danger}>*</AppText>, обязательны
          </AppText>
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
  fieldGap: {
    marginTop: spacing.lg,
  },
  descriptionInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  scanAction: {
    marginTop: 0,
  },
  scanHeading: {
    marginTop: spacing.xxl,
  },
  photoSection: {
    marginTop: spacing.xxl,
  },
  photo: {
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    aspectRatio: 16 / 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  photoPlaceholderText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hint: {
    marginTop: spacing.md,
  },
  resultCard: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  resultCopy: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  resultDescription: {
    marginTop: spacing.sm,
  },
  resultStatus: {
    marginTop: spacing.md,
  },
  actionGap: {
    marginTop: spacing.sm,
  },
});
