-- select * from todos;

-- update todos set title = 'todo 1 updated'
-- where id = 'c825cb3e-afee-43da-9ed2-dcd83600a3e8';


SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'todos'
ORDER BY cmd;
