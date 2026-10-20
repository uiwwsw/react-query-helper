export const getUser = async (id: string) => ({ id, name: 'Ada' });
export const createUser = async (name: string) => ({ id: 'new-user', name });
export const listPosts = async (cursor: number = 0) => ({ posts: [{ id: cursor, title: 'Hello' }], nextCursor: cursor + 1 });
