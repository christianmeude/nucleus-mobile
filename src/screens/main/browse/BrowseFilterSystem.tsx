import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Keyboard, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, SlidersHorizontal } from 'lucide-react-native';

import { BottomSheet, Button, Icon, Input, PressableScale } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { type Theme } from '../../../theme';
import { Category } from '../../../types/domain';
import { DepartmentRow, ProgramRow } from '../../../api/research';
import { BrowseFilterState, getActiveFilterCount, INITIAL_FILTER_STATE } from './types';

interface BrowseFilterSystemProps {
  filters: BrowseFilterState;
  onChange: (filters: BrowseFilterState) => void;
  categories: Category[];
  departments: DepartmentRow[];
  programs: ProgramRow[];
}

export const BrowseFilterSystem = ({
  filters,
  onChange,
  categories,
  departments,
  programs,
}: BrowseFilterSystemProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  type FilterTab = 'fields' | 'departments' | 'year';
  const [activeTab, setActiveTab] = useState<FilterTab>('fields');
  
  const handleToggleCategory = (id: string) => {
    const next = new Set(filters.categories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...filters, categories: Array.from(next) });
  };

  const handleToggleDept = (name: string) => {
    const next = new Set(filters.departments);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange({ ...filters, departments: Array.from(next) });
  };

  const handleToggleProgram = (id: string) => {
    const next = new Set(filters.programs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...filters, programs: Array.from(next) });
  };

  const [tempYearFrom, setTempYearFrom] = useState(filters.yearFrom);
  const [tempYearTo, setTempYearTo] = useState(filters.yearTo);
  const [yearError, setYearError] = useState('');

  useEffect(() => {
    setTempYearFrom(filters.yearFrom);
    setTempYearTo(filters.yearTo);
  }, [filters.yearFrom, filters.yearTo]);

  const applyYear = useCallback(() => {
    const fStr = tempYearFrom.trim();
    const tStr = tempYearTo.trim();
    const f = parseInt(fStr, 10);
    const t = parseInt(tStr, 10);
    
    if (fStr && tStr && !isNaN(f) && !isNaN(t) && f > t) {
      setYearError('"From" year cannot be greater than "To" year.');
      return;
    }
    setYearError('');
    onChange({ ...filters, yearFrom: fStr, yearTo: tStr });
    Keyboard.dismiss();
  }, [tempYearFrom, tempYearTo, filters, onChange]);

  const activeCount = getActiveFilterCount(filters);

  return (
    <>
      <PressableScale
        style={[styles.triggerBtn, activeCount > 0 && styles.triggerBtnActive]}
        onPress={() => sheetRef.current?.present()}
        accessibilityRole="button"
        accessibilityLabel="Open filters"
      >
        <Icon 
          icon={SlidersHorizontal} 
          size={16} 
          color={activeCount > 0 ? theme.colors.brand.primary : theme.colors.text.secondary} 
        />
        <Text style={[styles.triggerText, activeCount > 0 && styles.triggerTextActive]}>
          Filters {activeCount > 0 ? `(${activeCount})` : ''}
        </Text>
      </PressableScale>

      <BottomSheet ref={sheetRef} snapPoints={['80%', '95%']}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filters</Text>
          {activeCount > 0 && (
            <Button 
              label="Clear All" 
              variant="subtle" 
              size="sm" 
              onPress={() => {
                onChange(INITIAL_FILTER_STATE);
                setTempYearFrom('');
                setTempYearTo('');
                setYearError('');
              }} 
            />
          )}
        </View>

        <View style={styles.tabsContainer}>
          <Pressable 
            style={[styles.tabBtn, activeTab === 'fields' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('fields')}
          >
            <Text style={[styles.tabText, activeTab === 'fields' && styles.tabTextActive]}>FIELDS</Text>
          </Pressable>

          <Pressable 
            style={[styles.tabBtn, activeTab === 'departments' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('departments')}
          >
            <Text style={[styles.tabText, activeTab === 'departments' && styles.tabTextActive]}>DEPARTMENTS</Text>
          </Pressable>

          <Pressable 
            style={[styles.tabBtn, activeTab === 'year' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('year')}
          >
            <Text style={[styles.tabText, activeTab === 'year' && styles.tabTextActive]}>YEAR RANGE</Text>
          </Pressable>
        </View>

        <BottomSheetScrollView 
          style={styles.sheetScroll} 
          contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* CATEGORIES / FIELDS */}
          {activeTab === 'fields' && (
            <View style={styles.section}>
              {categories.map((cat) => {
                const active = filters.categories.includes(cat.id);
                return (
                  <PressableScale key={cat.id} style={styles.row} onPress={() => handleToggleCategory(cat.id)}>
                    <View style={[styles.checkbox, active && styles.checkboxActive]}>
                      {active && <Icon icon={Check} size={14} color={theme.colors.surface.base} />}
                    </View>
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{cat.name}</Text>
                  </PressableScale>
                );
              })}
            </View>
          )}

          {/* DEPARTMENTS & PROGRAMS */}
          {activeTab === 'departments' && (
            <View style={styles.section}>
              {departments.map((dept) => {
                const activeDept = filters.departments.includes(dept.name);
                const deptPrograms = programs.filter((p) => p.department_id === dept.id);
                return (
                  <View key={dept.id}>
                    <PressableScale style={styles.row} onPress={() => handleToggleDept(dept.name)}>
                      <View style={[styles.checkbox, activeDept && styles.checkboxActive]}>
                        {activeDept && <Icon icon={Check} size={14} color={theme.colors.surface.base} />}
                      </View>
                      <Text style={[styles.rowText, activeDept && styles.rowTextActive, { fontFamily: theme.fontFamilies.ui.semibold }]}>
                        {dept.name}
                      </Text>
                    </PressableScale>

                    {/* Nested Programs */}
                    {deptPrograms.map((prog) => {
                      const activeProg = filters.programs.includes(prog.id);
                      return (
                        <PressableScale key={prog.id} style={styles.nestedRow} onPress={() => handleToggleProgram(prog.id)}>
                          <View style={[styles.checkbox, activeProg && styles.checkboxActive]}>
                            {activeProg && <Icon icon={Check} size={14} color={theme.colors.surface.base} />}
                          </View>
                          <Text style={[styles.rowText, activeProg && styles.rowTextActive]}>
                            {prog.code ? `${prog.code} - ` : ''}{prog.name}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}

          {/* YEAR FILTER */}
          {activeTab === 'year' && (
            <View style={[styles.section, { marginBottom: 64, borderBottomWidth: 0 }]}>
              <Text style={styles.sectionTitle}>Publication Year</Text>
              {!!yearError && (
                <Text style={{ color: theme.colors.state.danger, marginBottom: 12, ...theme.typography.caption }}>
                  {yearError}
                </Text>
              )}
              <View style={styles.yearInputsRow}>
                <Input
                  containerStyle={styles.yearInput}
                  placeholder="From (e.g. 2020)"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={tempYearFrom}
                  onChangeText={setTempYearFrom}
                  onBlur={applyYear}
                />
                <Input
                  containerStyle={styles.yearInput}
                  placeholder="To (e.g. 2022)"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={tempYearTo}
                  onChangeText={setTempYearTo}
                  onBlur={applyYear}
                />
              </View>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    triggerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      height: 40,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.base,
    },
    triggerBtnActive: {
      backgroundColor: theme.colors.brand.primarySoft,
      borderColor: theme.colors.brand.primary,
    },
    triggerText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    triggerTextActive: {
      color: theme.colors.brand.primary,
      fontFamily: theme.fontFamilies.ui.semibold,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xs, // Reduced padding to pull tabs closer to the title
    },
    sheetTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    tabsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle,
      marginTop: theme.spacing.sm,
    },
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabBtnActive: {
      borderBottomColor: theme.colors.brand.primary,
    },
    tabText: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 12,
      letterSpacing: 0.5,
      color: theme.colors.text.muted,
    },
    tabTextActive: {
      color: theme.colors.brand.primary,
    },
    sheetScroll: {
      flex: 1,
    },
    section: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle,
    },
    sectionTitle: {
      fontFamily: theme.fontFamilies.ui.bold,
      fontSize: 16,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    nestedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      paddingLeft: 32, // indentation
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderCurve: 'continuous',
      borderWidth: 2,
      borderColor: theme.colors.border.strong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: {
      backgroundColor: theme.colors.brand.primary,
      borderColor: theme.colors.brand.primary,
    },
    rowText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 15,
      color: theme.colors.text.primary,
      flex: 1,
    },
    rowTextActive: {
      color: theme.colors.brand.primary,
    },
    yearInputsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    yearInput: {
      flex: 1,
    },
  });
