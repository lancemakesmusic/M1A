import { openBrowserAsync } from 'expo-web-browser';
import { Text, TouchableOpacity } from 'react-native';

type Props = {
  href: string;
  children: React.ReactNode;
  style?: any;
};

export function ExternalLink({ href, children, style, ...rest }: Props) {
  return (
    <TouchableOpacity
      onPress={async () => {
        // Open the link in an in-app browser on native.
        await openBrowserAsync(href);
      }}
      style={style}
      {...rest}
    >
      <Text>{children}</Text>
    </TouchableOpacity>
  );
}
