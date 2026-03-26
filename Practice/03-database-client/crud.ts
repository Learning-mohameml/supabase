// read data 
const {data , error} = await supabase
    .from("todos")
    .select('*');

// create data :
// schema already created by migration
// but the real data it comes from user
// so we used the client database to insert it 

const todo = {
    title : 'Buy milk',
    priority : 1,
    userdi : "id-user-0001"
}
const {data , error} = await db
    .from("todos")
    .insert(todo)
    .select(); // select to return the data inserted in the db

// inserted multiple rows 

const userId = "user-00002"

const tags = [
    { name: 'frontend', user_id: userId },
    { name: 'backend', user_id: userId },
    { name: 'devops', user_id: userId },
]

const {data , error} = await db 
    .from("tags")
    .insert(tags)
    .select();

// update sepfic user data 
const todoUpdated = {completed : true};
const todoId = "todo-Id";

const {data , error} = await db 
    .from("todos")
    .update(todoUpdated)
    .eq('id' , todoId)
    .select();

// deleted data : 

// case 01 : reald delete by id 
const {error} = await db 
    .from("todos")
    .delete()
    .eq("id" , todoId);

// case 02 :using soft delete
const {data , error} = await db 
    .from("todos")
    .update({deleted_at : new Date().toISOString()})
    .eq("id" , todoId)
    .select()

// warning : when used soft deleted we should 
// always filter by is("deleted_at" , null) only active todos
// Question : is there a middleware like in mongose that add this filter auto 

const {data}= await db 
    .from("todos")
    .select("*")
    .is("deleted_at", null)
