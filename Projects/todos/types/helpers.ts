import type { Database } from "./database.types";

// Row types (what you get back from a SELECT)
export type Todo = Database["public"]["Tables"]["todos"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type TodoTag = Database["public"]["Tables"]["todo_tags"]["Row"];

// Insert types (what you send to INSERT)
export type TodoInsert = Database["public"]["Tables"]["todos"]["Insert"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];

// Update types (what you send to UPDATE)
export type TodoUpdate = Database["public"]["Tables"]["todos"]["Update"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];
export type TagUpdate = Database["public"]["Tables"]["tags"]["Update"];

// Composite type: todo with its category and tags (from nested query)
export type TodoWithRelations = Todo & {
  categories: Category | null;
  todo_tags: (TodoTag & { tags: Tag })[];
};
