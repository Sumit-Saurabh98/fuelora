import { fireEvent, screen } from '@testing-library/react-native';

import { renderScreen } from '@/testing/render-screen';

import { SegmentedControl } from '../segmented-control';

const segments = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

describe('SegmentedControl', () => {
  it('marks exactly the current value as selected', async () => {
    await renderScreen(<SegmentedControl value="dark" segments={segments} onChange={jest.fn()} />);
    const selected = screen
      .getAllByRole('radio')
      .filter((el) => el.props.accessibilityState?.selected);
    expect(selected.map((el) => el.props.accessibilityLabel)).toEqual(['Dark']);
  });

  it('reports the tapped value', async () => {
    const onChange = jest.fn();
    await renderScreen(<SegmentedControl value="system" segments={segments} onChange={onChange} />);
    await fireEvent.press(screen.getByText('Light'));
    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('draws only plain dividers between segments (no per-segment corners)', async () => {
    await renderScreen(<SegmentedControl value="light" segments={segments} onChange={jest.fn()} />);
    const styles = screen
      .getAllByRole('radio')
      .map((el) => Object.assign({}, ...[el.props.style].flat(Infinity).filter(Boolean)));
    expect(styles.map((s) => s.borderLeftWidth ?? 0)).toEqual([0, 1, 1]);
    for (const s of styles) {
      expect(s).not.toHaveProperty('borderRadius');
      expect(s).not.toHaveProperty('borderTopLeftRadius');
    }
  });
});
