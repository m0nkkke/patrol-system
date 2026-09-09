import { TextField } from './TextField';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  editable?: boolean;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  editable,
}: SearchFieldProps): React.ReactElement {
  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={placeholder}
      icon="search"
      compact
      autoCorrect={false}
      autoFocus={autoFocus}
      editable={editable}
      returnKeyType="search"
      clearButtonMode="while-editing"
    />
  );
}
