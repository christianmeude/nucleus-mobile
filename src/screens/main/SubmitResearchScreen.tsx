import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  DepartmentRow,
  FacultyMember,
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
  Button,
  Card,
  Chip,
  EmptyState,
  InlineNotice,
  Skeleton,
} from '../../components/ui';
import { RootStackParamList } from '../../navigation/types';

type SubmitNav = NativeStackNavigationProp<RootStackParamList, 'SubmitResearch'>;
type SubmitRoute = RouteProp<RootStackParamList, 'SubmitResearch'>;

type PickerKind = 'category' | 'department' | 'faculty';

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
};

const draftStorageKey = (resubmitPaperId?: string) =>
  `${DRAFT_KEY_PREFIX}${resubmitPaperId || 'new'}`;

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

export const SubmitResearchScreen = () => {
  const navigation = useNavigation<SubmitNav>();
  const route = useRoute<SubmitRoute>();
  const resubmitPaperId = route.params?.resubmitPaperId;
  const isResubmit = Boolean(resubmitPaperId);

  const [formData, setFormData] = useState<SubmitDraftFormState>(EMPTY_FORM);
  const [selectedCoAuthors, setSelectedCoAuthors] = useState<StudentSearchResult[]>([]);
  const [file, setFile] = useState<SubmitFileInput | null>(null);

  const [resubmitPaper, setResubmitPaper] = useState<ResearchPaper | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);
  const [facultyAvailable, setFacultyAvailable] = useState(true);
  const [policy, setPolicy] = useState<SubmissionPolicy>({
    maxFileSizeMb: 10,
    allowedFileTypes: ['pdf'],
  });

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearchAvailable, setStudentSearchAvailable] = useState(true);

  const [pickerOpen, setPickerOpen] = useState<PickerKind | null>(null);
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
  useEffect(() => {
    let cancelled = false;
    const loadFaculty = async () => {
      const list = await submitApi.getFacultyMembers({
        department: formData.department || undefined,
        departmentId: formData.departmentId || undefined,
      });
      if (cancelled) return;
      setFacultyMembers(list);
      setFacultyAvailable(list.length > 0);
    };
    loadFaculty();
    return () => {
      cancelled = true;
    };
  }, [formData.department, formData.departmentId]);

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
      // If repeated 2+ char searches keep returning empty, surface a notice rather than
      // silently failing. Heuristic only — backend may simply have no matches.
      if (results.length === 0 && trimmed.length >= 3) {
        // Keep `studentSearchAvailable` true unless we can detect an RLS issue. In RN
        // we can't distinguish "no matches" from "RLS-blocked"; the empty-state copy
        // covers both cases.
        setStudentSearchAvailable(true);
      } else {
        setStudentSearchAvailable(true);
      }
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
    setShowChecklistModal(true);
  };

  const handleConfirmChecklist = async () => {
    if (!checklistComplete) return;
    setShowChecklistModal(false);
    await performSubmit();
  };

  // The file picker dependency (e.g. expo-document-picker) is not yet installed in this build.
  // Per builder prompt §2, we flag rather than fake. New submissions are gated on this dep.
  const filePickerAvailable = false;
  const handleChooseFile = () => {
    // Intentionally no-op until expo-document-picker is approved and wired.
  };

  const submitDisabled =
    bootstrapping ||
    submitting ||
    submitSuccess ||
    !checklistComplete ||
    (!isResubmit && !filePickerAvailable);

  // ─── Render ───
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : null)}
            accessibilityLabel="Back"
            accessibilityRole="button"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.brand.primary} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Text style={styles.title}>
            {isResubmit ? 'Resubmit Research' : 'Submit Research'}
          </Text>
          <Text style={styles.subtitle}>
            {isResubmit
              ? 'Update and improve your research submission.'
              : 'Share your work with the university community.'}
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
            {!filePickerAvailable && !isResubmit ? (
              <InlineNotice
                tone="warning"
                message={
                  'Submission is currently disabled in this build. The file picker dependency (expo-document-picker) is not installed. Contact your administrator to enable submissions.'
                }
              />
            ) : null}

            {isResubmit && resubmitPaper?.revision_notes ? (
              <Card padding="md">
                <Text style={styles.revisionTitle}>Reviewer revision notes</Text>
                <Text style={styles.revisionBody}>{resubmitPaper.revision_notes}</Text>
              </Card>
            ) : null}

            {/* File section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Research file{!isResubmit ? ' *' : ''}
              </Text>
              {file ? (
                <Card padding="md">
                  <View style={styles.fileRow}>
                    <Ionicons
                      name="document-text-outline"
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
                      <Ionicons name="close" size={20} color={theme.colors.text.muted} />
                    </Pressable>
                  </View>
                </Card>
              ) : (
                <Card padding="md">
                  <Text style={styles.fileEmpty}>
                    {isResubmit && resubmitPaper?.file_url
                      ? 'Keeping current file unless replaced.'
                      : 'No file attached.'}
                  </Text>
                  <Text style={styles.policyLine}>{policyLine}</Text>
                  <View style={styles.fileButtonRow}>
                    <Button
                      label={
                        filePickerAvailable
                          ? 'Choose file'
                          : 'File picker unavailable'
                      }
                      onPress={handleChooseFile}
                      variant="secondary"
                      disabled={!filePickerAvailable}
                    />
                  </View>
                </Card>
              )}
            </View>

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

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.label}>Research category *</Text>
              <Pressable
                onPress={() => setPickerOpen('category')}
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
                <Ionicons name="chevron-down" size={18} color={theme.colors.text.muted} />
              </Pressable>
            </View>

            {/* Department */}
            <View style={styles.section}>
              <Text style={styles.label}>Department</Text>
              <Pressable
                onPress={() => setPickerOpen('department')}
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
                <Ionicons name="chevron-down" size={18} color={theme.colors.text.muted} />
              </Pressable>
              <Text style={styles.helperText}>
                Helps route your submission to the right reviewer.
              </Text>
            </View>

            {/* Faculty adviser (required by stricter checklist rule) */}
            <View style={styles.section}>
              <Text style={styles.label}>Faculty adviser *</Text>
              <Pressable
                onPress={() => (facultyAvailable ? setPickerOpen('faculty') : undefined)}
                accessibilityRole="button"
                accessibilityLabel="Select faculty adviser"
                style={[styles.selectField, !facultyAvailable && styles.selectFieldDisabled]}
                disabled={submitting || !facultyAvailable}
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
                <Ionicons name="chevron-down" size={18} color={theme.colors.text.muted} />
              </Pressable>
              {!facultyAvailable ? (
                <InlineNotice
                  tone="warning"
                  message="Faculty list unavailable — contact administrator."
                />
              ) : (
                <Text style={styles.helperText}>
                  Required: your adviser is the first reviewer of your submission.
                </Text>
              )}
            </View>

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
                      <Ionicons name="close" size={14} color={theme.colors.brand.primary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={theme.colors.text.muted} />
                <TextInput
                  value={studentSearchQuery}
                  onChangeText={setStudentSearchQuery}
                  placeholder="Search students by name or email"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={styles.searchInput}
                  accessibilityLabel="Search co-authors"
                  editable={!submitting && studentSearchAvailable}
                />
                {studentSearchLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                ) : null}
              </View>

              {!studentSearchAvailable ? (
                <InlineNotice
                  tone="warning"
                  message="Student search unavailable — contact administrator."
                />
              ) : null}

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
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={theme.colors.state.success}
                          />
                        ) : (
                          <Ionicons name="add" size={18} color={theme.colors.brand.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </Card>
              ) : null}
            </View>

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

            {draftSyncMessage ? (
              <Text style={styles.draftStatus}>{draftSyncMessage}</Text>
            ) : null}

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

            <View style={styles.actionRow}>
              <Button
                label="Cancel"
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : null)}
                variant="subtle"
              />
              <Button
                label={isResubmit ? 'Update Research' : 'Submit for Review'}
                onPress={handleSubmitPress}
                variant="primary"
                disabled={submitDisabled}
                loading={submitting}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Pickers */}
      <BottomSheet visible={pickerOpen === 'category'} onClose={() => setPickerOpen(null)}>
        <Text style={styles.sheetTitle}>Select category</Text>
        <ScrollView style={styles.sheetList}>
          {categories.length === 0 ? (
            <EmptyState title="No categories available" />
          ) : (
            categories.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => {
                  setFormField('category', entry.id);
                  setPickerOpen(null);
                }}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetRowLabel}>{entry.name}</Text>
                {formData.category === entry.id ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={pickerOpen === 'department'} onClose={() => setPickerOpen(null)}>
        <Text style={styles.sheetTitle}>Select department</Text>
        <ScrollView style={styles.sheetList}>
          <Pressable
            onPress={() => {
              setFormField('department', '');
              setFormField('departmentId', '');
              setPickerOpen(null);
            }}
            style={styles.sheetRow}
          >
            <Text style={styles.sheetRowLabel}>None</Text>
            {!formData.departmentId ? (
              <Ionicons name="checkmark" size={18} color={theme.colors.brand.primary} />
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
                  setPickerOpen(null);
                }}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetRowLabel}>
                  {entry.code ? `${entry.code} — ` : ''}
                  {entry.name}
                </Text>
                {formData.departmentId === entry.id ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={pickerOpen === 'faculty'} onClose={() => setPickerOpen(null)}>
        <Text style={styles.sheetTitle}>Select faculty adviser</Text>
        <ScrollView style={styles.sheetList}>
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
                  setPickerOpen(null);
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
                  <Ionicons name="checkmark" size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      {/* Checklist confirmation */}
      <BottomSheet visible={showChecklistModal} onClose={() => setShowChecklistModal(false)}>
        <Text style={styles.sheetTitle}>Submission checklist</Text>
        <Text style={styles.sheetIntro}>Confirm all required items before final submission.</Text>
        <View style={styles.checklist}>
          {checklistItems.map((item) => (
            <View
              key={item.key}
              style={[styles.checklistRow, item.done ? styles.checklistRowDone : styles.checklistRowPending]}
            >
              <Text style={styles.checklistLabel}>{item.label}</Text>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'alert-circle'}
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
    gap: theme.spacing.lg,
  },
  headerRow: {
    gap: theme.spacing.xs,
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
    ...theme.typography.h1,
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
    borderColor: theme.colors.border.strong,
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
    borderColor: theme.colors.border.strong,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface.raised,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  selectFieldDisabled: {
    opacity: 0.6,
  },
  selectFieldLabel: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  selectFieldPlaceholder: {
    color: theme.colors.text.muted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.strong,
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
    maxHeight: 320,
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
});
