import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Icon } from '../ui/Icon';
import { X, CheckSquare, Square } from 'lucide-react-native';



const PRIVACY_KEY = '@nucleus_privacy_accepted';
const ONBOARDING_KEY = 'firstRun.hasOnboarded';
const COACHMARKS_KEY = 'firstRun.seenCoachmarks';
const COACHMARK_IDS = ['bell', 'submitFab', 'browseTab'];

export const DevResetModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [requirePrivacy, setRequirePrivacy] = useState(false);
  const [requireOnboarding, setRequireOnboarding] = useState(false);
  const [requireCoachmarks, setRequireCoachmarks] = useState(false);

  useEffect(() => {
    if (visible) {
      AsyncStorage.multiGet([PRIVACY_KEY, ONBOARDING_KEY, COACHMARKS_KEY]).then((stores) => {
        setRequirePrivacy(stores[0][1] !== 'true');
        setRequireOnboarding(stores[1][1] !== 'true');
        
        // If there's no data, or empty array, it means they need to see coachmarks
        const coachmarksData = stores[2][1];
        if (!coachmarksData || coachmarksData === '[]') {
          setRequireCoachmarks(true);
        } else {
          try {
            const parsed = JSON.parse(coachmarksData);
            setRequireCoachmarks(!Array.isArray(parsed) || parsed.length === 0);
          } catch {
            setRequireCoachmarks(true);
          }
        }
      });
    }
  }, [visible]);

  const handleSave = async () => {
    try {
      // Privacy
      if (requirePrivacy) await AsyncStorage.removeItem(PRIVACY_KEY);
      else await AsyncStorage.setItem(PRIVACY_KEY, 'true');

      // Onboarding
      if (requireOnboarding) await AsyncStorage.removeItem(ONBOARDING_KEY);
      else await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

      // Coachmarks
      if (requireCoachmarks) await AsyncStorage.removeItem(COACHMARKS_KEY);
      else await AsyncStorage.setItem(COACHMARKS_KEY, JSON.stringify(COACHMARK_IDS));

      Alert.alert(
        'Dev Settings Saved', 
        'Please restart the Expo app (press "r" in the terminal) so the root navigator can properly re-initialize the FTUE states.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to update storage');
    }
  };

  const CheckboxItem = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <Pressable style={styles.checkboxRow} onPress={() => onChange(!value)}>
      <Icon icon={value ? CheckSquare : Square} size={24} color={value ? theme.colors.brand.primary : theme.colors.text.muted} />
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>[DEV] FTUE Simulator</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Icon icon={X} size={24} color={theme.colors.text.secondary} />
            </Pressable>
          </View>

          <Text style={styles.desc}>
            Check the items you want to strictly APPEAR on the next app launch. Unchecked items will be silently marked as completed.
          </Text>

          <View style={styles.list}>
            <CheckboxItem label="Require Privacy Clause" value={requirePrivacy} onChange={setRequirePrivacy} />
            <CheckboxItem label="Require Student Onboarding" value={requireOnboarding} onChange={setRequireOnboarding} />
            <CheckboxItem label="Require Coachmarks" value={requireCoachmarks} onChange={setRequireCoachmarks} />
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save & Restart App</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: t.spacing.xl,
    },
    card: {
      backgroundColor: t.colors.surface.base,
      borderRadius: t.radii.xl,
      padding: t.spacing.xl,
      width: '100%',
      ...t.shadows.level2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: t.spacing.md,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.brand.primary,
    },
    closeBtn: {
      padding: t.spacing.xs,
    },
    desc: {
      ...t.typography.bodySmall,
      color: t.colors.text.secondary,
      marginBottom: t.spacing.xl,
    },
    list: {
      gap: t.spacing.lg,
      marginBottom: t.spacing['2xl'],
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.md,
    },
    checkboxLabel: {
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
    },
    saveBtn: {
      backgroundColor: t.colors.brand.primary,
      paddingVertical: t.spacing.md,
      borderRadius: t.radii.lg,
      alignItems: 'center',
    },
    saveBtnText: {
      ...t.typography.button,
      color: t.colors.text.onBrand,
    },
  });
