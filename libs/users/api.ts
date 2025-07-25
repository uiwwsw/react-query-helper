export const getUser = async (id: string) => {
  return { id, name: `User ${id}` };
};

export const createUser = (name: string) => {
  return { id: Date.now().toString(), name };
};

export function deleteUser(id: string) {
  return { success: true, id };
}
