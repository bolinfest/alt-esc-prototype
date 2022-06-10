export default {
  comments: {
    lineComment: '#',
    blockComment: ['"""', '"""'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    {
      open: '{',
      close: '}',
    },
    {
      open: '[',
      close: ']',
    },
    {
      open: '(',
      close: ')',
    },
    {
      open: '"',
      close: '"',
      notIn: ['string'],
    },
    {
      open: 'r"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: 'R"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: 'u"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: 'U"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: 'f"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: 'F"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: 'b"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: 'B"',
      close: '"',
      notIn: ['string', 'comment'],
    },
    {
      open: "'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "r'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "R'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "u'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "U'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "f'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "F'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "b'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: "B'",
      close: "'",
      notIn: ['string', 'comment'],
    },
    {
      open: '`',
      close: '`',
      notIn: ['string'],
    },
  ],
  surroundingPairs: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['"', '"'],
    ["'", "'"],
    ['`', '`'],
  ],
  folding: {
    offSide: true,
    markers: {
      start: '^\\s*#\\s*region\\b',
      end: '^\\s*#\\s*endregion\\b',
    },
  },
};
