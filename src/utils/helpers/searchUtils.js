export const parseTokens = (input = '') => {
  const regex = /([a-z]+):("[^"]+"|\S+)|"([^"]+)"|(\S+)/g;
  const tokens = [];
  let match;

  while ((match = regex.exec(input))) {
    if (match[1] && match[2]) {
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      tokens.push({ type: match[1], value });
    } else if (match[3]) {
      tokens.push({ type: 'phrase', value: match[3] });
    } else if (match[4]) {
      tokens.push({ type: 'global', value: match[4] });
    }
  }

  return tokens;
};

export const buildSearchString = (chips = [], searchInput = '') => {
  let search = '';

  chips.forEach((chip) => {
    if (chip.type === 'phrase') {
      search += ` "${chip.value}"`;
    } else if (chip.type === 'global') {
      search += ` ${chip.value}`;
    } else if (chip.type && chip.value !== undefined) {
      search += ` ${chip.type}:${chip.value}`;
    }
  });

  if (searchInput && searchInput.trim()) {
    search += ` ${searchInput.trim()}`;
  }

  return search.trim();
};

export const capitalizeFirst = (value = '') => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

