import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Check, ChevronDown, ChevronLeft, CircleAlert, CircleCheck, CloudUpload, FileText, Plus, Search, X,  } from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  DepartmentRow,
  FacultyMember,
  ProgramRow,
  StudentSearchResult,
  SubmitDraftFormState,
  SubmitDraftPayload,
  SubmitFileInput,
  researchApi,
  submitApi,
} from '../../api/research';
import { Category, ResearchPaper, SubmissionPolicy } from '../../types/domain';
import { theme } from '../../theme';
import {
  BottomSheet,
  BottomSheetScrollView,
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  InlineNotice,
  Skeleton,
} from '../../components/ui';
import { RootStackParamList } from '../../navigation/types';
import { usePushNotifications } from '../../hooks/usePushNotifications';

type SubmitNav = NativeStackNavigationProp<RootStackParamList, 'SubmitResearch'>;
type SubmitRoute = RouteProp<RootStackParamList, 'SubmitResearch'>;

type PickerKind = 'category' | 'department' | 'program' | 'faculty';

const DRAFT_KEY_PREFIX = 'submission_draft_';
const AUTOSAVE_INTERVAL_MS = 30_000;

const EMPTY_FORM: SubmitDraftFormState = {
  title: '',
  abstract: '',
  keywords: '',
  coAuthors: '',
  category: '',
  facultyId: '',
  department: '',
  departmentId: '',
  program: '',
  programId: '',
};

const draftStorageKey = (resubmitPaperId?: string) =>
  `${DRAFT_KEY_PREFIX}${resubmitPaperId || 'new'}`;

// Policy-driven MIME mapping mirrors the web `TYPE_TO_MIME` constant in
// `frontend/src/pages/student/SubmitResearch.jsx`. We only constrain the picker
// to known MIME types when policy lists supported entries; unknown extensions
// fall back to '*/*' so the user can still select and we re-validate by
// extension after pick.
const TYPE_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const pickerAcceptTypes = (allowed: string[]): string | string[] => {
  const mimes = allowed
    .map((entry) => TYPE_TO_MIME[entry.toLowerCase()])
    .filter(Boolean);
  return mimes.length > 0 ? mimes : '*/*';
};

const externalNotesFromPaper = (paper?: ResearchPaper | null): string => {
  const value = paper?.external_author_notes;
  if (!value) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
};

const structuredCoAuthorsFromPaper = (paper?: ResearchPaper | null): StudentSearchResult[] => {
  if (!paper?.structured_authors) return [];
  return paper.structured_authors
    .filter((entry) => !entry?.is_primary && entry?.author?.id)
    .map((entry) => ({
      id: entry.author!.id as string,
      email: entry.author!.email,
      fullName:
        entry.author!.fullName ||
        entry.author!.name ||
        [entry.author!.first_name, entry.author!.middle_name, entry.author!.last_name]
          .filter(Boolean)
          .join(' ') ||
        entry.author!.email ||
        'Unknown',
      program: null,
    }));
};

const FormSection = ({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHead}>
      <View style={styles.cardNum}>
        <Text style={styles.cardNumText}>{number}</Text>
      </View>
      <Text style={styles.cardHeadText}>{title}</Text>
    </View>
    <View style={styles.cardBody}>{children}</View>
  </View>
);

