import { describe, expect, it, jest } from '@jest/globals';
import { act, create } from 'react-test-renderer';
import { FilterPills } from '../FilterPills';
import { Chip } from '../Chip';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn<() => Promise<void>>(async () => undefined),
}));

jest.mock('../../../context/ThemeContext', () => {
  const { themes } = jest.requireActual('../../../theme') as typeof import('../../../theme');
  return {
    useTheme: () => ({
      theme: themes.light,
      scheme: 'light',
      preference: 'light',
      setPreference: () => {},
    }),
    useThemedStyles: (factory: (t: unknown) => unknown) => factory(themes.light),
  };
});

const OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'In Review' },
  { key: 'action', label: 'Needs Revision' },
  { key: 'approved', label: 'Approved' },
  { key: 'published', label: 'Published' },
] as const;

type Key = (typeof OPTIONS)[number]['key'];

const renderPills = (value: Key, onValueChange: (k: Key) => void = () => {}) => {
  let tree: ReturnType<typeof create> | undefined;
  act(() => {
    tree = create(
      <FilterPills options={[...OPTIONS]} value={value} onValueChange={onValueChange} />,
    );
  });
  return tree!;
};

describe('FilterPills', () => {
  it('renders one filter-variant chip per option with exactly one active', () => {
    const tree = renderPills('active');
    const chips = tree.root.findAllByType(Chip);
    expect(chips).toHaveLength(OPTIONS.length);
    for (const chip of chips) {
      expect(chip.props.variant).toBe('filter');
    }
    expect(chips.filter((c) => c.props.active).map((c) => c.props.label)).toEqual([
      'In Review',
    ]);
  });

  it('calls onValueChange with the pressed key, and ignores presses on the active pill', () => {
    const onValueChange = jest.fn<(k: Key) => void>();
    const tree = renderPills('all', onValueChange);
    const chips = tree.root.findAllByType(Chip);

    const published = chips.find((c) => c.props.label === 'Published')!;
    act(() => {
      published.props.onPress?.();
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('published');

    const all = chips.find((c) => c.props.label === 'All')!;
    act(() => {
      all.props.onPress?.();
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('lays out in a wrapping flow so every option stays visible without scrolling', () => {
    const tree = renderPills('all');
    const row = tree.root.findByProps({ accessibilityRole: 'tablist' });
    expect(row.props.style).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
  });
});
