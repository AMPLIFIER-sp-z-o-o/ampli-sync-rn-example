import { Button, StyleSheet, Text, View } from 'react-native';

import type { Session } from '../auth/types';

type Props = {
  session: Session;
  onAddDemoCustomer: () => void;
  onUpdateDemoCustomer: () => void;
  onDeleteDemoCustomer: () => void;
  onSend: () => void;
  onPull: () => void;
  onLogout: () => void;
  isSyncing: boolean;
  syncInfo?: string | null;
};

export const MainScreen = ({
  session,
  onAddDemoCustomer,
  onUpdateDemoCustomer,
  onDeleteDemoCustomer,
  onSend,
  onPull,
  onLogout,
  isSyncing,
  syncInfo,
}: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AMPLI-SYNC Example</Text>
      <Text style={styles.meta}>login: {session.login}</Text>
      {syncInfo ? <Text style={styles.meta}>{syncInfo}</Text> : null}

      <View style={styles.buttons}>
        <Button
          title="Add demo customer"
          onPress={onAddDemoCustomer}
          disabled={isSyncing}
        />
        <Button
          title="Update demo customer"
          onPress={onUpdateDemoCustomer}
          disabled={isSyncing}
        />
        <Button
          title="Delete demo customer"
          onPress={onDeleteDemoCustomer}
          disabled={isSyncing}
        />
        <Button
          title="Sent data to server"
          onPress={onSend}
          disabled={isSyncing}
        />
        <Button
          title="Get changes from server"
          onPress={onPull}
          disabled={isSyncing}
        />
        <Button title="Logout" onPress={onLogout} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  meta: {
    color: '#444',
  },
  buttons: {
    gap: 12,
  },
});
