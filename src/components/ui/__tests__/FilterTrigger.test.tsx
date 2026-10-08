import { describe, expect, it, jest } from '@jest/globals';
import { act, create } from 'react-test-renderer';
import { FilterTrigger } from '../FilterTrigger';

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

const renderTrigger = (props?: Partial<React.ComponentProps<typeof FilterTrigger>>) => {
  let tree: ReturnType<typeof create> | undefined;
  act(() => {
    tree = create(
      <FilterTrigger
        label="Filters"
        active={false}
        onPress={() => {}}
        accessibilityLabel="Open filters"
        {...props}
      />,
    );
  });
  return tree!;
};

// Composite layers can carry the same props — keep the outermost match,
// mirroring the FilterSelect suite's approach.
const triggerNode = (tree: ReturnType<typeof create>, label: string) => {
  const matches = tree.root.findAll(
    (node) => typeof node.type !== 'string' && node.props?.accessibilityLabel === label,
  );
  return matches[0];
};

describe('FilterTrigger', () => {
  it('renders the plain label when no value or badge applies', () => {
    const tree = renderTrigger();
    expect(triggerNode(tree, 'Open filters')).toBeDefined();
  });

  it('renders the status value alone, without a group prefix', () => {
    const tree = renderTrigger({
      label: 'Status',
      valueText: 'In Review',
      active: true,
      accessibilityLabel: 'Status filter, In Review selected',
    });
    expect(triggerNode(tree, 'Status filter, In Review selected')).toBeDefined();
    const strings = tree.root.findAll(
      (node) => typeof node.props?.children === 'string',
    ).map((n) => n.props.children as string);
    expect(strings).toContain('In Review');
    expect(strings.some((s) => s.includes('Status'))).toBe(false);
  });

  it('renders the count badge only when the count is positive', () => {
    const withBadge = renderTrigger({
      active: true,
      badgeCount: 2,
      accessibilityLabel: 'Filters, 2 active',
    });
    withBadge.root.findByProps({ children: 2 });

    const withoutBadge = renderTrigger({ badgeCount: 0 });
    expect(() =>
      withoutBadge.root.findByProps({ children: 0 }),
    ).toThrow();
  });

  it('fires onPress from the trigger', () => {
    const onPress = jest.fn<() => void>();
    const tree = renderTrigger({ onPress });
    act(() => {
      triggerNode(tree, 'Open filters')!.props.onPress?.({} as never);
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
