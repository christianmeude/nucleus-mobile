import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Icon } from '../../components/ui/Icon';

import { useAuth } from '../../context/AuthContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Lock, MapPin, Mail, Shield } from 'lucide-react-native';

const RA_10173_URL = 'https://privacy.gov.ph/data-privacy-act/';
const NU_PRIVACY_POLICY_URL = 'https://www.national-u.edu.ph/data-privacy/';

export const PrivacyNoticeGate = ({ children }: { children: React.ReactNode }) => {
  const { isPrivacyAccepted, isLoading, acceptPrivacy } = usePrivacy();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);

  useEffect(() => {
    if (contentHeight > 0 && layoutHeight > 0) {
      if (contentHeight <= layoutHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [contentHeight, layoutHeight]);

  const canAccept = hasScrolledToBottom;

  if (isLoading) {
    return null; // Prevents layout flashing while checking storage
  }

  if (isPrivacyAccepted) {
    return <>{children}</>;
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (hasScrolledToBottom) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Generous threshold of 150px to prevent pixel rounding lockout
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 150;
    if (isBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!canAccept) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    acceptPrivacy();
  };

  const handleDecline = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await signOut();
  };

  const handleLink = async (url: string) => {
    await Linking.openURL(url);
  };

  const P = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <Text style={[styles.body, style]}>{children}</Text>
  );

  const Strong = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.strong}>{children}</Text>
  );

  const ListItem = ({ index, children }: { index: number; children: React.ReactNode }) => (
    <View style={styles.listItem}>
      <Text style={styles.listIndex}>{index}.</Text>
      <View style={styles.listContent}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 24, 48), paddingBottom: insets.bottom + 180 },
        ]}
        onScroll={handleScroll}
        onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        scrollEventThrottle={16}
        exiting={FadeOut.duration(300)}
      >
        <Animated.Image
          source={require('../../../assets/images/nu-dpo-seal.png.webp')}
          style={styles.seal}
          entering={FadeInDown.duration(400)}
        />

        <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.title}>
          National University Privacy Notice
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(400)} style={styles.subtitle}>
          Please read and accept before continuing
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
          <P>
            National University Dasmariñas values your privacy and is committed to protecting your
            personal information. By continuing with account creation on <Strong>NUCLEUS</Strong>{' '}
            (National University Capstone & Learning Electronic Unified System), you acknowledge
            that your data will be handled responsibly in accordance with applicable privacy
            regulations.
          </P>
          <View style={styles.divider} />
          <P>
            This notice applies to students, researchers, faculty, and staff who use NUCLEUS to
            submit, review, and publish academic research. We process personal data in compliance
            with the{' '}
            <Text style={styles.inlineLink} onPress={() => handleLink(RA_10173_URL)}>
              Data Privacy Act of 2012 (RA 10173)
            </Text>
            .
          </P>

          {/* 1 */}
          <Text style={styles.sectionTitle}>1. Personal Data We Collect</Text>
          <View style={styles.list}>
            <ListItem index={1}>
              <P>
                <Strong>Identity and contact details:</Strong> Full name, institutional email
                address, recovery email (optional), and account credentials.
              </P>
            </ListItem>
            <ListItem index={2}>
              <P>
                <Strong>Academic and student records:</Strong> Department, program, research
                submissions, co-author information, grades-related metadata, and publication
                details.
              </P>
            </ListItem>
            <ListItem index={3}>
              <P>
                <Strong>Research content:</Strong> Thesis documents, abstracts, annotations, review
                comments, and related files uploaded to the repository.
              </P>
            </ListItem>
            <ListItem index={4}>
              <P>
                <Strong>System and platform data:</Strong> Login timestamps, IP addresses, device
                and browser information, access logs, and audit trails for security and compliance.
              </P>
            </ListItem>
            <ListItem index={5}>
              <P>
                <Strong>Communications:</Strong> In-app notifications, email confirmations, and
                password recovery messages sent through institutional channels.
              </P>
            </ListItem>
          </View>

          {/* 2 */}
          <Text style={styles.sectionTitle}>2. Why We Process Your Personal Data</Text>
          <P>
            We process your personal data based on consent, contractual necessity, legitimate
            institutional interests, and compliance with legal obligations. Specifically, we use
            your data to:
          </P>
          <View style={styles.list}>
            <ListItem index={1}>
              <P>
                Verify your identity and institutional affiliation during registration and login.
              </P>
            </ListItem>
            <ListItem index={2}>
              <P>
                Enable research submission, peer review, approval workflows, and repository access.
              </P>
            </ListItem>
            <ListItem index={3}>
              <P>Maintain academic records, audit logs, and compliance with university policies.</P>
            </ListItem>
            <ListItem index={4}>
              <P>
                Send service-related notifications, including email confirmation and account
                updates.
              </P>
            </ListItem>
            <ListItem index={5}>
              <P>
                Protect the platform against unauthorized access, fraud, and security incidents.
              </P>
            </ListItem>
          </View>

          {/* 3 */}
          <Text style={styles.sectionTitle}>3. NUCLEUS and Digital Platforms</Text>
          <P>
            National University uses NUCLEUS and related digital platforms (including institutional
            portals and learning systems) to deliver academic and research services. Data may be
            collected through registration forms, portal entries, research submissions, and system
            logs.
          </P>
          <View style={styles.list}>
            <ListItem index={1}>
              <P>
                <Strong>Accounts and access:</Strong> Account creation, login and authentication,
                and role-based permissions for students, faculty, and staff.
              </P>
            </ListItem>
            <ListItem index={2}>
              <P>
                <Strong>Transactions:</Strong> Research submission and review workflows, co-author
                invitations, approval status updates, and repository access.
              </P>
            </ListItem>
            <ListItem index={3}>
              <P>
                <Strong>Logs and device data:</Strong> Access logs such as timestamps, IP addresses,
                and device or browser information for security and monitoring.
              </P>
            </ListItem>
            <ListItem index={4}>
              <P>
                <Strong>Support and audit:</Strong> Helpdesk requests, troubleshooting records, and
                audit trails for compliance and incident response.
              </P>
            </ListItem>
          </View>

          {/* 4 */}
          <Text style={styles.sectionTitle}>4. Sharing and Disclosure</Text>
          <P>
            National University does not sell your personal data. We share it only on a need-to-know
            basis, including:
          </P>
          <View style={styles.list}>
            <ListItem index={1}>
              <P>
                <Strong>Within NU:</Strong> Relevant offices and academic units involved in research
                review, enrollment verification, and institutional reporting.
              </P>
            </ListItem>
            <ListItem index={2}>
              <P>
                <Strong>Third-party service providers and partners:</Strong> Vendors that support IT
                infrastructure, cloud hosting, email delivery, and related services, subject to
                contractual safeguards.
              </P>
            </ListItem>
            <ListItem index={3}>
              <P>
                <Strong>Government and lawful requests:</Strong> Regulators, courts, or authorities
                when required by applicable law or valid legal process.
              </P>
            </ListItem>
          </View>

          {/* 5 */}
          <Text style={styles.sectionTitle}>5. Cross-Border Transfers</Text>
          <P>
            National University may use cloud service providers located outside the Philippines to
            operate NUCLEUS and related systems. When personal data is transferred abroad, we apply
            appropriate safeguards in accordance with the Data Privacy Act of 2012 and National
            University policies.
          </P>

          {/* 6 */}
          <Text style={styles.sectionTitle}>6. Retention and Disposal</Text>
          <P>
            We retain personal data for as long as necessary to fulfill the purposes stated in this
            notice, or as required by law, institutional policy, or legitimate business needs.
            Research records, audit logs, and academic submissions may be kept for the duration of
            your enrollment or employment and beyond where retention is required for compliance,
            historical reference, or legal obligations. When data is no longer needed, it is
            securely disposed of or anonymized in accordance with our retention schedule.
          </P>

          {/* 7 */}
          <Text style={styles.sectionTitle}>7. Security Measures</Text>
          <P>
            National University implements administrative, technical, and organizational safeguards
            to protect personal data, including:
          </P>
          <View style={styles.list}>
            <ListItem index={1}>
              <P>
                Role-based access controls and confidentiality obligations for authorized personnel.
              </P>
            </ListItem>
            <ListItem index={2}>
              <P>System security monitoring, logging, and incident response procedures.</P>
            </ListItem>
            <ListItem index={3}>
              <P>Technical safeguards such as encryption in transit and secure authentication.</P>
            </ListItem>
            <ListItem index={4}>
              <P>Training and awareness programs for personnel who handle personal data.</P>
            </ListItem>
          </View>

          {/* 8 */}
          <Text style={styles.sectionTitle}>8. Your Rights and How to Contact Us</Text>
          <P>
            Under the Data Privacy Act of 2012, you have the right to be informed, to access, to
            object, to erasure or blocking, to rectify, to file a complaint with the National
            Privacy Commission, and to damages. To exercise your rights or raise privacy concerns
            regarding NUCLEUS, you may contact the Data Privacy Office using the details below.
          </P>

          <View style={styles.dpoCard}>
            <View style={styles.dpoHeader}>
              <Icon icon={Lock} size={18} color={theme.colors.brand.primary} />
              <Text style={styles.dpoTitle}>Data Privacy Office</Text>
            </View>
            <View style={styles.dpoItem}>
              <Icon icon={MapPin} size={16} color={theme.colors.brand.primary} />
              <P>Governor's Drive, Sampaloc 1, City of Dasmariñas, Cavite 4114</P>
            </View>
            <View style={styles.dpoItem}>
              <Icon icon={Mail} size={16} color={theme.colors.brand.primary} />
              <P>
                <Strong>Main Contact:</Strong>{' '}
                <Text
                  style={styles.inlineLink}
                  onPress={() => handleLink('mailto:dpo@national-u.edu.ph')}
                >
                  dpo@national-u.edu.ph
                </Text>
              </P>
            </View>
            <View style={styles.dpoItem}>
              <Icon icon={Mail} size={16} color={theme.colors.brand.primary} />
              <P>
                <Strong>Campus Contact:</Strong>{' '}
                <Text
                  style={styles.inlineLink}
                  onPress={() => handleLink('mailto:cop@nu-dasma.edu.ph')}
                >
                  cop@nu-dasma.edu.ph
                </Text>
              </P>
            </View>
          </View>

          {/* 9 */}
          <Text style={styles.sectionTitle}>9. Full Data Privacy Policy</Text>
          <P>
            For the complete National University Data Privacy Policy, including contact details for
            the Data Protection Officer, please visit{' '}
            <Text style={styles.inlineLink} onPress={() => handleLink(NU_PRIVACY_POLICY_URL)}>
              National University Data Privacy Policy
            </Text>
            .
          </P>
        </Animated.View>
      </Animated.ScrollView>

      {/* Floating Bottom Bar */}
      <Animated.View
        entering={SlideInDown.delay(300).duration(400)}
        exiting={SlideOutDown.duration(300)}
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <BlurView
          intensity={80}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.bottomBarContent}>
          {!hasScrolledToBottom && (
            <View style={styles.scrollHint}>
              <Icon icon={Shield} size={12} color={theme.colors.brand.primary} />
              <Text style={styles.scrollHintText}>
                Scroll through the entire notice to enable acceptance.
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={handleDecline}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.acceptButton,
                pressed && canAccept && styles.acceptButtonPressed,
                !canAccept && styles.acceptButtonDisabled,
              ]}
              onPress={handleAccept}
            >
              <Text
                style={[styles.acceptButtonText, !canAccept && styles.acceptButtonTextDisabled]}
              >
                I Accept
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.surface.sunken,
    },
    scrollContent: {
      paddingHorizontal: t.spacing.lg,
    },
    seal: {
      width: 90,
      height: 90,
      alignSelf: 'center',
      marginBottom: t.spacing.md,
      resizeMode: 'contain',
    },
    title: {
      ...t.typography.h2,
      color: t.colors.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      ...t.typography.body,
      color: t.colors.text.muted,
      textAlign: 'center',
      marginBottom: t.spacing.xl,
      marginTop: t.spacing.xs,
    },
    card: {
      backgroundColor: t.colors.surface.base,
      borderRadius: t.radii.xl,
      borderCurve: 'continuous',
      padding: t.spacing.lg,
      ...t.shadows.level1,
      marginBottom: t.spacing.xl,
    },
    sectionTitle: {
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
      marginTop: t.spacing.xl,
      marginBottom: t.spacing.xs,
    },
    body: {
      ...t.typography.body,
      color: t.colors.text.secondary,
      lineHeight: 22,
    },
    strong: {
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
    },
    divider: {
      height: 1,
      backgroundColor: t.colors.border.subtle,
      marginVertical: t.spacing.lg,
    },
    inlineLink: {
      color: t.colors.brand.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    list: {
      gap: t.spacing.sm,
      marginTop: t.spacing.sm,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    listIndex: {
      ...t.typography.body,
      color: t.colors.text.secondary,
      width: 20,
    },
    listContent: {
      flex: 1,
    },
    dpoCard: {
      backgroundColor: t.colors.surface.sunken,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
      borderLeftWidth: 4,
      borderLeftColor: t.colors.brand.primary,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      padding: t.spacing.lg,
      marginTop: t.spacing.md,
      gap: t.spacing.md,
    },
    dpoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
    },
    dpoTitle: {
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
    },
    dpoItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.spacing.sm,
      paddingRight: t.spacing.lg,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.base + 'C0',
      overflow: 'hidden',
    },
    bottomBarContent: {
      paddingHorizontal: t.spacing.xl,
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing.xs,
    },
    scrollHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.xs,
      marginBottom: t.spacing.sm,
    },
    scrollHintText: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: t.spacing.md,
    },
    cancelButton: {
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.lg,
    },
    cancelButtonText: {
      ...t.typography.button,
      color: t.colors.text.secondary,
    },
    acceptButton: {
      backgroundColor: t.colors.brand.primary,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      height: 48,
      paddingHorizontal: t.spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
      ...t.shadows.level2,
      minWidth: 140,
    },
    acceptButtonDisabled: {
      backgroundColor: t.colors.surface.sunken,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
      shadowOpacity: 0,
      elevation: 0,
    },
    acceptButtonPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    acceptButtonText: {
      ...t.typography.button,
      color: t.colors.text.onBrand,
    },
    acceptButtonTextDisabled: {
      color: t.colors.text.disabled,
    },
  });
