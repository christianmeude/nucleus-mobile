import { describe, expect, it, jest } from '@jest/globals';
import { act, create } from 'react-test-renderer';
import { FilterSelect } from '../FilterSelect';

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

// BottomSheet hosts native-animated content; stub it as a plain host that
// renders children so the radio rows stay queryable.
jest.mock('../BottomSheet', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    BottomSheet: Object.assign(
      React.forwardRef((_props: { children?: React.ReactNode }, _ref: unknown) => (
        <View testID="filter-sheet">{(_props as { children?: React.ReactNode }).children}</View>
      )),
      { displayName: 'MockBottomSheet' },
    ),
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

const renderSelect = (value: Key, onValueChange: (k: Key) => void = () => {}) => {
  let tree: ReturnType<typeof create> | undefined;
  act(() => {
    tree = create(
      <FilterSelect
        label="Status"
        options={[...OPTIONS]}
        value={value}
        defaultValue="all"
        onValueChange={onValueChange}
      />,
    );
  });
  return tree!;
};

// One radio row renders through several composite layers carrying the same
// props — dedupe by label so each option counts once.
const radios = (tree: ReturnType<typeof create>) => {
  const matches = tree.root.findAll(
    (node) => typeof node.type !== 'string' && node.props?.accessibilityRole === 'radio',
  );
  const byLabel = new Map<string, (typeof matches)[number]>();
  for (const n of matches) {
    const label = n.props.accessibilityLabel as string;
    if (!byLabel.has(label)) byLabel.set(label, n);
  }
  return [...byLabel.values()];
};

describe('FilterSelect', () => {
  it('announces the current selection on the trigger', () => {
    const tree = renderSelect('approved');
    tree.root.findByProps({ accessibilityLabel: 'Status filter, Approved selected' });
  });

  it('renders one radio per option with exactly one selected', () => {
    const rows = radios(renderSelect('published'));
    expect(rows).toHaveLength(OPTIONS.length);
    expect(rows.filter((r) => r.props.accessibilityState?.selected)).toHaveLength(1);
  });

  it('calls onValueChange with the chosen key, and ignores the already-selected row', () => {
    const onValueChange = jest.fn<(k: Key) => void>();
    const tree = renderSelect('all', onValueChange);
    const rows = radios(tree);

    const published = rows.find((r) => r.props.accessibilityLabel === 'Published')!;
    act(() => {
      published.props.onPress?.({} as never);
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('published');

    const all = rows.find((r) => r.props.accessibilityLabel === 'All, selected')!;
    act(() => {
      all.props.onPress?.({} as never);
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});
