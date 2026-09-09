import type { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';

type SubmitButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function SubmitButton({ icon = 'checkmark-outline', ...props }: SubmitButtonProps): React.ReactElement {
  return <Button {...props} icon={icon} />;
}

type CancelButtonProps = {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
};

export function CancelButton({
  label = 'Отмена',
  onPress,
  disabled,
}: CancelButtonProps): React.ReactElement {
  return <Button label={label} variant="secondary" onPress={onPress} disabled={disabled} />;
}
