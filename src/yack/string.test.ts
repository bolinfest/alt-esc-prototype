import {tryConsumeStringLiteral} from './string';

test('tryConsumeStringLiteral', () => {
  expect(tryConsumeStringLiteral('abc')).toBe(null);
  expect(tryConsumeStringLiteral('"abc"')).toEqual({value: 'abc', length: 5});
  // Should ignore other tokens after literal.
  expect(tryConsumeStringLiteral('"abc" )')).toEqual({value: 'abc', length: 5});

  // Verify escaping characters works as expected.
  expect(tryConsumeStringLiteral('"foo\\nbar"')).toEqual({
    value: 'foo\nbar',
    length: 10,
  });
  expect(tryConsumeStringLiteral('"foo\\"bar"')).toEqual({
    value: 'foo"bar',
    length: 10,
  });
  expect(tryConsumeStringLiteral('"foo\\\\bar"')).toEqual({
    value: 'foo\\bar',
    length: 10,
  });
});
