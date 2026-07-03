import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppText, Screen } from '@/components/ui';
import {
  EmergencyContact,
  useEmergencyData,
} from '@/features/emergency/useEmergencyData';
import { colors, radius, spacing } from '@/theme';

export default function EmergencyScreen() {
  const { data, isLoading, isRefreshing, error, refresh, retry } = useEmergencyData();

  if (isLoading && !data) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <ActivityIndicator color={colors.danger} size="large" />
        <AppText color="inkMuted" style={styles.supportText}>
          Loading emergency information…
        </AppText>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen contentStyle={styles.centered} scroll={false}>
        <Ionicons color={colors.danger} name="cloud-offline" size={44} />
        <AppText align="center" style={styles.pageTitle}>
          Emergency information unavailable
        </AppText>
        <AppText align="center" color="inkMuted" style={styles.supportText}>
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </Screen>
    );
  }

  if (!data) return null;

  const doctorContacts = data.contacts.filter((contact) =>
    /(doctor|physician|clinic)/i.test(contact.relationship ?? ''),
  );

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <View style={styles.emergencyBanner}>
        <Ionicons color={colors.danger} name="warning" size={28} />
        <View style={styles.grow}>
          <AppText color="danger" style={styles.bannerTitle}>
            Life-threatening emergency?
          </AppText>
          <AppText color="danger" style={styles.bannerCopy}>
            Call emergency services immediately.
          </AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void callPhone('911', 'emergency services')}
        style={({ pressed }) => [styles.emergencyCall, pressed && styles.pressed]}>
        <Ionicons color={colors.white} name="call" size={27} />
        <AppText color="white" style={styles.emergencyCallText}>
          Call Emergency Services
        </AppText>
      </Pressable>

      <AppCard style={styles.identityCard}>
        {data.elder.photo_url ? (
          <Image
            alt={`${data.elder.full_name} profile photo`}
            source={{ uri: data.elder.photo_url }}
            style={styles.photo}
          />
        ) : (
          <View style={styles.photoFallback}>
            <Ionicons color={colors.primary} name="person" size={38} />
          </View>
        )}
        <View style={styles.grow}>
          <AppText style={styles.elderName}>{data.elder.full_name}</AppText>
          <AppText color="inkMuted" style={styles.identityText}>
            Date of birth:{' '}
            {data.elder.date_of_birth ? formatDate(data.elder.date_of_birth) : 'Not listed'}
          </AppText>
          {data.elder.date_of_birth ? (
            <AppText color="inkMuted" style={styles.identityText}>
              Age: {calculateAge(data.elder.date_of_birth)}
            </AppText>
          ) : null}
        </View>
      </AppCard>

      {error ? (
        <View accessibilityRole="alert" style={styles.warningNotice}>
          <AppText color="warning" variant="caption">
            Some information may be out of date. Pull down to retry.
          </AppText>
        </View>
      ) : null}

      <EmergencySection icon="warning" title="Allergies" urgent>
        {data.allergies.length ? (
          data.allergies.map((allergy, index) => (
            <View key={allergy.id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.record}>
                <View style={styles.grow}>
                  <AppText style={styles.recordTitle}>{allergy.allergy_name}</AppText>
                  <AppText color={allergy.severity === 'severe' ? 'danger' : 'warning'} style={styles.recordDetail}>
                    {capitalize(allergy.severity)} severity
                  </AppText>
                  {allergy.notes ? (
                    <AppText color="inkMuted" style={styles.recordDetail}>
                      {allergy.notes}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        ) : (
          <MissingValue text="No allergies listed" />
        )}
      </EmergencySection>

      <EmergencySection icon="fitness" title="Medical Conditions">
        {data.conditions.length ? (
          data.conditions.map((condition, index) => (
            <View key={condition.id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.record}>
                <AppText style={styles.bullet}>•</AppText>
                <View style={styles.grow}>
                  <AppText style={styles.recordTitle}>{condition.condition_name}</AppText>
                  {condition.notes ? (
                    <AppText color="inkMuted" style={styles.recordDetail}>
                      {condition.notes}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        ) : (
          <MissingValue text="No medical conditions listed" />
        )}
      </EmergencySection>

      <EmergencySection icon="medical" title="Current Medications">
        {data.medications.length ? (
          data.medications.map((medication, index) => (
            <View key={medication.id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.record}>
                <View style={styles.medicationIcon}>
                  <Ionicons color={colors.primary} name="medical" size={19} />
                </View>
                <View style={styles.grow}>
                  <AppText style={styles.recordTitle}>
                    {medication.name} {medication.dosage}
                  </AppText>
                  <AppText color="inkMuted" style={styles.recordDetail}>
                    {medication.frequency}
                  </AppText>
                  {medication.instructions ? (
                    <AppText color="inkMuted" style={styles.recordDetail}>
                      {medication.instructions}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        ) : (
          <MissingValue text="No current medications listed" />
        )}
      </EmergencySection>

      <EmergencySection icon="medkit" title="Doctor Contacts">
        {data.elder.primary_doctor ? (
          <View style={styles.record}>
            <View style={styles.grow}>
              <AppText color="inkMuted" style={styles.recordDetail}>
                Primary doctor
              </AppText>
              <AppText style={styles.recordTitle}>{data.elder.primary_doctor}</AppText>
            </View>
          </View>
        ) : null}
        {data.elder.primary_doctor && doctorContacts.length ? <Divider /> : null}
        {doctorContacts.map((contact, index) => (
          <View key={contact.id}>
            {index > 0 ? <Divider /> : null}
            <ContactRow contact={contact} />
          </View>
        ))}
        {!data.elder.primary_doctor && !doctorContacts.length ? (
          <MissingValue text="No doctor contacts listed" />
        ) : null}
      </EmergencySection>

      <EmergencySection icon="storefront" title="Pharmacy">
        {data.elder.pharmacy ? (
          <AppText style={styles.recordTitle}>{data.elder.pharmacy}</AppText>
        ) : (
          <MissingValue text="No pharmacy listed" />
        )}
      </EmergencySection>

      <EmergencySection icon="call" title="Emergency Contacts" urgent>
        {data.contacts.length ? (
          data.contacts.map((contact, index) => (
            <View key={contact.id}>
              {index > 0 ? <Divider /> : null}
              <ContactRow contact={contact} />
            </View>
          ))
        ) : (
          <MissingValue text="No emergency contacts listed" />
        )}
      </EmergencySection>

      <EmergencySection icon="shield-checkmark" title="Insurance Notes">
        {data.elder.notes ? (
          <AppText style={styles.notes}>{data.elder.notes}</AppText>
        ) : (
          <MissingValue text="No insurance notes listed" />
        )}
      </EmergencySection>

      <AppText align="center" color="inkMuted" variant="caption">
        CareCircle supports care coordination and does not replace emergency services.
      </AppText>
    </Screen>
  );
}

function EmergencySection({
  icon,
  title,
  urgent = false,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  urgent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={[styles.sectionIcon, urgent && styles.sectionIconUrgent]}>
          <Ionicons
            color={urgent ? colors.danger : colors.primary}
            name={icon}
            size={23}
          />
        </View>
        <AppText style={styles.sectionTitle}>{title}</AppText>
      </View>
      <AppCard style={urgent ? styles.urgentCard : undefined}>{children}</AppCard>
    </View>
  );
}

function ContactRow({ contact }: { contact: EmergencyContact }) {
  return (
    <Pressable
      accessibilityLabel={`Call ${contact.name} at ${contact.phone}`}
      accessibilityRole="button"
      onPress={() => void callPhone(contact.phone, contact.name)}
      style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}>
      <View style={styles.contactAvatar}>
        <AppText color="primary" variant="bodyStrong">
          {initials(contact.name)}
        </AppText>
      </View>
      <View style={styles.grow}>
        <AppText style={styles.recordTitle}>{contact.name}</AppText>
        <AppText color="inkMuted" style={styles.recordDetail}>
          {contact.relationship ?? 'Emergency contact'}
        </AppText>
        <AppText color="primary" style={styles.phone}>
          {contact.phone}
        </AppText>
      </View>
      <View style={styles.callIcon}>
        <Ionicons color={colors.white} name="call" size={22} />
      </View>
    </Pressable>
  );
}

function MissingValue({ text }: { text: string }) {
  return (
    <View style={styles.missing}>
      <Ionicons color={colors.inkMuted} name="remove-circle-outline" size={21} />
      <AppText color="inkMuted" style={styles.recordDetail}>
        {text}
      </AppText>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

async function callPhone(phone: string, label: string) {
  const callable = phone.replace(/[^\d+*#]/g, '');
  if (!callable) {
    Alert.alert('Phone number unavailable', `No valid phone number is listed for ${label}.`);
    return;
  }

  const url = `tel:${callable}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('Calling is not supported on this device.');
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to place call', `Call ${label} manually at ${phone}.`);
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function calculateAge(value: string) {
  const birth = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getUTCMonth() ||
    (today.getMonth() === birth.getUTCMonth() && today.getDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: spacing.lg,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  grow: { flex: 1, gap: 3 },
  pageTitle: { color: colors.ink, fontSize: 28, fontWeight: '700', lineHeight: 36 },
  supportText: { fontSize: 18, lineHeight: 26 },
  emergencyBanner: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: '#E9B8B5',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  bannerTitle: { fontSize: 19, fontWeight: '700', lineHeight: 25 },
  bannerCopy: { fontSize: 16, lineHeight: 23 },
  emergencyCall: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 62,
    paddingHorizontal: spacing.lg,
  },
  emergencyCallText: { fontSize: 19, fontWeight: '700', lineHeight: 26 },
  pressed: { opacity: 0.68 },
  identityCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  photo: { borderRadius: radius.pill, height: 72, width: 72 },
  photoFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  elderName: { fontSize: 26, fontWeight: '700', lineHeight: 33 },
  identityText: { fontSize: 16, lineHeight: 23 },
  warningNotice: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  section: { gap: spacing.md },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sectionIconUrgent: { backgroundColor: colors.dangerSoft },
  sectionTitle: { fontSize: 21, fontWeight: '700', lineHeight: 28 },
  urgentCard: { borderColor: '#E9B8B5' },
  record: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  recordTitle: { color: colors.ink, fontSize: 18, fontWeight: '600', lineHeight: 25 },
  recordDetail: { fontSize: 16, lineHeight: 23 },
  bullet: { color: colors.primary, fontSize: 24, lineHeight: 26 },
  medicationIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  contactRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 68 },
  contactAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  phone: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  callIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  missing: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  notes: { fontSize: 17, lineHeight: 26 },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
});
