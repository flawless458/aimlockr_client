export const createMemoryIo = (initialFiles = {}) => {
  const files = new Map(Object.entries(initialFiles));
  const directories = [];
  return {
    files,
    directories,
    readFile: (path) => {
      if (!files.has(path)) throw new Error(`ENOENT: ${path}`);
      return files.get(path);
    },
    writeFile: (path, text) => {
      files.set(path, text);
    },
    makeDirectory: (path) => {
      directories.push(path);
    }
  };
};

export const createFailingIo = (message = 'disk is on fire') => ({
  readFile: () => {
    throw new Error(message);
  },
  writeFile: () => {
    throw new Error(message);
  },
  makeDirectory: () => {
    throw new Error(message);
  }
});
