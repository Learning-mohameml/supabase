-- step 2 : enable rls in all 4 tables :
alter table categories enable row level security;
alter table todos enable row level security;
alter table tags enable row level security;
alter table todo_tags enable row level security;


-- setp 3 : policies for categories 
create policy "categoris : select own" on 
categories 
    for select 
    to authenticated
    using (user_id = auth.uid());

create policy "categoris : insert own" on 
categories 
    for insert 
    to authenticated
    with check (user_id = auth.uid());

create policy "categoris : update own" on 
categories 
    for update 
    to authenticated 
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "categories : delete own" on 
categories 
    for delete
    to authenticated
    using (user_id = auth.uid());

-- setp 4 : write policies for todos

CREATE POLICY "todos: select own" ON todos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "todos: insert own" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "todos: update own" ON todos
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "todos: delete own" ON todos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- setp 4 : policies for tags 
CREATE POLICY "tags: select own" ON tags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "tags: insert own" ON tags
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags: update own" ON tags
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags: delete own" ON tags
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- setp 6 : write policies for the junction table todo_tags

create policy "todo_tags : select via todo owner" on 
todo_tags 
    for select 
    to authenticated
    using (
        exists (
            select 1 from todos 
            where todos.id = todo_tags.todo_id 
            and auth.uid() = todos.user_id
        )
    );

create policy "todo_tags: insert only if user owns the todo and the tag" on 
todo_tags
    for insert 
    to authenticated
    with check (
        exists (
            select 1 from todos 
            where todos.id = todo_tags.todo_id 
            and todos.user_id = auth.uid()
        ) 
        and 
        exists (
            select 1 from tags 
            where tags.id = todo_tags.tag_id
            and tags.user_id = auth.uid()
        )
    );

create policy "todo_tags: delete only if user owns the todo" on 
todo_tags 
    for delete
    to authenticated
    using (
        exists (
            select 1 from todos 
            where todos.id = todo_tags.todo_id  
            and todos.user_id = auth.uid()
        )
    );

