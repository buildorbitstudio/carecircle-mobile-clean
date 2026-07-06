import { Redirect } from 'expo-router';
import { useState } from 'react';

import { AppButton, AppText, Screen, SectionHeader } from '@/components/ui';

export default function ErrorBoundaryTestScreen() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (!__DEV__) return <Redirect href="/" />;
  if (shouldThrow) {
    throw new Error('Controlled development error for Error Boundary verification.');
  }

  return (
    <Screen>
      <SectionHeader
        description="This development-only route verifies the global recovery experience."
        title="Error Boundary Test"
      />
      <AppText color="inkMuted">
        Triggering this error does not change care data or Supabase records.
      </AppText>
      <AppButton label="Trigger test error" onPress={() => setShouldThrow(true)} variant="danger" />
    </Screen>
  );
}
