function check(msg) {
  const str = JSON.stringify({ success: false, error: msg });
  console.log(str.length, str);
}

check('Failed to create video project: new row for relation "video_projects" violates check constraint "video_projects_status_check"');
check('Failed to create video project: insert or update on table "video_projects" violates foreign key constraint "video_projects_created_by_fkey"');
check('Failed to parse request JSON body');
// What about "workspace_id"? Oh wait, there is no workspace_id.
// What if it is related to foreign key on `assigned_editor_id`?
check('Failed to create video project: insert or update on table "video_projects" violates foreign key constraint "video_projects_assigned_editor_id_fkey"');
check('Server configuration error');

// What if the error is from the resolveUserId? (Wait, that wouldn't have "Failed to create video project:")
