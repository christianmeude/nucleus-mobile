import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { ResearchPaper } from '../../../types/domain';
import { ResearchTile } from '../../../components/ResearchTile';
import { useThemedStyles } from '../../../context/ThemeContext';
import { type Theme } from '../../../theme';

export interface BrowseGridCellProps {
  paper: ResearchPaper;
  category: string | null;
  categoryColor: string;
  onOpen: (paperId: string) => void;
}

export const BrowseGridCell = memo(function BrowseGridCell({
  paper,
  category,
  categoryColor,
  onOpen,
}: BrowseGridCellProps) {
  const styles = useThemedStyles(makeStyles);
  const handlePress = useCallback(() => onOpen(paper.id), [onOpen, paper.id]);

  return (
    <View style={styles.gridCell}>
      <ResearchTile
        paper={paper}
        category={category}
        categoryColor={categoryColor}
        onPress={handlePress}
      />
    </View>
  );
});

export const makeStyles = (_theme: Theme) =>
  StyleSheet.create({
    gridCell: {
      flex: 1,
    },
  });
