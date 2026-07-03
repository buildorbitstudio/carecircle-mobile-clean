import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';

import { colors, shadows } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type TabBarIconProps = {
  active: IconName;
  inactive: IconName;
  color: ColorValue;
  focused: boolean;
  size: number;
};

function TabBarIcon({ active, inactive, color, focused, size }: TabBarIconProps) {
  return <Ionicons color={color} name={focused ? active : inactive} size={size} />;
}

export default function FamilyTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 82,
          paddingBottom: 12,
          paddingTop: 10,
          ...shadows.subtle,
        },
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: (props) => <TabBarIcon {...props} active="home" inactive="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="pings"
        options={{
          title: 'Care Pings',
          tabBarIcon: (props) => (
            <TabBarIcon {...props} active="notifications" inactive="notifications-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: (props) => (
            <TabBarIcon {...props} active="calendar" inactive="calendar-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: (props) => (
            <TabBarIcon {...props} active="checkbox" inactive="checkbox-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: (props) => <TabBarIcon {...props} active="grid" inactive="grid-outline" />,
        }}
      />
    </Tabs>
  );
}
