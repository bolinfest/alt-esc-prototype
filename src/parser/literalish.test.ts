import {renderLiteralishValue, tryParseLiteralishValue} from './literalish';

test('tryParseLiteralishValue with good simple values', () => {
  expect(tryParseLiteralishValue('"foo"')).toEqual({
    type: 'string',
    value: 'foo',
  });
  expect(tryParseLiteralishValue('"foo bar"')).toEqual({
    type: 'string',
    value: 'foo bar',
  });
  expect(tryParseLiteralishValue('null')).toEqual({
    type: 'null',
  });
  expect(tryParseLiteralishValue('true')).toEqual({
    type: 'boolean',
    value: true,
  });
  expect(tryParseLiteralishValue('false')).toEqual({
    type: 'boolean',
    value: false,
  });
  expect(tryParseLiteralishValue('42')).toEqual({
    type: 'number',
    value: 42,
  });
  expect(tryParseLiteralishValue('-42')).toEqual({
    type: 'number',
    value: -42,
  });
  expect(tryParseLiteralishValue('3.14')).toEqual({
    type: 'number',
    value: 3.14,
  });
  expect(tryParseLiteralishValue('-3.14')).toEqual({
    type: 'number',
    value: -3.14,
  });
  expect(tryParseLiteralishValue('1e2')).toEqual({
    type: 'number',
    value: 100,
  });
  expect(tryParseLiteralishValue('-1e2')).toEqual({
    type: 'number',
    value: -100,
  });
  expect(tryParseLiteralishValue('0')).toEqual({
    type: 'number',
    value: 0,
  });
  expect(tryParseLiteralishValue('-0')).toEqual({
    type: 'number',
    // Hmm, 0 does not actually work here...
    value: -0,
  });
});

test('tryParseLiteralishValue with bad values', () => {
  expect(tryParseLiteralishValue('foo')).toBe(null);
  expect(tryParseLiteralishValue('foo()')).toBe(null);
  expect(tryParseLiteralishValue('foo.bar')).toBe(null);
  expect(tryParseLiteralishValue("'foo'")).toBe(null);
  expect(tryParseLiteralishValue('[]')).toBe(null);
  expect(tryParseLiteralishValue('{}')).toBe(null);
});

test('renderLiteralishValue', () => {
  expect(renderLiteralishValue({type: 'translation', value: 'foo bar'})).toBe(
    '$T("foo bar")',
  );
});
