import { useState } from 'react';

import { nfcReader } from '@/nfc';
import { AppDialog, Button, NfcScanOverlay } from '@/ui';

type NfcScanButtonProps = {
  label: string;
  onScanned: (uid: string) => void | Promise<void>;
  onError: (message: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
  overlayTitle?: string;
  overlaySubtitle?: string;
};

export function NfcScanButton({
  label,
  onScanned,
  onError,
  disabled = false,
  loading = false,
  overlayTitle,
  overlaySubtitle,
}: NfcScanButtonProps): React.ReactElement {
  const [scanning, setScanning] = useState(false);
  const [nfcDisabledDialogOpen, setNfcDisabledDialogOpen] = useState(false);

  async function scan(): Promise<void> {
    if (disabled || loading || scanning) {
      return;
    }

    onError(null);
    if (!(await nfcReader.isAvailable())) {
      onError('NFC недоступен на этом устройстве.');
      return;
    }
    if (!(await nfcReader.isEnabled())) {
      setNfcDisabledDialogOpen(true);
      return;
    }

    let uid: string;
    setScanning(true);
    try {
      uid = await nfcReader.readUid();
    } catch {
      onError('Не удалось считать NFC-метку. Повторите попытку.');
      return;
    } finally {
      setScanning(false);
    }

    await onScanned(uid.trim().toLowerCase());
  }

  return (
    <>
      <AppDialog
        visible={nfcDisabledDialogOpen}
        title="NFC выключен"
        message="Включите NFC в настройках телефона и повторите сканирование."
        tone="warning"
        actions={[
          {
            label: 'Открыть настройки',
            onPress: () => {
              setNfcDisabledDialogOpen(false);
              void nfcReader.openSettings();
            },
          },
          {
            label: 'Позже',
            variant: 'ghost',
            onPress: () => setNfcDisabledDialogOpen(false),
          },
        ]}
        onClose={() => setNfcDisabledDialogOpen(false)}
      />
      <NfcScanOverlay
        visible={scanning}
        title={overlayTitle}
        subtitle={overlaySubtitle}
        onCancel={() => void nfcReader.cancel()}
      />
      <Button
        label={label}
        icon="scan-outline"
        disabled={disabled}
        loading={loading}
        onPress={() => void scan()}
      />
    </>
  );
}
