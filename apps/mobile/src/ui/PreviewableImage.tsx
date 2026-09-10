import { useState } from 'react';
import {
  Image,
  Pressable,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import { ImageViewerModal } from './ImageViewerModal';

type PreviewableImageProps = {
  accessibilityLabel: string;
  resizeMode?: ImageResizeMode;
  style: StyleProp<ImageStyle>;
  uri: string;
};

export function PreviewableImage({
  accessibilityLabel,
  resizeMode = 'cover',
  style,
  uri,
}: PreviewableImageProps): React.ReactElement {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityHint="Открывает фотографию на весь экран"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={() => setViewerOpen(true)}
      >
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={accessibilityLabel}
          resizeMode={resizeMode}
          source={{ uri }}
          style={style}
        />
      </Pressable>
      <ImageViewerModal
        accessibilityLabel={accessibilityLabel}
        onClose={() => setViewerOpen(false)}
        uri={uri}
        visible={viewerOpen}
      />
    </>
  );
}