export const SubmitResearchScreen = () => {
  const navigation = useNavigation<SubmitNav>();
  const route = useRoute<SubmitRoute>();
  const { requestAndRegisterPushToken } = usePushNotifications();
  const resubmitPaperId = route.params?.resubmitPaperId;
  const isResubmit = Boolean(resubmitPaperId);
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<SubmitDraftFormState>(EMPTY_FORM);
  const [selectedCoAuthors, setSelectedCoAuthors] = useState<StudentSearchResult[]>([]);
  const [file, setFile] = useState<SubmitFileInput | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [resubmitPaper, setResubmitPaper] = useState<ResearchPaper | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);
  const [policy, setPolicy] = useState<SubmissionPolicy>({
    maxFileSizeMb: 10,
    allowedFileTypes: ['pdf'],
  });

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const categorySheetRef = useRef<BottomSheetModal>(null);
  const departmentSheetRef = useRef<BottomSheetModal>(null);
  const programSheetRef = useRef<BottomSheetModal>(null);
  const facultySheetRef = useRef<BottomSheetModal>(null);
  const checklistSheetRef = useRef<BottomSheetModal>(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [draftSyncMessage, setDraftSyncMessage] = useState('');

  // Keep the latest snapshot in a ref for the autosave interval without re-arming on every keystroke.
  const latestStateRef = useRef({ formData, selectedCoAuthors, file, submitting });
  useEffect(() => {
    latestStateRef.current = { formData, selectedCoAuthors, file, submitting };
  }, [formData, selectedCoAuthors, file, submitting]);

  const setFormField = useCallback(<K extends keyof SubmitDraftFormState>(
    key: K,
    value: SubmitDraftFormState[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Bootstrap: policy / categories / departments / draft / resubmit hydrate ───
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setBootstrapping(true);
      try {
        const [policyResult, categoriesResult, departmentsResult] = await Promise.all([
          submitApi.getSubmissionPolicy(),
          researchApi.getCategories(),
          submitApi.getDepartments(),
        ]);

        if (cancelled) return;

        setPolicy(policyResult);
        setCategories(categoriesResult);
        setDepartments(departmentsResult);

        // Resubmit hydrate (web parity: pre-populate form, keep file optional).
        if (resubmitPaperId) {
          try {
            const detail = await researchApi.getResearchById(resubmitPaperId);
            if (cancelled) return;
            const paper = detail.paper;
            setResubmitPaper(paper);
            setFormData((prev) => ({
              ...prev,
              title: paper.title || '',
              abstract: paper.abstract || '',
              keywords: Array.isArray(paper.keywords) ? paper.keywords.join(', ') : '',
              coAuthors: externalNotesFromPaper(paper),
              category: paper.category || '',
              facultyId: '',
              department: paper.department || '',
              departmentId: paper.department_id || '',
              program: paper.program?.name || '',
              programId: paper.program_id || '',
            }));
            const structured = structuredCoAuthorsFromPaper(paper);
            if (structured.length > 0) {
              setSelectedCoAuthors(structured);
            }
          } catch (error) {
            console.warn('[SubmitResearch] resubmit hydrate failed:', error);
          }
        }

        // Local draft restore.
        try {
          const localRaw = await AsyncStorage.getItem(draftStorageKey(resubmitPaperId));
          if (localRaw && !cancelled) {
            const parsed = JSON.parse(localRaw) as SubmitDraftPayload;
            if (parsed?.formData) {
              setFormData((prev) => ({ ...prev, ...parsed.formData }));
            }
            if (Array.isArray(parsed?.selectedCoAuthors) && parsed.selectedCoAuthors.length > 0) {
              setSelectedCoAuthors(parsed.selectedCoAuthors);
            }
          }
        } catch (error) {
          console.warn('[SubmitResearch] local draft restore failed:', error);
        }

        // Server draft restore (overrides local when present, mirrors web behavior).
        try {
          const serverDraft = await submitApi.getMyDraft(resubmitPaperId || null);
          if (serverDraft && !cancelled) {
            if (serverDraft.formData) {
              setFormData((prev) => ({ ...prev, ...serverDraft.formData }));
            }
            if (
              Array.isArray(serverDraft.selectedCoAuthors) &&
              serverDraft.selectedCoAuthors.length > 0
            ) {
              setSelectedCoAuthors(serverDraft.selectedCoAuthors);
            }
            if (!cancelled) setDraftSyncMessage('Draft restored');
          }
        } catch (error) {
          console.warn('[SubmitResearch] server draft restore failed:', error);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [resubmitPaperId]);

  // ─── Faculty refetch when department changes ───
  // Powered by the get_faculty_members SECURITY DEFINER RPC. Empty results may
  // mean "no faculty in this department" or a silent RPC error; both surface
  // through the picker's EmptyState rather than a dedicated availability flag,
  // since the API contract returns [] in either case.
  useEffect(() => {
    let cancelled = false;
    const loadFaculty = async () => {
      const list = await submitApi.getFacultyMembers({
        department: formData.department || undefined,
        departmentId: formData.departmentId || undefined,
      });
      if (cancelled) return;
      setFacultyMembers(list);
    };
    loadFaculty();
    return () => {
      cancelled = true;
    };
  }, [formData.department, formData.departmentId]);

  // ─── Programs cascade when department changes ───
  // Mirrors the web cascade: picking a program implies its parent department
  // (submission routes by the program's department). The list is scoped to the
  // chosen department; an empty program set means the department has no active
  // programs (optional field), rendered as an EmptyState hint in the picker.
  useEffect(() => {
    let cancelled = false;
    const loadPrograms = async () => {
      const list = await submitApi.getPrograms(formData.departmentId || null);
      if (cancelled) return;
      setPrograms(list);
    };
    loadPrograms();
    return () => {
      cancelled = true;
    };
  }, [formData.departmentId]);

  // ─── Draft autosave (local + best-effort server) ───
  useEffect(() => {
    const interval = setInterval(async () => {
      const snap = latestStateRef.current;
      if (snap.submitting) return;

      const hasContent =
        snap.formData.title.trim().length > 0 ||
        snap.formData.abstract.trim().length > 0 ||
        snap.formData.keywords.trim().length > 0 ||
        snap.formData.coAuthors.trim().length > 0 ||
        Boolean(snap.formData.category) ||
        Boolean(snap.formData.facultyId) ||
        Boolean(snap.formData.departmentId) ||
        Boolean(snap.formData.programId) ||
        snap.selectedCoAuthors.length > 0;

      if (!hasContent) return;

      const payload: SubmitDraftPayload = {
        formData: snap.formData,
        selectedCoAuthors: snap.selectedCoAuthors,
        hasNewFile: Boolean(snap.file),
        updatedAt: new Date().toISOString(),
      };

      try {
        await AsyncStorage.setItem(
          draftStorageKey(resubmitPaperId),
          JSON.stringify(payload)
        );
      } catch (error) {
        console.warn('[SubmitResearch] local draft write failed:', error);
      }

      const result = await submitApi.saveMyDraft(resubmitPaperId || null, payload);
      const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setDraftSyncMessage(
        result.persisted ? `Draft synced at ${stamp}` : `Draft saved locally at ${stamp}`
      );
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [resubmitPaperId]);

  // ─── Co-author search (debounced via input) ───
  // Powered by the search_students SECURITY DEFINER RPC. As with faculty, the
  // RPC contract returns [] for both "no matches" and silent error, so we do
  // not show a separate availability notice; an empty dropdown is the
  // consistent UX for both cases.
  useEffect(() => {
    const trimmed = studentSearchQuery.trim();
    if (trimmed.length < 2) {
      setStudentSearchResults([]);
      return;
    }

    let cancelled = false;
    setStudentSearchLoading(true);
    const handle = setTimeout(async () => {
      const results = await submitApi.searchStudents(trimmed);
      if (cancelled) return;
      setStudentSearchResults(results);
      setStudentSearchLoading(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [studentSearchQuery]);

  const addCoAuthor = useCallback((student: StudentSearchResult) => {
    setSelectedCoAuthors((prev) => {
      if (prev.find((entry) => entry.id === student.id)) return prev;
      return [...prev, student];
    });
    setStudentSearchQuery('');
    setStudentSearchResults([]);
  }, []);

  const removeCoAuthor = useCallback((studentId: string) => {
    setSelectedCoAuthors((prev) => prev.filter((entry) => entry.id !== studentId));
  }, []);

  // ─── Derived UI state ───
  const categoryLabel = useMemo(() => {
    if (!formData.category) return 'Select category';
    const matched = categories.find((entry) => entry.id === formData.category);
    return matched?.name || `${formData.category} (legacy)`;
  }, [formData.category, categories]);

  const departmentLabel = useMemo(() => {
    if (!formData.departmentId && !formData.department) return 'Select department (optional)';
    const matchedById = departments.find((d) => d.id === formData.departmentId);
    return matchedById?.name || formData.department || 'Select department (optional)';
  }, [formData.department, formData.departmentId, departments]);

  const programLabel = useMemo(() => {
    if (!formData.programId) return 'Select program (optional)';
    const matchedById = programs.find((p) => p.id === formData.programId);
    return matchedById?.name || formData.program || 'Select program (optional)';
  }, [formData.program, formData.programId, programs]);

  const facultyLabel = useMemo(() => {
    if (!formData.facultyId) return 'Select faculty adviser';
    const matched = facultyMembers.find((entry) => entry.id === formData.facultyId);
    return matched?.fullName || 'Faculty adviser';
  }, [formData.facultyId, facultyMembers]);

  const allowedTypesLabel = policy.allowedFileTypes.map((t) => `.${t}`).join(', ');
  const policyLine = `${allowedTypesLabel} • Max ${policy.maxFileSizeMb} MB`;

  // Per Phase 2 §3 — implement the stricter rule: adviser is required.
  const checklistItems = useMemo(
    () => [
      {
        key: 'pdf',
        label: 'File attached',
        done: Boolean(file) || Boolean(isResubmit && resubmitPaper?.file_url),
      },
      { key: 'title', label: 'Research title provided', done: Boolean(formData.title.trim()) },
      { key: 'abstract', label: 'Abstract provided', done: Boolean(formData.abstract.trim()) },
      { key: 'category', label: 'Category selected', done: Boolean(formData.category) },
      { key: 'faculty', label: 'Faculty adviser selected', done: Boolean(formData.facultyId) },
    ],
    [file, isResubmit, resubmitPaper, formData.title, formData.abstract, formData.category, formData.facultyId]
  );

  const checklistComplete = checklistItems.every((item) => item.done);
  
  const step1Complete = checklistItems[0].done;
  const step2Complete = checklistItems[1].done && checklistItems[2].done;
  const step3Complete = checklistItems[3].done && checklistItems[4].done;
  const step4Complete = true;

  // ─── Submit pipeline ───
  const performSubmit = useCallback(async () => {
    setSubmitError('');
    setSubmitSuccess(false);
    setSubmitting(true);

    try {
      const result = await submitApi.submitResearch({
        id: resubmitPaperId,
        file,
        title: formData.title,
        abstract: formData.abstract,
        keywords: formData.keywords,
        coAuthors: formData.coAuthors,
        externalAuthorNotes: formData.coAuthors,
        category: formData.category,
        facultyId: formData.facultyId,
        department: formData.department,
        departmentId: formData.departmentId,
        programId: formData.programId,
        coAuthorIds: selectedCoAuthors.map((entry) => entry.id),
      });

      // Frozen contract rule 9: invitations are best-effort, never block primary submit.
      if (selectedCoAuthors.length > 0 && result.paper?.id) {
        try {
          await submitApi.createCoAuthorInvitations(
            result.paper.id,
            selectedCoAuthors.map((entry) => entry.id)
          );
        } catch (error) {
          console.warn('[SubmitResearch] invitation side effect failed:', error);
        }
      }

      // Cleanup drafts (local + server) on success.
      try {
        await AsyncStorage.removeItem(draftStorageKey(resubmitPaperId));
      } catch (error) {
        console.warn('[SubmitResearch] local draft cleanup failed:', error);
      }
      await submitApi.deleteMyDraft(resubmitPaperId || null);

      // Request push notifications contextually on first submission success
      await requestAndRegisterPushToken();

      setSubmitSuccess(true);
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('StudentTabs');
        }
      }, 1500);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit research.');
    } finally {
      setSubmitting(false);
    }
  }, [
    resubmitPaperId,
    file,
    formData,
    selectedCoAuthors,
    navigation,
  ]);

  const handleSubmitPress = () => {
    setSubmitError('');
    checklistSheetRef.current?.present();
  };

  const handleConfirmChecklist = async () => {
    if (!checklistComplete) return;
    checklistSheetRef.current?.dismiss();
    await performSubmit();
  };

  const handleChooseFile = useCallback(async () => {
    setSubmitError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: pickerAcceptTypes(policy.allowedFileTypes),
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setSubmitError('Could not read the selected file. Please try again.');
        return;
      }

      const inferredName = asset.name || asset.uri.split('/').pop() || 'document';
      const ext = (inferredName.split('.').pop() || '').toLowerCase();
      const allowed = policy.allowedFileTypes.map((entry) => entry.toLowerCase());
      if (allowed.length > 0 && !allowed.includes(ext)) {
        setSubmitError(
          `Unsupported file type${ext ? ` ".${ext}"` : ''}. Allowed: ${allowed
            .map((value) => `.${value}`)
            .join(', ')}.`
        );
        return;
      }

      const sizeBytes = typeof asset.size === 'number' ? asset.size : 0;
      const maxBytes = policy.maxFileSizeMb * 1024 * 1024;
      if (sizeBytes > maxBytes) {
        setSubmitError(
          `File is too large (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB). Max allowed is ${policy.maxFileSizeMb} MB.`
        );
        return;
      }

      setFile({
        uri: asset.uri,
        name: inferredName,
        size: sizeBytes,
        mimeType: asset.mimeType || TYPE_TO_MIME[ext] || 'application/octet-stream',
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not open the file picker.'
      );
    }
  }, [policy.allowedFileTypes, policy.maxFileSizeMb]);

  const submitDisabled =
    bootstrapping || submitting || submitSuccess || !checklistComplete;

  // ─── Render ───
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.headerRow, { paddingTop: insets.top + theme.spacing.xs }]}>
          <View style={styles.navRow}>
            <Pressable
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : null)}
              accessibilityLabel="Back"
              accessibilityRole="button"
              style={styles.backButton}
            >
              <Icon icon={ChevronLeft} size={22} color={theme.colors.brand.primary} />
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
            {draftSyncMessage ? (
              <View style={styles.autosave}>
                <View style={styles.autosaveDot} />
                <Text style={styles.autosaveText}>{draftSyncMessage}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>
            {isResubmit ? 'Resubmit Research' : 'Submit Research'}
          </Text>
          <Text style={styles.subtitle}>
            Step {currentStep} of 4
          </Text>
        </View>

        {bootstrapping ? (
          <View style={styles.skeletonStack}>
            <Skeleton height={64} />
            <Skeleton height={120} />
            <Skeleton height={80} />
          </View>
        ) : (
          <>
            {isResubmit && resubmitPaper?.revision_notes ? (
              <Card padding="md">
                <Text style={styles.revisionTitle}>Reviewer revision notes</Text>
                <Text style={styles.revisionBody}>{resubmitPaper.revision_notes}</Text>
              </Card>
            ) : null}

            {/* Attachment */}
            {currentStep === 1 && (
            <FormSection number={1} title="Attachment">
              {file ? (
                <View style={styles.fileRow}>
                  <Icon
                    icon={FileText}
                    size={28}
                    color={theme.colors.brand.primary}
                  />
                  <View style={styles.fileMeta}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setFile(null)}
                    accessibilityLabel="Remove file"
                    accessibilityRole="button"
                  >
                    <Icon icon={X} size={20} color={theme.colors.text.muted} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleChooseFile}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isResubmit && resubmitPaper?.file_url ? 'Replace file' : 'Upload your paper'
                  }
                  style={({ pressed }) => [styles.upload, pressed && styles.uploadPressed]}
                >
                  <View style={styles.uploadIcon}>
                    <Icon icon={CloudUpload} size={22} color={theme.colors.brand.primary} />
                  </View>
                  <Text style={styles.uploadPrompt}>
                    {isResubmit && resubmitPaper?.file_url ? 'Replace file' : 'Upload your paper'}
                  </Text>
                  <Text style={styles.uploadHint}>
                    {isResubmit && resubmitPaper?.file_url
                      ? 'Keeping current file unless replaced'
                      : policyLine}
                  </Text>
                </Pressable>
              )}
            </FormSection>
            )}

            {/* Paper details */}
            {currentStep === 2 && (
            <FormSection number={2} title="Paper details">
            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>Research title *</Text>
              <TextInput
                value={formData.title}
                onChangeText={(text) => setFormField('title', text)}
                placeholder="Enter your research title"
                placeholderTextColor={theme.colors.text.disabled}
                style={styles.input}
                accessibilityLabel="Research title"
                editable={!submitting}
              />
            </View>

            {/* Abstract */}
            <View style={styles.section}>
              <Text style={styles.label}>Abstract *</Text>
              <TextInput
                value={formData.abstract}
                onChangeText={(text) => setFormField('abstract', text)}
                placeholder="Provide a comprehensive summary of your research"
                placeholderTextColor={theme.colors.text.disabled}
                style={[styles.input, styles.textarea]}
                multiline
                numberOfLines={6}
                accessibilityLabel="Abstract"
                editable={!submitting}
              />
              <Text style={styles.helperText}>
                {formData.abstract.split(/\s+/).filter(Boolean).length} words • Recommended 150–250
              </Text>
            </View>

            {/* Keywords */}
            <View style={styles.section}>
              <Text style={styles.label}>Keywords</Text>
              <TextInput
                value={formData.keywords}
                onChangeText={(text) => setFormField('keywords', text)}
                placeholder="e.g. machine learning, education, statistics"
                placeholderTextColor={theme.colors.text.disabled}
                style={styles.input}
                accessibilityLabel="Keywords"
                editable={!submitting}
              />
              <Text style={styles.helperText}>Separate with commas — improves discoverability.</Text>
            </View>

            </FormSection>
            )}

            {/* Classification */}
            {currentStep === 3 && (
            <FormSection number={3} title="Classification">
            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.label}>Research category *</Text>
              <Pressable
                onPress={() => categorySheetRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Select research category"
                style={styles.selectField}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.selectFieldLabel,
                    !formData.category && styles.selectFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {categoryLabel}
                </Text>
                <Icon icon={ChevronDown} size={18} color={theme.colors.text.muted} />
              </Pressable>
            </View>

            {/* Department */}
            <View style={styles.section}>
              <Text style={styles.label}>Department</Text>
              <Pressable
                onPress={() => departmentSheetRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Select department"
                style={styles.selectField}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.selectFieldLabel,
                    !formData.departmentId && styles.selectFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {departmentLabel}
                </Text>
                <Icon icon={ChevronDown} size={18} color={theme.colors.text.muted} />
              </Pressable>
              <Text style={styles.helperText}>
                Helps route your submission to the right reviewer.
              </Text>
            </View>

            {/* Program (optional, cascades from department) */}
            <View style={styles.section}>
              <Text style={styles.label}>Program</Text>
              <Pressable
                onPress={() => programSheetRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Select program"
                style={[
                  styles.selectField,
                  !formData.departmentId && styles.selectFieldDisabled,
                ]}
                disabled={!formData.departmentId || submitting}
              >
                <Text
                  style={[
                    styles.selectFieldLabel,
                    !formData.programId && styles.selectFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {programLabel}
                </Text>
                <Icon icon={ChevronDown} size={18} color={theme.colors.text.muted} />
              </Pressable>
              <Text style={styles.helperText}>
                {formData.departmentId
                  ? 'Select the academic program for this research (optional).'
                  : 'Select a department first to list its programs.'}
              </Text>
            </View>

            {/* Faculty adviser (required by stricter checklist rule) */}
            <View style={styles.section}>
              <Text style={styles.label}>Faculty adviser *</Text>
              <Pressable
                onPress={() => facultySheetRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Select faculty adviser"
                style={styles.selectField}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.selectFieldLabel,
                    !formData.facultyId && styles.selectFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {facultyLabel}
                </Text>
                <Icon icon={ChevronDown} size={18} color={theme.colors.text.muted} />
              </Pressable>
              <Text style={styles.helperText}>
                Required: your adviser is the first reviewer of your submission.
              </Text>
            </View>

            </FormSection>
            )}

            {/* Co-authors */}
            {currentStep === 4 && (
            <>
            <FormSection number={4} title="Co-authors">
            {/* Co-authors search */}
            <View style={styles.section}>
              <Text style={styles.label}>Co-authors</Text>
              {selectedCoAuthors.length > 0 ? (
                <View style={styles.chipRow}>
                  {selectedCoAuthors.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onPress={() => removeCoAuthor(entry.id)}
                      style={styles.coAuthorChip}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${entry.fullName}`}
                    >
                      <Text style={styles.coAuthorChipText} numberOfLines={1}>
                        {entry.fullName}
                      </Text>
                      <Icon icon={X} size={14} color={theme.colors.brand.primary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.searchWrap}>
                <Icon icon={Search} size={18} color={theme.colors.text.muted} />
                <TextInput
                  value={studentSearchQuery}
                  onChangeText={setStudentSearchQuery}
                  placeholder="Search students by name or email"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={styles.searchInput}
                  accessibilityLabel="Search co-authors"
                  editable={!submitting}
                />
                {studentSearchLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                ) : null}
              </View>

              {studentSearchResults.length > 0 ? (
                <Card padding="sm">
                  {studentSearchResults.map((student) => {
                    const alreadySelected = Boolean(
                      selectedCoAuthors.find((entry) => entry.id === student.id)
                    );
                    return (
                      <Pressable
                        key={student.id}
                        onPress={() => !alreadySelected && addCoAuthor(student)}
                        style={styles.searchResultRow}
                        disabled={alreadySelected}
                      >
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName}>{student.fullName}</Text>
                          {student.email ? (
                            <Text style={styles.searchResultEmail}>{student.email}</Text>
                          ) : null}
                        </View>
                        {alreadySelected ? (
                          <Icon
                            icon={Check}
                            size={18}
                            color={theme.colors.state.success}
                          />
                        ) : (
                          <Icon icon={Plus} size={18} color={theme.colors.brand.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </Card>
              ) : null}
            </View>

            </FormSection>

            {/* Notes */}
            <FormSection number={5} title="Notes">
            {/* External author notes */}
            <View style={styles.section}>
              <Text style={styles.label}>External / non-system co-author notes</Text>
              <TextInput
                value={formData.coAuthors}
                onChangeText={(text) => setFormField('coAuthors', text)}
                placeholder="External collaborators not in the system (comma-separated)"
                placeholderTextColor={theme.colors.text.disabled}
                style={styles.input}
                accessibilityLabel="External co-author notes"
                editable={!submitting}
              />
              <Text style={styles.helperText}>
                Stored separately from structured co-authorship.
              </Text>
            </View>
            </FormSection>
            </>
            )}

            {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
            {submitSuccess ? (
              <InlineNotice
                tone="success"
                message={
                  isResubmit
                    ? 'Research resubmitted successfully.'
                    : 'Research submitted successfully.'
                }
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {!bootstrapping ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.md }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {currentStep > 1 && (
              <Pressable
                onPress={() => setCurrentStep(prev => prev - 1)}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.submit,
                  { flex: 1, backgroundColor: theme.colors.surface.sunken, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border.subtle },
                  pressed && { opacity: 0.7 }
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back to previous step"
              >
                <Text style={[styles.submitText, { color: theme.colors.text.primary }]}>
                  Back
                </Text>
              </Pressable>
            )}
            
            {currentStep < 4 ? (
              <Pressable
                onPress={() => setCurrentStep(prev => prev + 1)}
                disabled={(currentStep === 1 && !step1Complete) || (currentStep === 2 && !step2Complete) || (currentStep === 3 && !step3Complete) || submitting}
                style={({ pressed }) => [
                  styles.submit,
                  { flex: 2 },
                  ((currentStep === 1 && !step1Complete) || (currentStep === 2 && !step2Complete) || (currentStep === 3 && !step3Complete)) && styles.submitDisabled,
                  pressed && styles.submitPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Continue to next step"
              >
                <Text style={[styles.submitText, ((currentStep === 1 && !step1Complete) || (currentStep === 2 && !step2Complete) || (currentStep === 3 && !step3Complete)) && styles.submitTextDisabled]}>
                  Continue
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSubmitPress}
                disabled={submitDisabled}
                style={({ pressed }) => [
                  styles.submit,
                  { flex: 2 },
                  submitDisabled && styles.submitDisabled,
                  pressed && !submitDisabled && styles.submitPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isResubmit ? 'Review and update' : 'Review and submit'}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={theme.colors.text.onBrand} />
                ) : null}
                <Text style={[styles.submitText, submitDisabled && styles.submitTextDisabled]}>
                  {isResubmit ? 'Review & update' : 'Review & submit'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      {/* Pickers */}
      <BottomSheet ref={categorySheetRef} snapPoints={['50%', '90%']}>
        <Text style={styles.sheetTitle}>Select category</Text>
        <BottomSheetScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.sheetList}>
          {categories.length === 0 ? (
            <EmptyState title="No categories available" />
          ) : (
            categories.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => {
                  setFormField('category', entry.id);
                  categorySheetRef.current?.dismiss();
                }}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetRowLabel}>{entry.name}</Text>
                {formData.category === entry.id ? (
                  <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet ref={departmentSheetRef} snapPoints={['50%', '90%']}>
        <Text style={styles.sheetTitle}>Select department</Text>
        <BottomSheetScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.sheetList}>
          <Pressable
            onPress={() => {
              setFormField('department', '');
              setFormField('departmentId', '');
              departmentSheetRef.current?.dismiss();
            }}
            style={styles.sheetRow}
          >
            <Text style={styles.sheetRowLabel}>None</Text>
            {!formData.departmentId ? (
              <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
            ) : null}
          </Pressable>
          {departments.length === 0 ? (
            <EmptyState
              title="No departments available"
              message="Department selection is optional."
            />
          ) : (
            departments.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => {
                  setFormField('departmentId', entry.id);
                  setFormField('department', entry.name);
                  setFormField('facultyId', '');
                  setFormField('programId', '');
                  setFormField('program', '');
                  departmentSheetRef.current?.dismiss();
                }}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetRowLabel}>
                  {entry.code ? `${entry.code} — ` : ''}
                  {entry.name}
                </Text>
                {formData.departmentId === entry.id ? (
                  <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet ref={programSheetRef} snapPoints={['50%', '90%']}>
        <Text style={styles.sheetTitle}>Select program</Text>
        <Text style={styles.sheetIntro}>
          {departmentLabel === 'Select department (optional)'
            ? 'Select a department first.'
            : `Programs in ${departmentLabel}`}
        </Text>
        <BottomSheetScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.sheetList}>
          <Pressable
            onPress={() => {
              setFormField('program', '');
              setFormField('programId', '');
              programSheetRef.current?.dismiss();
            }}
            style={styles.sheetRow}
          >
            <Text style={styles.sheetRowLabel}>None</Text>
            {!formData.programId ? (
              <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
            ) : null}
          </Pressable>
          {formData.departmentId && programs.length === 0 ? (
            <EmptyState
              title="No programs available"
              message="This department has no active programs. Program selection is optional."
            />
          ) : (
            programs.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => {
                  setFormField('programId', entry.id);
                  setFormField('program', entry.name);
                  programSheetRef.current?.dismiss();
                }}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetRowLabel}>
                  {entry.code ? `${entry.code} — ` : ''}
                  {entry.name}
                </Text>
                {formData.programId === entry.id ? (
                  <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet ref={facultySheetRef} snapPoints={['50%', '90%']}>
        <Text style={styles.sheetTitle}>Select faculty adviser</Text>
        <BottomSheetScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.sheetList}>
          {facultyMembers.length === 0 ? (
            <EmptyState
              title="No faculty available"
              message="Try selecting a different department or contact your administrator."
            />
          ) : (
            facultyMembers.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => {
                  setFormField('facultyId', entry.id);
                  facultySheetRef.current?.dismiss();
                }}
                style={styles.sheetRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowLabel}>{entry.fullName}</Text>
                  {entry.department ? (
                    <Text style={styles.sheetRowMeta}>{entry.department}</Text>
                  ) : null}
                </View>
                {formData.facultyId === entry.id ? (
                  <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Checklist confirmation */}
      <BottomSheet ref={checklistSheetRef} snapPoints={['50%', '75%']}>
        <Text style={styles.sheetTitle}>Submission checklist</Text>
        <Text style={styles.sheetIntro}>Confirm all required items before final submission.</Text>
        <View style={styles.checklist}>
          {checklistItems.map((item) => (
            <View
              key={item.key}
              style={[styles.checklistRow, item.done ? styles.checklistRowDone : styles.checklistRowPending]}
            >
              <Text style={styles.checklistLabel}>{item.label}</Text>
              <Icon
                icon={item.done ? CircleCheck : CircleAlert}
                size={18}
                color={item.done ? theme.colors.state.success : theme.colors.state.warning}
              />
            </View>
          ))}
        </View>
        {!checklistComplete ? (
          <InlineNotice
            tone="warning"
            message="Complete all checklist items before submitting. A faculty adviser is required."
          />
        ) : null}
        <View style={styles.actionRow}>
          <Button
            label="Review form"
            onPress={() => setShowChecklistModal(false)}
            variant="subtle"
          />
          <Button
            label="Confirm & submit"
            onPress={handleConfirmChecklist}
            variant="primary"
            disabled={!checklistComplete || submitting}
            loading={submitting}
          />
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'] + 40,
    gap: theme.spacing.lg,
  },
  headerRow: {
    gap: theme.spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    minHeight: 44,
  },
  backLabel: {
    ...theme.typography.body,
    color: theme.colors.brand.primary,
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text.primary,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
  },
  skeletonStack: {
    gap: theme.spacing.md,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text.primary,
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface.raised,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  textarea: {
    minHeight: 132,
    textAlignVertical: 'top',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface.raised,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  selectFieldLabel: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  selectFieldPlaceholder: {
    color: theme.colors.text.muted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface.raised,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text.primary,
    paddingVertical: 0,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  searchResultEmail: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  coAuthorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.brand.primarySoft,
  },
  coAuthorChipText: {
    ...theme.typography.label,
    color: theme.colors.brand.primary,
    maxWidth: 220,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
  },
  fileSize: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  fileEmpty: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  policyLine: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.xs,
  },
  fileButtonRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  draftStatus: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  revisionTitle: {
    ...theme.typography.label,
    color: theme.colors.state.warning,
    marginBottom: theme.spacing.xs,
  },
  revisionBody: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  sheetTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  sheetIntro: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
  },
  sheetList: {
    flex: 1,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  sheetRowLabel: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  sheetRowMeta: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  checklist: {
    gap: theme.spacing.xs,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  checklistRowDone: {
    borderColor: theme.colors.state.success,
    backgroundColor: theme.colors.state.successSurface,
  },
  checklistRowPending: {
    borderColor: theme.colors.state.warning,
    backgroundColor: theme.colors.state.warningSurface,
  },
  checklistLabel: {
    ...theme.typography.label,
    color: theme.colors.text.primary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  autosave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autosaveDot: {
    width: 7,
    height: 7,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.state.success,
  },
  autosaveText: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 12,
    color: theme.colors.state.success,
  },
  card: {
    backgroundColor: theme.colors.surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    padding: theme.spacing.lg,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardNum: {
    width: 20,
    height: 20,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
    color: theme.colors.brand.primary,
  },
  cardHeadText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.text.secondary,
  },
  cardBody: {
    gap: theme.spacing.md,
  },
  upload: {
    borderWidth: 1.5,
    borderColor: theme.colors.border.strong,
    borderStyle: 'dashed',
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  uploadPressed: {
    opacity: 0.7,
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPrompt: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 14,
    color: theme.colors.brand.primary,
  },
  uploadHint: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 12,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.surface.raised,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.brand.accent,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    paddingVertical: theme.spacing.md,
  },
  submitDisabled: {
    backgroundColor: theme.colors.border.subtle,
  },
  submitPressed: {
    opacity: 0.9,
  },
  submitText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 15,
    color: theme.colors.text.onBrand,
  },
  submitTextDisabled: {
    color: theme.colors.text.muted,
  },
});
