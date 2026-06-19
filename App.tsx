import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Session } from './src/auth/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { MainScreen } from './src/screens/MainScreen';
import {
  clearSession,
  loadSession,
} from './src/services/session/sessionStorage';
import {
  initializeForSession,
  logoutCleanup,
  syncPull,
  syncSend,
} from './src/services/sync/service';
import {
  addDemoCustomerRecord,
  deleteLastDemoCustomerRecord,
  updateLastDemoCustomerRecord,
} from './src/services/db/demoCustomersDebug';

const App = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [lastDemoCustomerId, setLastDemoCustomerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await loadSession();
        if (mounted) setSession(stored);
      } finally {
        if (mounted) setIsBooting(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let canceled = false;

    (async () => {
      setIsSyncing(true);
      setSyncInfo('Syncing database...');
      try {
        await initializeForSession(session);
        if (canceled) return;
        if (!canceled) setSyncInfo('Database: OK');
      } catch (e) {
        if (!canceled) {
          setSyncInfo(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!canceled) setIsSyncing(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [session]);

  const handleAddDemoCustomer = async () => {
    setIsSyncing(true);
    setSyncInfo('Adding demo customer...');
    try {
      const { id } = await addDemoCustomerRecord();
      setLastDemoCustomerId(id);
      setSyncInfo(`Added demo customer: ${id}`);
    } catch (e) {
      setSyncInfo(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateDemoCustomer = async () => {
    setIsSyncing(true);
    setSyncInfo('Updating demo customer...');
    try {
      const updated = await updateLastDemoCustomerRecord(lastDemoCustomerId);
      setSyncInfo(
        updated
          ? `Updated demo customer ${updated.id}: ${updated.city}`
          : 'No demo customer to update',
      );
    } catch (e) {
      setSyncInfo(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteDemoCustomer = async () => {
    setIsSyncing(true);
    setSyncInfo('Deleting demo customer...');
    try {
      const deleted = await deleteLastDemoCustomerRecord(lastDemoCustomerId);
      setLastDemoCustomerId(null);
      setSyncInfo(
        deleted
          ? `Deleted demo customer: ${deleted.id}`
          : 'No demo customer to delete',
      );
    } catch (e) {
      setSyncInfo(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSend = async () => {
    const currentSession = session;
    if (!currentSession) return;

    setIsSyncing(true);
    setSyncInfo('Sending...');
    try {
      await syncSend(currentSession);
      setSyncInfo('Sending: DONE. Syncing...');
      await syncPull(currentSession, progress => {
        setSyncInfo(`Syncing: ${Math.ceil(progress * 100)}%`);
      });
      setSyncInfo('Syncing: DONE');
    } catch (e) {
      setSyncInfo(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePull = async () => {
    const currentSession = session;
    if (!currentSession) return;

    setIsSyncing(true);
    setSyncInfo('Syncing...');
    try {
      await syncPull(currentSession, progress => {
        setSyncInfo(`Syncing: ${Math.ceil(progress * 100)}%`);
      });
      setSyncInfo('Syncing: DONE');
    } catch (e) {
      setSyncInfo(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    setIsSyncing(false);
    setSyncInfo(null);
    setSession(null);
    setLastDemoCustomerId(null);
    await logoutCleanup();
    await clearSession();
  };

  if (isBooting) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onLoggedIn={setSession} />;
  }

  return (
    <MainScreen
      session={session}
      onAddDemoCustomer={handleAddDemoCustomer}
      onUpdateDemoCustomer={handleUpdateDemoCustomer}
      onDeleteDemoCustomer={handleDeleteDemoCustomer}
      onSend={handleSend}
      onPull={handlePull}
      onLogout={handleLogout}
      isSyncing={isSyncing}
      syncInfo={syncInfo}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
